import mongoose from "mongoose";
import Review from "../models/MarketingReview.js";
import Collection from "../models/MarketingCollection.js";
import Order from "../models/LogisticOrder.js";
import { User } from "../models/AdminUser.js";
import { calculateTier } from "./AdminAuthController.js";

// Helper function to update product average rating in Collection model
const updateProductAverageRating = async (productId) => {
  try {
    const reviews = await Review.find({ productId, status: "Published" });
    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Number((totalRating / reviews.length).toFixed(1));

    await Collection.findByIdAndUpdate(productId, {
      rating: avgRating,
    });
  } catch (error) {
    console.error("Error updating average product rating:", error);
  }
};

const getBadgeForTier = (tier) => {
  const t = (tier || "Bronze").toLowerCase();
  if (t === "platinum") return "Platinum VIP";
  if (t === "gold") return "Gold VIP";
  if (t === "silver") return "Silver Loyal";
  return "Bronze Member";
};

// 1. Create a Review (Customer Side)
export const createReview = async (req, res) => {
  try {
    const { productId, orderId, userId, userName, rating, comment, images, isAnonymous } = req.body;

    if (!productId || !userId || !rating || !comment) {
      return res.status(400).json({ message: "Missing required fields for review." });
    }

    // Lookup user to get real tier & username for badge
    let userTier = "Bronze";
    let userBadge = "Bronze Member";
    let userUsername = "";

    try {
      let user = null;
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId).lean().catch(() => null);
      }
      if (!user) {
        user = await User.findOne({ $or: [{ username: userId }, { email: userId }] }).lean().catch(() => null);
      }
      if (user) {
        userTier = user.tier || calculateTier(user.totalSpent || 0);
        userBadge = getBadgeForTier(userTier);
        userUsername = user.username || "";
      }
    } catch (e) {}

    const newReview = new Review({
      productId,
      orderId: orderId || null,
      userId,
      userName: isAnonymous ? "Anonymous" : (userName || "Verified Customer"),
      userUsername,
      userTier,
      userBadge,
      rating: Number(rating),
      comment,
      images: Array.isArray(images) ? images : [],
      isAnonymous: Boolean(isAnonymous),
      status: "Published",
    });

    await newReview.save();

    // Recalculate and update Product rating in Collection
    await updateProductAverageRating(productId);

    // Mark order as reviewed in database
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      await Order.findByIdAndUpdate(orderId, { isReviewed: true }).catch(() => {});
    }

    res.status(201).json({
      message: "Review submitted successfully!",
      review: newReview,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 2. Get Reviews for a specific Product (OurCollection.jsx)
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId, status: "Published" })
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(5000);

    if (!reviews || reviews.length === 0) {
      return res.status(200).json([]);
    }

    // Attach real-time customer badges
    const userIds = [...new Set(reviews.map((r) => r.userId).filter(Boolean))];
    let userMap = new Map();
    if (userIds.length > 0) {
      const validObjIds = userIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      const foundUsers = await User.find({
        $or: [
          { _id: { $in: validObjIds } },
          { username: { $in: userIds } },
          { email: { $in: userIds } },
        ],
      })
        .select("username fullName tier totalSpent profileImage")
        .lean()
        .catch(() => []);

      foundUsers.forEach((u) => {
        if (u._id) userMap.set(String(u._id), u);
        if (u.username) userMap.set(u.username, u);
        if (u.email) userMap.set(u.email, u);
      });
    }

    const enrichedReviews = reviews.map((r) => {
      const matched = userMap.get(String(r.userId));
      const tier = matched?.tier || r.userTier || "Bronze";
      const badge = getBadgeForTier(tier);
      const uname = matched?.username || r.userUsername || "";

      return {
        ...r,
        userTier: tier,
        userBadge: badge,
        userUsername: uname,
      };
    });

    return res.status(200).json(enrichedReviews);
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return res.status(200).json([]);
  }
};

// 3. Get All Reviews (Admin Dashboard)
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("productId", "itemDescription code image")
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(5000);

    return res.status(200).json(reviews || []);
  } catch (error) {
    console.error("Error fetching all reviews:", error);
    return res.status(200).json([]);
  }
};

// 4. Update Review Status or Admin Reply (Admin Action)
export const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (adminReply !== undefined) updateData.adminReply = adminReply;

    const updatedReview = await Review.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Recalculate average rating if status changed
    if (updatedReview.productId) {
      await updateProductAverageRating(updatedReview.productId);
    }

    res.status(200).json({
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 5. Delete Review (Admin Action)
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);

    if (review && review.productId) {
      await updateProductAverageRating(review.productId);
    }

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 6. Toggle Like reaction on Review
export const toggleLikeReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'like' or 'unlike'
    const delta = action === 'unlike' ? -1 : 1;

    const review = await Review.findByIdAndUpdate(
      id,
      { $inc: { likes: delta } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.likes < 0) {
      review.likes = 0;
      await review.save();
    }

    res.status(200).json({ success: true, likes: review.likes });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 7. Report Review
export const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, details, reportedBy } = req.body;

    console.log(`[Review Report] Review ${id} reported for: "${reason}". Details: "${details || 'N/A'}" by: "${reportedBy || 'Guest'}"`);

    res.status(200).json({
      success: true,
      message: "Report received. Our moderation team will review this content."
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


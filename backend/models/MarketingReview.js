import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      default: "Verified Customer",
    },
    userUsername: {
      type: String,
      default: "",
    },
    userTier: {
      type: String,
      default: "Bronze",
    },
    userBadge: {
      type: String,
      default: "Bronze Member",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    verifiedPurchase: {
      type: Boolean,
      default: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Published", "Hidden"],
      default: "Published",
    },
    adminReply: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// High-performance database query indexes
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1 });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default Review;

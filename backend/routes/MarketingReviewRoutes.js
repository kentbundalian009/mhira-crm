import express from "express";
import {
  createReview,
  getProductReviews,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  toggleLikeReview,
  reportReview,
  getUnreadReviewsCount,
  markReviewAsRead,
  markAllReviewsAsRead,
} from "../controllers/MarketingReviewController.js";

const router = express.Router();

router.get("/unread-count", getUnreadReviewsCount);
router.patch("/mark-all-read", markAllReviewsAsRead);
router.patch("/:id/read", markReviewAsRead);

router.get("/", getAllReviews);
router.post("/", createReview);
router.get("/product/:productId", getProductReviews);
router.put("/:id/status", updateReviewStatus);
router.put("/:id/reply", updateReviewStatus);
router.put("/:id", updateReviewStatus);
router.patch("/:id", updateReviewStatus);
router.post("/:id/like", toggleLikeReview);
router.post("/:id/report", reportReview);
router.delete("/:id", deleteReview);

export default router;

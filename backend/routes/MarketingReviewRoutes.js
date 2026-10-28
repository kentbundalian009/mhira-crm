import express from "express";
import {
  createReview,
  getProductReviews,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  toggleLikeReview,
  reportReview,
} from "../controllers/MarketingReviewController.js";

const router = express.Router();

router.get("/", getAllReviews);
router.post("/", createReview);
router.get("/product/:productId", getProductReviews);
router.put("/:id/status", updateReviewStatus);
router.post("/:id/like", toggleLikeReview);
router.post("/:id/report", reportReview);
router.delete("/:id", deleteReview);

export default router;

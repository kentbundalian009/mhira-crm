import express from "express";
import {
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  requestOrderCancellation,
  reviewOrderCancellation,
} from "../controllers/LogisticOrderController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Order Management Routes (Admin & Logistic Staff)
router.get("/", protect, authorize("Admin", "Logistic"), getAllOrders);

// Order Creation (Checkout requires authentication)
router.post("/", protect, createOrder);
router.post("/checkout", protect, createOrder);

// Customer & Staff Order Tracking
router.get("/user/:userId", protect, getUserOrders);

// Order Status & Cancellation
router.put("/:orderId/status", protect, updateOrderStatus);
router.post("/:orderId/request-cancel", protect, requestOrderCancellation);
router.post("/:orderId/review-cancel", protect, authorize("Admin", "Logistic"), reviewOrderCancellation);

export default router;
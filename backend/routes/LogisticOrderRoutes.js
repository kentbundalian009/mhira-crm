import express from "express";
import {
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  requestOrderCancellation,
  reviewOrderCancellation,
  addOrderTimelineEvent,
  updateOrderPayment,
} from "../controllers/LogisticOrderController.js";
import { protect, authorize, protectOptional } from "../middleware/authMiddleware.js";

const router = express.Router();

// Order Management Routes (Admin & Logistic Staff)
router.get("/", protect, authorize("Admin", "Logistic"), getAllOrders);

// Order Creation (Checkout requires authentication)
router.post("/", protect, createOrder);
router.post("/checkout", protect, createOrder);

// Customer & Staff Order Tracking (Allows optional auth so guest/preview users can track)
router.get("/user/:userId", protectOptional, getUserOrders);

// Order Status, Payments, Process Timeline & Cancellation
router.put("/:orderId/status", protect, updateOrderStatus);
router.put("/:orderId/payment", protect, updateOrderPayment);
router.post("/:orderId/timeline", protect, addOrderTimelineEvent);
router.post("/:orderId/request-cancel", protect, requestOrderCancellation);
router.post("/:orderId/review-cancel", protect, authorize("Admin", "Logistic"), reviewOrderCancellation);

export default router;
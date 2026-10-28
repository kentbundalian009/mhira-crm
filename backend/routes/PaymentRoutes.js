import express from "express";
import {
  createPayMongoCheckoutSession,
  verifyPayMongoPayment,
  handlePayMongoWebhook,
  getPaymentConfig,
  payExistingOrder,
} from "../controllers/PaymentController.js";

const router = express.Router();

// Configuration
router.get("/config", getPaymentConfig);

// PayMongo Checkout Session
router.post("/create-checkout-session", createPayMongoCheckoutSession);
router.post("/paymongo-checkout", createPayMongoCheckoutSession);
router.post("/pay-order/:orderId", payExistingOrder);

// Verification
router.get("/verify-session/:sessionId", verifyPayMongoPayment);
router.post("/verify-session", verifyPayMongoPayment);

// Webhook
router.post("/webhook", handlePayMongoWebhook);

export default router;

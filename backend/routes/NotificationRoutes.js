import express from "express";
import { sendOrderNotification, sendMarketingAd } from "../controllers/NotificationController.js";

const router = express.Router();

router.post("/order", sendOrderNotification);
router.post("/marketing", sendMarketingAd);

export default router;

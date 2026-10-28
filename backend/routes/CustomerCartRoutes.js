import express from "express";
import {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
} from "../controllers/CustomerCartController.js";

const router = express.Router();

// Cart Operations
router.get("/:userId", getCart);
router.post("/add", addToCart);
router.put("/update-quantity", updateQuantity);
router.delete("/remove/:userId/:productId", removeFromCart);
router.delete("/clear/:userId", clearCart);

export default router;
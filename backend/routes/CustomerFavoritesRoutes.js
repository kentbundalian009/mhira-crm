import express from "express";
import {
  getFavorites,
  toggleFavorite,
  addFavorite,
  removeFavorite,
  clearFavorites,
} from "../controllers/CustomerFavoritesController.js";

const router = express.Router();

router.get("/:userId", getFavorites);
router.post("/toggle", toggleFavorite);
router.post("/add", addFavorite);
router.delete("/remove/:userId/:productId", removeFavorite);
router.delete("/clear/:userId", clearFavorites);
router.post("/clear", clearFavorites);
router.delete("/:userId/:productId", removeFavorite);

export default router;

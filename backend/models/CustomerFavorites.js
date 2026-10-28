import mongoose from "mongoose";

const favoriteItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: false,
    },
    product: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const customerFavoritesSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: [favoriteItemSchema],
  },
  { timestamps: true }
);

// Use the default global Mongoose connection instance
const CustomerFavorites =
  mongoose.models.CustomerFavorites ||
  mongoose.model("CustomerFavorites", customerFavoritesSchema);

export default CustomerFavorites;

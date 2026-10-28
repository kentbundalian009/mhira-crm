import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    itemDescription: {
      type: String,
      default: "Mhira Botanical Product",
    },
    itemName: {
      type: String,
      default: "Mhira Botanical Product",
    },
    category: {
      type: String,
      default: "Skin Care",
    },
    price: {
      type: Number,
      required: true,
      default: 200,
    },
    originalPrice: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: "/mhira_removebg.png",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: true, timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

cartSchema.methods.formatForStorefront = function () {
  return {
    _id: this._id,
    userId: this.userId,
    items: (this.items || []).map((item) => ({
      _id: item._id,
      productId: item.productId,
      quantity: item.quantity || 1,
      product: {
        _id: item.productId,
        id: item.productId,
        code: item.productId,
        itemDescription: item.itemDescription || item.itemName || "Mhira Botanical Product",
        itemName: item.itemName || item.itemDescription || "Mhira Botanical Product",
        name: item.itemDescription || item.itemName || "Mhira Botanical Product",
        category: item.category || "Skin Care",
        navbarTag: item.category || "Skin Care",
        brand: "Mhira Natural",
        price: Number(item.price) || 200,
        originalPrice: Number(item.originalPrice) || 0,
        image: item.image || "/mhira_removebg.png",
        images: [item.image || "/mhira_removebg.png"],
        quantity: 10,
        isPublished: true,
      },
    })),
  };
};

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
export default Cart;
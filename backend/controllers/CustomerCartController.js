import Cart from "../models/CustomerCart.js";
import mongoose from "mongoose";

// Helper to extract a string product ID
export const extractProductId = (productId, product) => {
  if (productId && typeof productId === "string" && productId.trim() && productId.trim() !== "[object Object]") {
    return productId.trim();
  }
  const obj = product || (typeof productId === "object" ? productId : null);
  if (obj && typeof obj === "object") {
    if (obj._id && typeof obj._id !== "object" && String(obj._id) !== "[object Object]") {
      return String(obj._id).trim();
    }
    if (obj.id && typeof obj.id !== "object" && String(obj.id) !== "[object Object]") {
      return String(obj.id).trim();
    }
    if (obj.code && typeof obj.code !== "object") {
      return String(obj.code).trim();
    }
    if (obj.itemDescription || obj.itemName || obj.name) {
      return String(obj.itemDescription || obj.itemName || obj.name).trim();
    }
  }
  return "";
};

export const formatInventoryToStorefront = (p) => ({
  _id: p._id,
  id: p._id,
  code: p.code || "",
  itemDescription: p.itemDescription || p.itemName || "Mhira Botanical Product",
  itemName: p.itemName || p.itemDescription || "Mhira Botanical Product",
  name: p.itemDescription || p.itemName || "Mhira Botanical Product",
  category: p.category || "Skin Care",
  navbarTag: p.category || "Skin Care",
  brand: p.brand || "Mhira Natural",
  quantity: typeof p.quantity === "number" ? p.quantity : 10,
  price: typeof p.price === "number" && p.price > 0 ? p.price : 200,
  originalPrice: p.originalPrice || 0,
  image: p.image || "/mhira_removebg.png",
  images: p.image ? [p.image] : ["/mhira_removebg.png"],
  isPublished: true,
});

export const formatCartResponse = (cart) => {
  if (!cart) return { _id: null, items: [] };
  const items = cart.items || [];
  return {
    _id: cart._id,
    userId: cart.userId,
    items: items.map((item) => ({
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

export const populateProductsList = async (items) => {
  if (!items || !Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item) return null;
      const rawProd = item.product || item;
      const pId = extractProductId(item.productId || item.product || item) || `prod_${Date.now()}`;
      const title =
        (rawProd && (rawProd.itemDescription || rawProd.itemName || rawProd.name)) ||
        item.itemDescription ||
        item.itemName ||
        "Mhira Botanical Product";
      const cat = (rawProd && (rawProd.category || rawProd.navbarTag)) || item.category || "Skin Care";
      const priceVal =
        rawProd && Number(rawProd.price) > 0 ? Number(rawProd.price) : Number(item.price) || 200;
      const origPriceVal =
        rawProd && Number(rawProd.originalPrice) > 0
          ? Number(rawProd.originalPrice)
          : Number(item.originalPrice) || 0;
      const imgVal =
        (rawProd && (rawProd.image || (Array.isArray(rawProd.images) && rawProd.images[0]))) ||
        item.image ||
        "/mhira_removebg.png";
      const qty = Number(item.quantity) || 1;

      return {
        _id: item._id || undefined,
        productId: pId,
        quantity: qty,
        name: title,
        itemDescription: title,
        itemName: title,
        price: priceVal,
        originalPrice: origPriceVal,
        image: imgVal,
        product: {
          _id: pId,
          id: pId,
          code: pId,
          itemDescription: title,
          itemName: title,
          name: title,
          category: cat,
          navbarTag: cat,
          brand: "Mhira Natural",
          price: priceVal,
          originalPrice: origPriceVal,
          image: imgVal,
          images: [imgVal],
          quantity: 10,
          isPublished: true,
        },
      };
    })
    .filter(Boolean);
};

// GET /api/cart/:userId
export const getCart = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const cart = await Cart.findOne({ userId }).maxTimeMS(10000).lean();
    if (!cart) {
      return res.status(200).json({ _id: null, userId, items: [] });
    }

    return res.status(200).json(formatCartResponse(cart));
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({ message: "Server error fetching cart", error: error.message });
  }
};

// POST /api/cart/add
export const addToCart = async (req, res) => {
  try {
    const { userId, productId, quantity, product } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const cleanId = extractProductId(productId, product) || `prod_${Date.now()}`;
    const qtyToAdd = Number(quantity) > 0 ? Number(quantity) : 1;

    const title = (product && (product.itemDescription || product.itemName || product.name)) || "Mhira Botanical Product";
    const cat = (product && (product.category || product.navbarTag)) || "Skin Care";
    const priceVal = (product && Number(product.price) > 0) ? Number(product.price) : 200;
    const origPriceVal = (product && Number(product.originalPrice) > 0) ? Number(product.originalPrice) : 0;
    const imgVal = (product && ((Array.isArray(product.images) && product.images[0]) || product.image || product.imageUrl)) || "/mhira_removebg.png";

    // 1. Atomic update if item already exists in cart
    let updatedCart = await Cart.findOneAndUpdate(
      { userId, "items.productId": cleanId },
      {
        $inc: { "items.$.quantity": qtyToAdd },
        $set: {
          "items.$.price": priceVal,
          "items.$.itemDescription": title,
          ...(imgVal && imgVal !== "/mhira_removebg.png" ? { "items.$.image": imgVal } : {})
        }
      },
      { returnDocument: "after", maxTimeMS: 10000 }
    ).lean();

    // 2. If item is not in cart, atomic push / upsert
    if (!updatedCart) {
      updatedCart = await Cart.findOneAndUpdate(
        { userId },
        {
          $push: {
            items: {
              productId: cleanId,
              itemDescription: title,
              itemName: title,
              category: cat,
              price: priceVal,
              originalPrice: origPriceVal,
              image: imgVal,
              quantity: qtyToAdd,
            }
          }
        },
        { returnDocument: "after", upsert: true, maxTimeMS: 10000 }
      ).lean();
    }

    return res.status(200).json(formatCartResponse(updatedCart));
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({ message: "Server error adding to cart", error: error.message });
  }
};

// PUT /api/cart/update-quantity
export const updateQuantity = async (req, res) => {
  try {
    const { userId, productId, change, quantity } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ message: "User ID and Product ID are required" });
    }

    const cleanPId = String(productId).trim();
    let updatedCart = null;

    if (typeof quantity === "number") {
      if (quantity <= 0) {
        updatedCart = await Cart.findOneAndUpdate(
          { userId },
          { $pull: { items: { productId: cleanPId } } },
          { returnDocument: "after", maxTimeMS: 10000 }
        ).lean();
      } else {
        updatedCart = await Cart.findOneAndUpdate(
          { userId, "items.productId": cleanPId },
          { $set: { "items.$.quantity": quantity } },
          { returnDocument: "after", maxTimeMS: 10000 }
        ).lean();
      }
    } else if (typeof change === "number") {
      const existing = await Cart.findOne({ userId, "items.productId": cleanPId }).maxTimeMS(10000).lean();
      const currentItem = existing?.items?.find((i) => String(i.productId) === cleanPId);
      const nextQty = (Number(currentItem?.quantity) || 1) + change;

      if (nextQty <= 0) {
        updatedCart = await Cart.findOneAndUpdate(
          { userId },
          { $pull: { items: { productId: cleanPId } } },
          { returnDocument: "after", maxTimeMS: 10000 }
        ).lean();
      } else {
        updatedCart = await Cart.findOneAndUpdate(
          { userId, "items.productId": cleanPId },
          { $inc: { "items.$.quantity": change } },
          { returnDocument: "after", maxTimeMS: 10000 }
        ).lean();
      }
    }

    if (!updatedCart) {
      updatedCart = await Cart.findOne({ userId }).maxTimeMS(10000).lean();
    }

    return res.status(200).json(formatCartResponse(updatedCart));
  } catch (error) {
    console.error("Error updating quantity:", error);
    return res.status(500).json({ message: "Server error updating quantity", error: error.message });
  }
};

// DELETE /api/cart/remove/:userId/:productId
export const removeFromCart = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    if (!userId || !productId) {
      return res.status(400).json({ message: "User ID and Product ID are required" });
    }

    const cleanPId = decodeURIComponent(productId).trim();

    let updatedCart = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId: cleanPId } } },
      { returnDocument: "after", maxTimeMS: 10000 }
    ).lean();

    if (!updatedCart || (updatedCart.items && updatedCart.items.some((i) => String(i._id) === cleanPId))) {
      updatedCart = await Cart.findOneAndUpdate(
        { userId },
        { $pull: { items: { _id: cleanPId } } },
        { returnDocument: "after", maxTimeMS: 10000 }
      ).lean();
    }

    return res.status(200).json(formatCartResponse(updatedCart));
  } catch (error) {
    console.error("Error removing from cart:", error);
    return res.status(500).json({ message: "Server error removing from cart", error: error.message });
  }
};

// DELETE /api/cart/clear/:userId
export const clearCart = async (req, res) => {
  try {
    const userId = req.params.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const updatedCart = await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { returnDocument: "after", maxTimeMS: 10000 }
    ).lean();

    return res.status(200).json({
      _id: updatedCart ? updatedCart._id : null,
      userId,
      items: [],
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return res.status(500).json({ message: "Server error clearing cart", error: error.message });
  }
};

export default {
  extractProductId,
  formatInventoryToStorefront,
  formatCartResponse,
  populateProductsList,
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
};
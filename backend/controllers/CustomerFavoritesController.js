import CustomerFavorites from "../models/CustomerFavorites.js";

// Helper to extract clean product ID
const extractProductId = (productId, product) => {
  if (productId && typeof productId === "string" && productId.trim() && productId.trim() !== "[object Object]") {
    return productId.trim();
  }
  const obj = product || (typeof productId === "object" ? productId : null);
  if (obj && typeof obj === "object") {
    if (obj._id && String(obj._id) !== "[object Object]") return String(obj._id).trim();
    if (obj.id && String(obj.id) !== "[object Object]") return String(obj.id).trim();
    if (obj.code) return String(obj.code).trim();
    if (obj.itemDescription || obj.itemName || obj.name) {
      return String(obj.itemDescription || obj.itemName || obj.name).trim();
    }
  }
  return "";
};

// Standard product formatter to guarantee all required fields and nonzero price
const formatFavoriteProduct = (rawProd, pId) => {
  const cleanId = pId || (rawProd && (rawProd._id || rawProd.id || rawProd.code)) || "";
  const title =
    (rawProd && (rawProd.itemDescription || rawProd.itemName || rawProd.name)) ||
    "Mhira Botanical Product";
  const cat = (rawProd && (rawProd.category || rawProd.navbarTag)) || "Skin Care";
  const priceVal = rawProd && Number(rawProd.price) > 0 ? Number(rawProd.price) : 200;
  const origPriceVal = rawProd && Number(rawProd.originalPrice) > 0 ? Number(rawProd.originalPrice) : 0;
  const imgVal =
    (rawProd && ((Array.isArray(rawProd.images) && rawProd.images[0]) || rawProd.image || rawProd.imageUrl)) ||
    "/mhira_removebg.png";

  return {
    _id: cleanId,
    id: cleanId,
    code: (rawProd && rawProd.code) || cleanId,
    itemDescription: title,
    itemName: title,
    name: title,
    category: cat,
    navbarTag: cat,
    brand: (rawProd && rawProd.brand) || "Mhira Natural",
    price: priceVal,
    originalPrice: origPriceVal,
    image: imgVal,
    images: [imgVal],
    quantity: 10,
    specification: (rawProd && rawProd.specification) || "",
    uom: (rawProd && rawProd.uom) || "PCS",
    isPublished: true,
  };
};

// @desc    Get user favorites
// @route   GET /api/favorites/:userId
export const getFavorites = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const favorites = await CustomerFavorites.findOne({ userId }).lean();

    if (!favorites || !Array.isArray(favorites.items)) {
      return res.status(200).json({
        _id: null,
        userId,
        items: [],
      });
    }

    const sanitizedItems = favorites.items
      .map((item) => {
        if (!item) return null;
        const pId = extractProductId(item.productId, item.product) || String(item._id || "");
        const prod = formatFavoriteProduct(item.product || item, pId);
        return {
          _id: item._id || pId,
          productId: pId,
          product: prod,
          addedAt: item.addedAt || new Date(),
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      _id: favorites._id,
      userId: favorites.userId,
      items: sanitizedItems,
    });
  } catch (error) {
    console.error("Error fetching favorites:", error.message);
    return res.status(200).json({
      _id: null,
      userId: req.params?.userId || null,
      items: [],
      error: error.message,
    });
  }
};

// Helper to match target product against stored favorite item
const matchesItem = (favItem, targetId, targetProd) => {
  if (!favItem) return false;
  const targetObj = typeof targetProd === "object" ? targetProd : null;
  const targetIdStr = String(
    targetId ||
    targetObj?._id ||
    targetObj?.id ||
    targetObj?.code ||
    (typeof targetProd === "string" ? targetProd : "")
  ).trim();
  const targetCode = String(targetObj?.code || "").trim();

  const favProductId = String(favItem.productId || "").trim();
  const favSubProdId = String(favItem.product?._id || favItem.product?.id || "").trim();
  const favCode = String(favItem.product?.code || favItem.code || "").trim();

  // Direct ID or Code Match (never compare with internal subdocument _id)
  if (targetIdStr && (targetIdStr === favProductId || targetIdStr === favSubProdId || (targetCode && targetIdStr === favCode))) {
    return true;
  }
  if (targetCode && favCode && targetCode === favCode) {
    return true;
  }

  return false;
};

// @desc    Toggle favorite item
// @route   POST /api/favorites/toggle
export const toggleFavorite = async (req, res) => {
  try {
    const { userId, productId, product } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId are required." });
    }

    const cleanId = String(productId).trim();
    const prodPayload = formatFavoriteProduct(product, cleanId);

    let favDoc = await CustomerFavorites.findOne({ userId });
    if (!favDoc) {
      favDoc = new CustomerFavorites({ userId, items: [] });
    }

    const existingIndex = (favDoc.items || []).findIndex((item) => matchesItem(item, cleanId, product || prodPayload));

    let isFavorited = false;
    if (existingIndex > -1) {
      favDoc.items.splice(existingIndex, 1);
      isFavorited = false;
    } else {
      favDoc.items.unshift({
        productId: cleanId,
        product: prodPayload,
        addedAt: new Date(),
      });
      isFavorited = true;
    }

    await favDoc.save();

    const formattedItems = (favDoc.items || []).map((item) => ({
      _id: item._id || item.productId,
      productId: item.productId,
      product: formatFavoriteProduct(item.product || item, item.productId),
      addedAt: item.addedAt || new Date(),
    }));

    return res.status(200).json({
      message: isFavorited ? "Added to favorites!" : "Removed from favorites",
      isFavorited,
      userId,
      items: formattedItems,
    });
  } catch (error) {
    console.error("Error toggling favorite:", error.message);
    return res.status(500).json({ message: "Server error toggling favorite.", error: error.message });
  }
};

// @desc    Add favorite item
// @route   POST /api/favorites/add
export const addFavorite = async (req, res) => {
  try {
    const { userId, productId, product } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId are required." });
    }

    const cleanId = extractProductId(productId, product);
    const prodPayload = formatFavoriteProduct(product, cleanId);

    let favDoc = await CustomerFavorites.findOne({ userId });
    if (!favDoc) {
      favDoc = new CustomerFavorites({ userId, items: [] });
    }

    const exists = (favDoc.items || []).some((item) => {
      if (!item) return false;
      const itemId = extractProductId(item.productId, item.product) || String(item._id || "");
      return (
        itemId === cleanId ||
        item.productId === cleanId ||
        item.product?._id === cleanId ||
        item.product?.id === cleanId
      );
    });

    if (!exists) {
      favDoc.items.push({
        productId: cleanId,
        product: prodPayload,
        addedAt: new Date(),
      });
      await favDoc.save();
    }

    const formattedItems = (favDoc.items || []).map((item) => ({
      _id: item._id || item.productId,
      productId: item.productId,
      product: formatFavoriteProduct(item.product || item, item.productId),
      addedAt: item.addedAt || new Date(),
    }));

    return res.status(200).json({
      message: "Added to favorites!",
      isFavorited: true,
      userId,
      items: formattedItems,
    });
  } catch (error) {
    console.error("Error adding favorite:", error.message);
    return res.status(500).json({ message: "Server error adding favorite.", error: error.message });
  }
};

// @desc    Remove favorite item
// @route   DELETE /api/favorites/:userId/:productId
export const removeFavorite = async (req, res) => {
  try {
    const userId = req.params.userId || req.body.userId;
    const productId = req.params.productId || req.body.productId;

    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId are required." });
    }

    const cleanId = extractProductId(productId) || String(productId);

    let favDoc = await CustomerFavorites.findOne({ userId });
    if (favDoc && Array.isArray(favDoc.items)) {
      favDoc.items = favDoc.items.filter((item) => !matchesItem(item, cleanId, null));
      await favDoc.save();
    }

    const formattedItems = (favDoc?.items || []).map((item) => ({
      _id: item._id || item.productId,
      productId: item.productId,
      product: formatFavoriteProduct(item.product || item, item.productId),
      addedAt: item.addedAt || new Date(),
    }));

    return res.status(200).json({
      message: "Removed from favorites",
      userId,
      items: formattedItems,
    });
  } catch (error) {
    console.error("Error removing favorite:", error.message);
    return res.status(500).json({ message: "Server error removing favorite.", error: error.message });
  }
};

// @desc    Clear all favorites
// @route   DELETE /api/favorites/clear/:userId
export const clearFavorites = async (req, res) => {
  try {
    const userId = req.params.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    await CustomerFavorites.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { upsert: true }
    );

    return res.status(200).json({
      message: "Favorites cleared",
      userId,
      items: [],
    });
  } catch (error) {
    console.error("Error clearing favorites:", error.message);
    return res.status(500).json({ message: "Server error clearing favorites.", error: error.message });
  }
};

export default {
  getFavorites,
  toggleFavorite,
  addFavorite,
  removeFavorite,
  clearFavorites,
};

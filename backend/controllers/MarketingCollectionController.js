import Collection from '../models/MarketingCollection.js';
import Product from '../models/InventoryProduct.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const OFFICIAL_PRICES = {
    'fg-inv-00001': 225,
    'fg-inv-00002': 280,
    'fg-inv-00003': 250,
    'fg-inv-00004': 300,
    'fg0001': 225,
    'fg0002': 280,
    'fg0003': 250,
    'fg0004': 300,
};

// Helper to format Inventory Product into standard Storefront Product
export const formatInventoryToStorefront = (p) => {
    const title = p.itemDescription || p.itemName || p.name || 'Mhira Botanical Product';
    const lowerTitle = title.toLowerCase();
    const pCode = (p.code || '').toLowerCase().trim();

    let category = p.category;
    if (!category || ['Finished Goods', 'Finished Product', 'Raw Materials', 'Packaging', 'Supplies'].includes(category)) {
        if (lowerTitle.includes('hair')) category = 'Hair Care';
        else if (lowerTitle.includes('lotion') || lowerTitle.includes('body') || lowerTitle.includes('soap')) category = 'Bath & Body';
        else if (lowerTitle.includes('tea') || lowerTitle.includes('beverage')) category = 'Beverages & Tea';
        else if (lowerTitle.includes('set') || lowerTitle.includes('bundle')) category = 'Package Sets';
        else category = 'Skin Care';
    }

    const fallbackPrice = OFFICIAL_PRICES[pCode] || 200;
    const priceNum = typeof p.price === 'number' && p.price > 0 
        ? p.price 
        : (Number(p.unitPrice) || Number(p.sellingPrice) || Number(p.price) || fallbackPrice);

    const mainImage = p.image || (Array.isArray(p.images) && p.images[0]) || '/mhira_removebg.png';
    const imageList = Array.isArray(p.images) && p.images.length > 0 ? p.images : [mainImage];

    return {
        _id: p._id,
        id: p._id,
        code: p.code || '',
        itemDescription: title,
        itemName: title,
        name: title,
        category: category,
        navbarTag: category,
        brand: p.brand || 'Mhira Natural',
        quantity: typeof p.quantity === 'number' ? p.quantity : 10,
        uom: p.uom || 'pcs',
        specification: p.specification || '',
        image: mainImage,
        images: imageList,
        price: priceNum,
        originalPrice: p.originalPrice || 0,
        marketingDescription: p.specification || p.itemDescription || '',
        rating: typeof p.rating === 'number' ? p.rating : 5.0,
        soldCount: p.soldCount || 0,
        isPublished: true,
        createdAt: p.createdAt || new Date()
    };
};

// In-Memory Cache for Instant (0ms) Public Products Delivery
let cachedPublicProducts = null;
let lastPublicProductsTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export const invalidateProductsCache = () => {
    cachedPublicProducts = null;
    lastPublicProductsTime = 0;
};

// 1. Fetch Public Products for Customers (OurCollection.jsx & Navbar)
export const getPublicProducts = async (req, res) => {
    try {
        const { search, category, navbarTag } = req.query;
        const now = Date.now();
        let combined = [];

        // Check if raw public products exist in cache
        if (cachedPublicProducts && Array.isArray(cachedPublicProducts) && cachedPublicProducts.length > 0 && now - lastPublicProductsTime < CACHE_TTL_MS) {
            combined = cachedPublicProducts;
        } else {
            // Fetch from Marketing Collections & Inventory Products (Lean fast parallel queries)
            const [marketingDocs, inventoryDocs] = await Promise.all([
                Collection.find({ isPublished: { $ne: false } }).lean().maxTimeMS(8000).catch(() => []),
                Product.find({ isArchived: { $ne: true } }).lean().maxTimeMS(8000).catch(() => [])
            ]);

            const mktMap = new Map();
            marketingDocs.forEach((m) => {
                if (m.code) mktMap.set((m.code || '').toLowerCase().trim(), m);
                if (m._id) mktMap.set(String(m._id), m);
            });

            const invMap = new Map();
            inventoryDocs.forEach((inv) => {
                if (inv.code) invMap.set((inv.code || '').toLowerCase().trim(), inv);
                if (inv._id) invMap.set(String(inv._id), inv);
            });

            const seenCodes = new Set();
            const seenIds = new Set();

            // 1. Process Marketing Docs first (contains exact prices ₱300, ₱280, ₱250, ₱225)
            for (const mkt of marketingDocs) {
                const matchedInv = (mkt.code && invMap.get((mkt.code || '').toLowerCase().trim())) || (mkt.productRef && invMap.get(String(mkt.productRef)));
                const item = {
                    ...mkt,
                    id: mkt._id,
                    name: mkt.itemDescription || mkt.itemName || 'Mhira Natural Product',
                    itemName: mkt.itemName || mkt.itemDescription || 'Mhira Natural Product',
                    image: mkt.image || (Array.isArray(mkt.images) && mkt.images[0]) || '/mhira_removebg.png',
                    images: Array.isArray(mkt.images) && mkt.images.length > 0 ? mkt.images : [mkt.image || '/mhira_removebg.png'],
                    price: Number(mkt.price) > 0 ? Number(mkt.price) : 200,
                    specification: mkt.specification || matchedInv?.specification || '',
                    uom: mkt.uom || matchedInv?.uom || 'ML',
                };
                combined.push(item);
                if (mkt.code) seenCodes.add((mkt.code || '').toLowerCase().trim());
                if (mkt._id) seenIds.add(String(mkt._id));
            }

            // 2. Add any additional inventory products not yet in marketing
            for (const inv of inventoryDocs) {
                const invCode = (inv.code || '').toLowerCase().trim();
                const invId = String(inv._id);
                if (!seenCodes.has(invCode) && !seenIds.has(invId)) {
                    const formatted = formatInventoryToStorefront(inv);
                    const matchingMkt = mktMap.get(invCode);
                    if (matchingMkt) {
                        if (matchingMkt.price) formatted.price = matchingMkt.price;
                        if (matchingMkt.image) formatted.image = matchingMkt.image;
                        if (matchingMkt.images?.length > 0) formatted.images = matchingMkt.images;
                        if (matchingMkt.category) formatted.category = matchingMkt.category;
                    }
                    combined.push(formatted);
                    seenCodes.add(invCode);
                    seenIds.add(invId);
                }
            }

            // If empty, fallback to active database direct query
            if (combined.length === 0) {
                try {
                    const db = mongoose.connection.db;
                    if (db) {
                        const directProds = await db.collection('products').find({}).toArray();
                        for (const dp of directProds) {
                            combined.push(formatInventoryToStorefront(dp));
                        }
                    }
                } catch (e) {}
            }

            if (combined.length > 0) {
                cachedPublicProducts = combined;
                lastPublicProductsTime = Date.now();
            }
        }

        // Apply filtering in-memory
        let result = combined;

        if (category && category !== 'All') {
            const catLower = category.toLowerCase().trim();
            result = result.filter((p) => {
                const c = (p.category || '').toLowerCase().trim();
                const n = (p.navbarTag || '').toLowerCase().trim();
                return c === catLower || n === catLower || c.includes(catLower) || n.includes(catLower);
            });
        }

        if (navbarTag && navbarTag !== 'All') {
            const tagLower = navbarTag.toLowerCase().trim();
            result = result.filter((p) => {
                const n = (p.navbarTag || '').toLowerCase().trim();
                return n === tagLower || n.includes(tagLower);
            });
        }

        if (search && search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter((p) => {
                const name = (p.itemDescription || p.itemName || p.name || p.title || '').toLowerCase();
                return name.includes(q);
            });
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching collection:", error);
        if (cachedPublicProducts) return res.status(200).json(cachedPublicProducts);
        return res.status(200).json([]);
    }
};

// 1.1 Fetch Single Product for Customer Details Page
export const getPublicProductById = async (req, res) => {
    try {
        const { id } = req.params;
        let product = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            product = await Collection.findById(id).lean().catch(() => null);
            if (!product) {
                const inv = await Product.findById(id).lean().catch(() => null);
                if (inv) product = formatInventoryToStorefront(inv);
            }
        }

        if (!product && id) {
            const cleanId = String(id).trim();
            product = await Collection.findOne({
                $or: [{ code: cleanId }, { code: cleanId.toLowerCase() }, { _id: cleanId }],
            }).lean().catch(() => null);

            if (!product) {
                const inv = await Product.findOne({
                    $or: [{ code: cleanId }, { code: cleanId.toLowerCase() }, { _id: cleanId }],
                }).lean().catch(() => null);
                if (inv) product = formatInventoryToStorefront(inv);
            }
        }

        // Direct DB fallback
        if (!product && id) {
            try {
                const db = mongoose.connection.db;
                if (db) {
                    const query = mongoose.Types.ObjectId.isValid(id)
                        ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { code: id }] }
                        : { $or: [{ _id: id }, { code: id }] };

                    const mktRaw = await db.collection('collections').findOne(query).catch(() => null);
                    if (mktRaw) {
                        product = mktRaw;
                    } else {
                        const invRaw = await db.collection('products').findOne(query).catch(() => null);
                        if (invRaw) product = formatInventoryToStorefront(invRaw);
                    }
                }
            } catch (e) {
                console.warn('Fallback direct DB product lookup error:', e.message);
            }
        }

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const normalized = {
            ...product,
            id: product._id || product.id,
            image: product.image || (Array.isArray(product.images) && product.images[0]) || '/mhira_removebg.png',
            images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || '/mhira_removebg.png'],
            price: Number(product.price) > 0 ? Number(product.price) : 200,
        };

        return res.status(200).json(normalized);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching product details', error: error.message });
    }
};

// 2. Fetch Categories & Navbar Tags dynamically
export const getCategories = async (req, res) => {
    try {
        const blacklist = [
            'Finished Goods',
            'Finished Product',
            'Raw Materials',
            'Rawmat',
            'Packaging',
            'Supplies',
            'Package Sets',
            'Package Set',
            'All',
        ];

        let settingsCategories = [];
        try {
            const configDir = path.join(process.cwd(), "config");
            const settingsFilePath = path.join(configDir, "system_settings.json");
            if (fs.existsSync(settingsFilePath)) {
                const data = JSON.parse(fs.readFileSync(settingsFilePath, "utf-8"));
                if (Array.isArray(data.inventory_fg_custom_categories)) {
                    settingsCategories = data.inventory_fg_custom_categories;
                }
            }
        } catch (e) {}

        const fallbackDefaults = ['Skin Care', 'Bath & Body', 'Hair Care', 'Beverages & Tea', 'Special Bundles'];
        const basePool = settingsCategories.length > 0 ? settingsCategories : fallbackDefaults;

        let categories = await Collection.distinct('category').catch(() => []);
        let invCategories = await Product.distinct('category').catch(() => []);
        let navbarTags = await Collection.distinct('navbarTag').catch(() => []);

        const allCats = [...basePool, ...categories, ...invCategories]
            .map((c) => String(c || '').trim())
            .filter((c) => c && !blacklist.some((b) => b.toLowerCase() === c.toLowerCase()));

        navbarTags = (navbarTags || [])
            .map((t) => String(t || '').trim())
            .filter((t) => t && !blacklist.some((b) => b.toLowerCase() === t.toLowerCase()));

        const finalCategories = Array.from(new Set(allCats)).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
        );
        return res.status(200).json({ categories: finalCategories, navbarTags });
    } catch (error) {
        const defaultAllowed = ['Skin Care', 'Bath & Body', 'Hair Care', 'Beverages & Tea', 'Special Bundles'];
        return res.status(200).json({ categories: defaultAllowed, navbarTags: [] });
    }
};

// 3. Fetch All Products for Marketing Management (ProductCatalog.jsx)
export const getAllCatalogProducts = async (req, res) => {
    try {
        const products = await Collection.find().sort({ createdAt: -1 }).lean().maxTimeMS(8000);
        return res.status(200).json(products || []);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching catalog', error: error.message });
    }
};

// 4. Fetch items directly from the "products" collection
export const getInventoryProducts = async (req, res) => {
    try {
        const products = await Product.find({ isArchived: { $ne: true } })
            .sort({ createdAt: -1 })
            .lean()
            .maxTimeMS(8000);

        if (products && products.length > 0) {
            return res.status(200).json(products);
        }

        const db = mongoose.connection.db;
        if (db) {
            const direct = await db.collection('products').find({}).toArray();
            return res.status(200).json(direct || []);
        }

        return res.status(200).json([]);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching inventory products', error: error.message });
    }
};

// 5. Create / Add New Catalog Item
export const createCatalogProduct = async (req, res) => {
    try {
        const newProduct = new Collection(req.body);
        const savedProduct = await newProduct.save();
        invalidateProductsCache();
        return res.status(201).json(savedProduct);
    } catch (error) {
        return res.status(400).json({ message: 'Error creating product', error: error.message });
    }
};

// 6. Update Catalog Item / Publish Toggle
export const updateCatalogProduct = async (req, res) => {
    try {
        const updatedProduct = await Collection.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        invalidateProductsCache();
        return res.status(200).json(updatedProduct);
    } catch (error) {
        return res.status(400).json({ message: 'Error updating product', error: error.message });
    }
};

// 7. Delete Product
export const deleteCatalogProduct = async (req, res) => {
    try {
        await Collection.findByIdAndDelete(req.params.id);
        invalidateProductsCache();
        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
};

export default {
    getPublicProducts,
    getPublicProductById,
    getCategories,
    getAllCatalogProducts,
    getInventoryProducts,
    createCatalogProduct,
    updateCatalogProduct,
    deleteCatalogProduct
};
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
        bundleItems: p.bundleItems || [],
        isBundle: Boolean(p.isBundle || p.category === 'Package Sets' || (p.bundleItems && p.bundleItems.length > 0)),
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

const normalizeProductCode = (code) => {
    const raw = String(code || '').toLowerCase().trim();
    if (!raw) return '';
    const fgMatch = raw.match(/^(?:fg-inv-|fg-?)0*(\d+)$/i);
    if (fgMatch) return `fg-${fgMatch[1]}`;
    const pkgMatch = raw.match(/^(?:pkg-?)0*(\d+)$/i);
    if (pkgMatch) return `pkg-${pkgMatch[1]}`;
    return raw;
};

// 1. Fetch Public Products for Customers (OurCollection.jsx, CustomerPackageSet.jsx & Navbar)
export const getPublicProducts = async (req, res) => {
    try {
        const { search, category, navbarTag } = req.query;
        const now = Date.now();
        let combined = [];

        // Check if raw public products exist in cache
        if (cachedPublicProducts !== null && Array.isArray(cachedPublicProducts) && now - lastPublicProductsTime < CACHE_TTL_MS) {
            combined = cachedPublicProducts;
        } else {
            // Fetch all Marketing Collections & Inventory Products so we can accurately cross-check archive states
            const [allMarketingDocs, allInventoryDocs] = await Promise.all([
                Collection.find({}).lean().maxTimeMS(8000).catch(() => []),
                Product.find({}).lean().maxTimeMS(8000).catch(() => [])
            ]);

            const invMap = new Map();
            const invNameMap = new Map();
            allInventoryDocs.forEach((inv) => {
                if (!inv) return;
                if (inv._id) invMap.set(String(inv._id), inv);
                const rawCode = (inv.code || '').toLowerCase().trim();
                const normCode = normalizeProductCode(inv.code);
                if (rawCode) invMap.set(rawCode, inv);
                if (normCode) invMap.set(normCode, inv);
                const nameKey = (inv.itemName || '').toLowerCase().trim();
                const descKey = (inv.itemDescription || '').toLowerCase().trim();
                if (nameKey) invNameMap.set(nameKey, inv);
                if (descKey) invNameMap.set(descKey, inv);
            });

            const mktMap = new Map();
            const mktByProductMap = new Map();
            const seenCodes = new Set();
            const seenIds = new Set();
            const seenNames = new Set();

            allMarketingDocs.forEach((m) => {
                if (!m) return;
                const mId = m._id ? String(m._id) : '';
                const mRef = m.productRef ? String(m.productRef?._id || m.productRef?.id || m.productRef) : '';
                const rawCode = (m.code || '').toLowerCase().trim();
                const normCode = normalizeProductCode(m.code);
                const mName = (m.itemName || m.itemDescription || '').toLowerCase().trim();

                if (mId) {
                    mktMap.set(mId, m);
                    seenIds.add(mId);
                }
                if (mRef) {
                    mktMap.set(mRef, m);
                    seenIds.add(mRef);
                }
                if (rawCode) {
                    mktMap.set(rawCode, m);
                    seenCodes.add(rawCode);
                }
                if (normCode) {
                    mktMap.set(normCode, m);
                    seenCodes.add(normCode);
                }
                if (mName) {
                    seenNames.add(mName);
                }

                const isBundleDoc = Boolean(
                    m.isBundle ||
                    m.category === 'Package Sets' ||
                    m.category === 'Package Set' ||
                    m.navbarTag === 'Package Sets' ||
                    (Array.isArray(m.bundleItems) && m.bundleItems.length > 0)
                );

                if (!isBundleDoc) {
                    if (mId) mktByProductMap.set(mId, m);
                    if (mRef) mktByProductMap.set(mRef, m);
                    if (rawCode) mktByProductMap.set(rawCode, m);
                    if (normCode) mktByProductMap.set(normCode, m);
                    if (mName) mktByProductMap.set(mName, m);
                }
            });

            // 1. Process Marketing Docs first (contains exact prices ₱300, ₱280, ₱250, ₱225)
            for (const mkt of allMarketingDocs) {
                if (!mkt) continue;

                // Exclude if archived or draft in Products Catalog / Package Sets
                if (mkt.isArchived === true || mkt.isPublished === false) {
                    continue;
                }

                const rawCode = (mkt.code || '').toLowerCase().trim();
                const normCode = normalizeProductCode(mkt.code);
                const mRef = mkt.productRef ? String(mkt.productRef?._id || mkt.productRef?.id || mkt.productRef) : '';
                const mName = (mkt.itemName || mkt.itemDescription || '').toLowerCase().trim();

                const matchedInv =
                    (mRef && invMap.get(mRef)) ||
                    (rawCode && invMap.get(rawCode)) ||
                    (normCode && invMap.get(normCode)) ||
                    (mName && invNameMap.get(mName));

                // Exclude if the corresponding Finished Good is archived in Inventory -> Finished Goods
                if (matchedInv && matchedInv.isArchived === true) {
                    continue;
                }

                // If this is a Package Set / Bundle, exclude if any bundled product is archived in Finished Goods or Products Catalog
                if (Array.isArray(mkt.bundleItems) && mkt.bundleItems.length > 0) {
                    const hasArchivedBundleItem = mkt.bundleItems.some((bi) => {
                        if (!bi) return false;
                        const biRef = bi.productRef ? String(bi.productRef?._id || bi.productRef?.id || bi.productRef) : '';
                        const biCode = (bi.code || '').toLowerCase().trim();
                        const biNormCode = normalizeProductCode(bi.code);
                        const biName = (bi.itemName || bi.itemDescription || '').toLowerCase().trim();

                        const biInv =
                            (biRef && invMap.get(biRef)) ||
                            (biCode && invMap.get(biCode)) ||
                            (biNormCode && invMap.get(biNormCode)) ||
                            (biName && invNameMap.get(biName));
                        if (biInv && biInv.isArchived === true) return true;

                        const biMkt =
                            (biRef && mktByProductMap.get(biRef)) ||
                            (biCode && mktByProductMap.get(biCode)) ||
                            (biNormCode && mktByProductMap.get(biNormCode));
                        if (biMkt && (biMkt.isArchived === true || biMkt.isPublished === false)) return true;

                        return false;
                    });

                    if (hasArchivedBundleItem) {
                        continue;
                    }
                }

                const syncedTitle = matchedInv?.itemName || matchedInv?.itemDescription || mkt.itemName || mkt.itemDescription || 'Mhira Natural Product';
                const item = {
                    ...mkt,
                    id: mkt._id,
                    name: syncedTitle,
                    itemName: syncedTitle,
                    itemDescription: syncedTitle,
                    image: mkt.image || (Array.isArray(mkt.images) && mkt.images[0]) || '/mhira_removebg.png',
                    images: Array.isArray(mkt.images) && mkt.images.length > 0 ? mkt.images : [mkt.image || '/mhira_removebg.png'],
                    price: Number(mkt.price) > 0 ? Number(mkt.price) : 200,
                    specification: mkt.specification || matchedInv?.specification || '',
                    uom: mkt.uom || matchedInv?.uom || 'ML',
                    bundleItems: mkt.bundleItems || [],
                    isBundle: Boolean(mkt.isBundle || mkt.category === 'Package Sets' || (mkt.bundleItems && mkt.bundleItems.length > 0)),
                    isArchived: false,
                };
                combined.push(item);
            }

            // 2. Add any additional active inventory products not yet in marketing catalog
            for (const inv of allInventoryDocs) {
                if (!inv || inv.isArchived === true) continue;
                const invCode = (inv.code || '').toLowerCase().trim();
                const normCode = normalizeProductCode(inv.code);
                const invId = String(inv._id);
                const invName = (inv.itemName || inv.itemDescription || '').toLowerCase().trim();
                if (
                    !seenCodes.has(invCode) &&
                    (!normCode || !seenCodes.has(normCode)) &&
                    !seenIds.has(invId) &&
                    (!invName || !seenNames.has(invName))
                ) {
                    const formatted = formatInventoryToStorefront(inv);
                    combined.push(formatted);
                    if (invCode) seenCodes.add(invCode);
                    if (normCode) seenCodes.add(normCode);
                    if (invName) seenNames.add(invName);
                    seenIds.add(invId);
                }
            }

            // Fallback to direct DB query only if Mongoose queries returned nothing at all
            if (allMarketingDocs.length === 0 && allInventoryDocs.length === 0) {
                try {
                    const db = mongoose.connection.db;
                    if (db) {
                        const directProds = await db.collection('products').find({ isArchived: { $ne: true } }).toArray();
                        for (const dp of directProds) {
                            if (!dp.isArchived) {
                                combined.push(formatInventoryToStorefront(dp));
                            }
                        }
                    }
                } catch (e) {}
            }

            cachedPublicProducts = combined;
            lastPublicProductsTime = Date.now();
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

        if (!product || product.isArchived === true || product.isPublished === false) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Verify that neither the Marketing Catalog entry nor the Inventory Finished Good is archived
        if (product.productRef || product.code || product._id) {
            const invOrConds = [];
            const mktOrConds = [];
            if (product.productRef && mongoose.Types.ObjectId.isValid(product.productRef)) {
                invOrConds.push({ _id: product.productRef });
                mktOrConds.push({ productRef: product.productRef });
            }
            if (product._id && mongoose.Types.ObjectId.isValid(product._id)) {
                mktOrConds.push({ productRef: product._id });
            }
            if (product.code) {
                const codeRegex = new RegExp(`^${String(product.code).trim()}$`, 'i');
                invOrConds.push({ code: codeRegex });
                mktOrConds.push({ code: codeRegex });
            }
            if (invOrConds.length > 0) {
                const linkedInv = await Product.findOne({ $or: invOrConds }).lean().catch(() => null);
                if (linkedInv && linkedInv.isArchived === true) {
                    return res.status(404).json({ message: 'Product is archived' });
                }
            }
            if (mktOrConds.length > 0) {
                const linkedMkt = await Collection.findOne({ $or: mktOrConds }).lean().catch(() => null);
                if (linkedMkt && (linkedMkt.isArchived === true || linkedMkt.isPublished === false)) {
                    return res.status(404).json({ message: 'Product is archived or unpublished' });
                }
            }
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

        return res.status(200).json(products || []);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching inventory products', error: error.message });
    }
};

// 5. Create / Add New Catalog Item
export const createCatalogProduct = async (req, res) => {
    try {
        const productData = { ...req.body };

        if (!productData.code || productData.code.trim() === '') {
            const isPackage =
                productData.category === 'Package Sets' ||
                productData.category === 'Package Set' ||
                productData.category === 'Special Bundles' ||
                productData.isBundle === true ||
                (Array.isArray(productData.bundleItems) && productData.bundleItems.length > 0);

            const prefix = isPackage ? 'PKG' : 'FG';
            const allItems = await Collection.find({}, 'code');
            let maxNum = 0;
            allItems.forEach((p) => {
                if (p.code) {
                    const regex = new RegExp(`^(?:${prefix}-?|${prefix})(\\d+)`, 'i');
                    const match = p.code.match(regex);
                    if (match) {
                        const numPart = parseInt(match[1], 10);
                        if (!isNaN(numPart) && numPart > maxNum) {
                            maxNum = numPart;
                        }
                    }
                }
            });
            productData.code = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
        }

        const newProduct = new Collection(productData);
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

// 8. Toggle Archive Status
export const toggleArchiveCatalogProduct = async (req, res) => {
    try {
        const product = await Collection.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Catalog product not found' });
        product.isArchived = !product.isArchived;
        await product.save();
        invalidateProductsCache();
        return res.status(200).json(product);
    } catch (error) {
        return res.status(400).json({ message: 'Error toggling archive status', error: error.message });
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
    deleteCatalogProduct,
    toggleArchiveCatalogProduct
};
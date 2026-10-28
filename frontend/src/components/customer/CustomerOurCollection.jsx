import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios, { API } from "../../axios";
import {
  Star,
  ShoppingBag,
  Search,
  Tag,
  Image as ImageIcon,
  X,
  ShoppingCart,
  Eye,
  Heart,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Droplets,
  Wind,
  Coffee,
  Gift
} from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import HeaderContainer from '../common/HeaderContainer';
import Footer from "../common/Footer";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { subscribeLiveSync } from "../../utils/liveSync";
import { getUserId as importedGetUserId } from "../../utils/userId";
import { safeSetItem } from "../../utils/safeStorage";
import { useAppData } from "../../context/AppDataContext";
import { getStoredCategories } from "../common/MasterCategoryUomModal";

const getUserId = () => {
  try {
    if (typeof importedGetUserId === "function") {
      const id = importedGetUserId();
      if (id) return String(id);
    }
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return u?._id ? String(u._id) : u?.id ? String(u.id) : u?.email ? String(u.email) : "";
  } catch (e) {
    return "";
  }
};

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const API_BASE_URL =
  !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com'
    : 'http://localhost:5000';

const getImageUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    let trimmed = url.trim();
    if (!trimmed || trimmed === "/mhira_removebg.png") return "";
    if (trimmed.includes("localhost:5000")) {
      trimmed = trimmed.replace(/^https?:\/\/localhost:5000\/?/, "");
      return `${API_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("/")) {
        return trimmed;
    }
    return `${API_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
};

const DEFAULT_CATALOG = [
  {
    _id: "6a8ac1208c66e4350e663652",
    id: "6a8ac1208c66e4350e663652",
    code: "FG0001",
    itemDescription: "NIACINAMIDE BODY LOTION",
    itemName: "NIACINAMIDE BODY LOTION",
    category: "Bath & Body",
    navbarTag: "Bath & Body",
    brand: "Mhira Natural",
    price: 225,
    originalPrice: 0,
    isOnSale: false,
    promoBadge: "",
    image: "",
    images: [],
    quantity: 15,
  },
  {
    _id: "6a8ac46335a5ad9e2a53cd67",
    id: "6a8ac46335a5ad9e2a53cd67",
    code: "FG0002",
    itemDescription: "HEALTHY HAIR AND SMOOTH SHINY HAIR",
    itemName: "HEALTHY HAIR AND SMOOTH SHINY HAIR",
    category: "Hair Care",
    navbarTag: "Hair Care",
    brand: "Mhira Natural",
    price: 280,
    originalPrice: 0,
    isOnSale: false,
    promoBadge: "",
    image: "",
    images: [],
    quantity: 20,
  },
  {
    _id: "6a8ac4a435a5ad9e2a53cda8",
    id: "6a8ac4a435a5ad9e2a53cda8",
    code: "FG0003",
    itemDescription: "HEALTHY HAIR AND SMOOTH SHINY HAIR",
    itemName: "HEALTHY HAIR AND SMOOTH SHINY HAIR",
    category: "Hair Care",
    navbarTag: "Hair Care",
    brand: "Mhira Natural",
    price: 250,
    originalPrice: 0,
    isOnSale: false,
    promoBadge: "",
    image: "",
    images: [],
    quantity: 12,
  },
  {
    _id: "6a8ac50035a5ad9e2a53ce29",
    id: "6a8ac50035a5ad9e2a53ce29",
    code: "FG0004",
    itemDescription: "FACE SERUM COLLAGEN",
    itemName: "FACE SERUM COLLAGEN",
    category: "Skin Care",
    navbarTag: "Skin Care",
    brand: "Mhira Natural",
    price: 300,
    originalPrice: 0,
    isOnSale: false,
    promoBadge: "",
    image: "",
    images: [],
    quantity: 18,
  },
];

// Helper to map Lucide icons dynamically for Finished Goods categories
const getCategoryIcon = (categoryName) => {
  const lower = String(categoryName || "").toLowerCase();
  if (lower === "all") return Layers;
  if (
    lower.includes("skin") ||
    lower.includes("face") ||
    lower.includes("serum") ||
    lower.includes("essence") ||
    lower.includes("sun") ||
    lower.includes("spf") ||
    lower.includes("lip") ||
    lower.includes("eye") ||
    lower.includes("cosmetic")
  ) {
    return Sparkles;
  }
  if (
    lower.includes("bath") ||
    lower.includes("body") ||
    lower.includes("lotion") ||
    lower.includes("wash") ||
    lower.includes("soap")
  ) {
    return Droplets;
  }
  if (lower.includes("hair")) return Wind;
  if (
    lower.includes("tea") ||
    lower.includes("beverage") ||
    lower.includes("drink") ||
    lower.includes("coffee")
  ) {
    return Coffee;
  }
  if (
    lower.includes("bundle") ||
    lower.includes("special") ||
    lower.includes("gift") ||
    lower.includes("set")
  ) {
    return Gift;
  }
  return Tag;
};

const matchesCategory = (product, catId) => {
  if (!product) return false;
  if (!catId || catId === "All") return true;
  const target = String(catId).toLowerCase().trim();
  const pCat = String(product.category || "").toLowerCase().trim();
  const pNav = String(product.navbarTag || "").toLowerCase().trim();

  // 1. Exact direct match
  if (pCat === target || pNav === target) return true;

  // 2. Keyword / semantic matching for aliases
  if (target === "special bundles" || target === "bundles") {
    return pCat.includes("bundle") || pNav.includes("bundle") || pCat.includes("special");
  }
  if (target === "beverages & tea" || target === "beverages" || target === "tea") {
    return pCat.includes("tea") || pNav.includes("tea") || pCat.includes("beverage");
  }
  if (target === "skin care" || target === "skincare") {
    return pCat.includes("skin") || pNav.includes("skin") || pCat.includes("face");
  }
  if (target === "bath & body" || target === "bath" || target === "body") {
    return pCat.includes("bath") || pNav.includes("bath") || pCat.includes("body");
  }
  if (target === "hair care" || target === "haircare") {
    return pCat.includes("hair") || pNav.includes("hair");
  }

  // 3. Substring matching
  return pCat.includes(target) || target.includes(pCat) || pNav.includes(target);
};

function OurCollection() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const appData = useAppData();
    const contextFavorites = Array.isArray(appData?.favorites) ? appData.favorites : [];

    const [allProducts, setAllProducts] = useState(() => {
        try {
            const cached = localStorage.getItem("mhira_db_products");
            if (cached && cached !== "undefined" && cached !== "null") {
                const list = JSON.parse(cached);
                if (Array.isArray(list) && list.length > 0) {
                    const valid = list.filter(p => p && typeof p === "object");
                    if (valid.length > 0) return valid;
                }
            }
        } catch (e) {
            console.warn("Failed to parse cached products:", e);
        }
        return DEFAULT_CATALOG;
    });
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("category") || "All");
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
    const [sortBy, setSortBy] = useState("featured");
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    const [categoriesVersion, setCategoriesVersion] = useState(0);
    const [fgCategories, setFgCategories] = useState(() => {
        try {
            const cached = localStorage.getItem('inventory_fg_custom_categories');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return [];
    });
    const sortDropdownRef = useRef(null);

    // Fetch finished goods categories directly from cloud MongoDB database
    const fetchFgCategories = useCallback(async () => {
        try {
            const res = await API.get('/api/inventory-category-uom/finished_goods');
            if (res.data?.success && Array.isArray(res.data.categories)) {
                const cats = res.data.categories;
                localStorage.setItem('inventory_fg_custom_categories', JSON.stringify(cats));
                if (Array.isArray(res.data.uoms)) {
                    localStorage.setItem('inventory_fg_custom_uoms', JSON.stringify(res.data.uoms));
                }
                setFgCategories(cats);
                setCategoriesVersion((v) => v + 1);
            }
        } catch (err) {
            console.warn('Error fetching Finished Goods categories from DB:', err);
        }
    }, []);

    // Dynamic sync with Inventory -> Categories & Units (UOM) -> Finished Goods
    useEffect(() => {
        fetchFgCategories();

        const handleCategorySync = () => {
            fetchFgCategories();
        };
        window.addEventListener("inventory_categories_uom_updated", handleCategorySync);
        window.addEventListener("storage", handleCategorySync);
        window.addEventListener("focus", handleCategorySync);

        return () => {
            window.removeEventListener("inventory_categories_uom_updated", handleCategorySync);
            window.removeEventListener("storage", handleCategorySync);
            window.removeEventListener("focus", handleCategorySync);
        };
    }, [fetchFgCategories]);

    // Close sort dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isProductFavorited = useCallback((product) => {
        if (!product) return false;
        return appData?.isFavorite ? appData.isFavorite(product) : false;
    }, [appData]);

    // Sync URL search params instantly
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        const urlCategory = searchParams.get("category");
        if (urlSearch !== null && urlSearch !== searchQuery) {
            setSearchQuery(urlSearch);
        }
        if (urlCategory !== null && urlCategory !== selectedCategory) {
            setSelectedCategory(urlCategory);
        } else if (urlCategory === null && selectedCategory !== "All") {
            setSelectedCategory("All");
        }
    }, [searchParams]);

    // Product Modal View State
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeImage, setActiveImage] = useState("");

    const fetchPublicProducts = useCallback(async () => {
        try {
            const response = await API.get('/api/collections/public');
            const rawProducts = Array.isArray(response.data) ? response.data : (response.data?.products || response.data?.items || response.data?.data || []);
            const valid = Array.isArray(rawProducts) ? rawProducts.filter(p => p && typeof p === 'object') : [];

            // Filter out Package Sets from retail collection
            const retailProducts = valid.filter(p =>
                p &&
                p.category !== 'Package Sets' &&
                p.category !== 'Package Set' &&
                p.navbarTag !== 'Package Sets'
            );

            const finalList = retailProducts.length > 0 ? retailProducts : (valid.length > 0 ? valid : DEFAULT_CATALOG);
            setAllProducts(finalList);
            try {
                if (finalList.length > 0) {
                    localStorage.setItem("mhira_db_products", JSON.stringify(finalList));
                }
            } catch (e) {}
        } catch (error) {
            console.warn("Error fetching public collection:", error);
            setAllProducts(prev => (prev && prev.length > 0 ? prev : DEFAULT_CATALOG));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPublicProducts();

        const unsubscribe = subscribeLiveSync((event) => {
            fetchPublicProducts();
            if (event?.type === 'inventory' || !event?.type) {
                fetchFgCategories();
            }
        });

        return () => {
            unsubscribe();
        };
    }, [fetchPublicProducts, fetchFgCategories]);

    const handleAddToCart = async (e, product) => {
        if (e) e.stopPropagation();
        if (!product) return;
        const activeUserId = getUserId();
        const token = localStorage.getItem("token");
        if (!activeUserId || !token) {
            showErrorToast("Please log in to your customer account to add items to your cart.");
            navigate("/login");
            return;
        }
        if (product.quantity <= 0) return;
        const productId = String(product._id || product.id || product.code);

        // 1. Update cached_cart_items immediately
        try {
            const stored = localStorage.getItem("cached_cart_items");
            let currentCart = stored ? JSON.parse(stored) : [];
            const idx = currentCart.findIndex(i => String(i.product?._id || i.product?.id || i.product?.code || i.product) === productId);
            if (idx > -1) {
                currentCart[idx].quantity = (Number(currentCart[idx].quantity) || 0) + 1;
            } else {
                currentCart.unshift({ product, quantity: 1 });
            }
            localStorage.setItem("cached_cart_items", JSON.stringify(currentCart));
            localStorage.setItem(`cached_cart_items_${activeUserId}`, JSON.stringify(currentCart));
        } catch (e) {}

        // 2. 0ms INSTANT FEEDBACK
        showSuccessToast(`Added ${product.itemDescription || product.itemName || "product"} to your cart.`);
        window.dispatchEvent(new CustomEvent("itemAddedToBag", { detail: { product, quantity: 1 } }));
        window.dispatchEvent(new Event("cartUpdated"));

        try {
            const res = await axios.post(`${API_BASE_URL}/api/cart/add`, {
                userId: activeUserId,
                productId,
                quantity: 1,
                product,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
                localStorage.setItem("cached_cart_items", JSON.stringify(res.data.items));
                localStorage.setItem(`cached_cart_items_${activeUserId}`, JSON.stringify(res.data.items));
                window.dispatchEvent(new Event("cartUpdated"));
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
        }
    };

    const handleToggleFavorite = async (e, item) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (!item) return;
        const activeUserId = getUserId();
        const token = localStorage.getItem("token");
        if (!activeUserId || !token) {
            showErrorToast("Please log in to your customer account to save favorites.");
            navigate("/login");
            return;
        }
        try {
            const willFavorite = await (appData?.toggleFavorite ? appData.toggleFavorite(item) : false);
            const title = item.itemDescription || item.itemName || item.name || "Product";
            const itemId = String(item._id || item.id || item.code || title);
            showSuccessToast(
                willFavorite ? `Added "${title}" to favorites!` : `Removed "${title}" from favorites`,
                { id: `fav-${itemId}` }
            );
        } catch (error) {
            console.warn("Favorite toggle handler error:", error);
            showSuccessToast("Wishlist updated");
        }
    };

    const getCategoryCount = useCallback((catId) => {
        if (!Array.isArray(allProducts)) return 0;
        if (catId === "All") return allProducts.length;
        return allProducts.filter(p => matchesCategory(p, catId)).length;
    }, [allProducts]);

    const categoryTabs = useMemo(() => {
        const blacklist = new Set([
            'finished goods',
            'finished product',
            'raw materials',
            'rawmat',
            'packaging',
            'supplies',
            'package sets',
            'package set',
            'all'
        ]);

        // 1. Live Finished Goods categories from cloud database or localStorage cache
        const cachedFg = (() => {
            try {
                const raw = localStorage.getItem('inventory_fg_custom_categories');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch (e) {}
            return [];
        })();

        const activeFg = Array.isArray(fgCategories) && fgCategories.length > 0
            ? fgCategories
            : cachedFg;

        const fgList = activeFg.length > 0 ? activeFg : getStoredCategories([], 'finished_goods');

        // 2. Active categories from currently loaded storefront products
        const productCategories = Array.isArray(allProducts)
            ? allProducts.map((p) => (p?.category || '').trim()).filter(Boolean)
            : [];

        // 3. Merge & deduplicate, excluding internal / non-retail categories
        const mergedSet = new Set();
        [...fgList, ...productCategories].forEach((cat) => {
            const clean = String(cat || '').trim();
            if (clean && !blacklist.has(clean.toLowerCase())) {
                mergedSet.add(clean);
            }
        });

        // 4. Sort alphabetically
        const sortedCategories = Array.from(mergedSet).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
        );

        return [
            { id: "All", label: "All Products", icon: Layers },
            ...sortedCategories.map((cat) => ({
                id: cat,
                label: cat,
                icon: getCategoryIcon(cat),
            })),
        ];
    }, [allProducts, fgCategories, categoriesVersion]);

    const handleSelectCategory = (catId) => {
        setSelectedCategory(catId);
        if (catId === "All") {
            navigate(searchQuery ? `/collection?search=${encodeURIComponent(searchQuery)}` : "/collection", { replace: true });
        } else {
            navigate(searchQuery ? `/collection?category=${encodeURIComponent(catId)}&search=${encodeURIComponent(searchQuery)}` : `/collection?category=${encodeURIComponent(catId)}`, { replace: true });
        }
    };

    // Instant Filter & Sort calculation
    const sortedProducts = useMemo(() => {
        const rawList = Array.isArray(allProducts) ? allProducts.filter(p => p && typeof p === 'object') : [];
        let list = [...rawList];

        // Filter by Category
        if (selectedCategory && selectedCategory !== "All") {
            list = list.filter(p => matchesCategory(p, selectedCategory));
        }

        // Filter by Search Query (Product Name Only)
        if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(p => {
                if (!p) return false;
                const name = (p.itemDescription || p.itemName || p.name || p.title || "").toLowerCase();
                return name.includes(q);
            });
        }

        // Sort
        if (sortBy === "price-low-high") {
            return list.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
        }
        if (sortBy === "price-high-low") {
            return list.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
        }
        if (sortBy === "newest") {
            return list.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
        }
        return list; // featured
    }, [allProducts, selectedCategory, searchQuery, sortBy]);

    const handleOpenProduct = (product) => {
        const productId = product._id || product.id;
        navigate(`/product/${productId}`);
    };

    return (
        <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
            <HeaderContainer />

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {/* BREADCRUMB & PAGE TITLE (MATCHES MY ORDERS / FAVORITES) */}
                <div className="mb-8">
                    <nav className="text-xs text-slate-500 mb-3">
                        <Link to="/" className="hover:underline hover:text-[#01390f] transition-colors">Home</Link>
                        <span className="mx-2 text-slate-400">/</span>
                        <span className="text-slate-900 capitalize">
                            {selectedCategory && selectedCategory !== "All" ? selectedCategory : "Our Collection"}
                        </span>
                    </nav>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
                        <h1 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight capitalize">
                            Our Collection {sortedProducts.length > 0 && `(${sortedProducts.length})`}
                        </h1>

                        {/* CONTROLS (HIDE FILTERS + SORT BY) */}
                        <div className="flex items-center gap-6 sm:gap-8">
                            {/* HIDE FILTERS BUTTON */}
                            <button
                                type="button"
                                onClick={() => setShowFilters((prev) => !prev)}
                                className="group flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-900 hover:text-[#01390f] transition-colors cursor-pointer py-1.5 select-none"
                                title={showFilters ? "Hide Filters" : "Show Filters"}
                            >
                                <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
                                <SlidersHorizontal
                                    size={16}
                                    className={`transition-transform duration-300 ease-out group-hover:scale-110 ${
                                        !showFilters ? "rotate-90 text-[#01390f]" : "text-slate-700 group-hover:text-[#01390f]"
                                    }`}
                                />
                            </button>

                            {/* SORT BY DROPDOWN */}
                            <div className="relative" ref={sortDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsSortOpen(!isSortOpen)}
                                    className="group flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-900 hover:text-[#01390f] transition-colors cursor-pointer py-1.5 select-none"
                                >
                                    <span>
                                        Sort By:{" "}
                                        <span className="text-slate-500 font-normal group-hover:text-[#01390f] transition-colors">
                                            {[
                                                { label: "Featured", value: "featured" },
                                                { label: "Newest", value: "newest" },
                                                { label: "Price: High-Low", value: "price-high-low" },
                                                { label: "Price: Low-High", value: "price-low-high" },
                                            ].find((opt) => opt.value === sortBy)?.label || "Featured"}
                                        </span>
                                    </span>
                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform duration-200 ${
                                            isSortOpen ? "rotate-180 text-[#01390f]" : "text-slate-700 group-hover:text-[#01390f]"
                                        }`}
                                    />
                                </button>

                                {isSortOpen && (
                                    <div className="absolute right-0 top-full pt-2 w-48 sm:w-52 z-50 animate-fadeIn">
                                        <div className="bg-[#f7faf8] border border-[#D5EAD7] shadow-xl rounded-2xl overflow-hidden ring-1 ring-black/5 text-[#2D3732] py-1.5">
                                            {[
                                                { label: "Featured", value: "featured" },
                                                { label: "Newest", value: "newest" },
                                                { label: "Price: High-Low", value: "price-high-low" },
                                                { label: "Price: Low-High", value: "price-low-high" },
                                            ].map((opt) => {
                                                const isSelected = sortBy === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setSortBy(opt.value);
                                                            setIsSortOpen(false);
                                                        }}
                                                        className={`w-full px-5 py-2.5 text-xs sm:text-sm text-right transition-colors cursor-pointer block font-semibold ${
                                                            isSelected
                                                                ? "bg-[#EDF7EE] text-[#01390f] font-bold"
                                                                : "text-gray-700 hover:text-gray-950 hover:bg-[#EDF7EE]"
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-start transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
                    {/* ================= LEFT SIDEBAR (CLEAN TEXT-ONLY CATEGORIES WITH SILKY COLLAPSE ANIMATION) ================= */}
                    <aside
                        aria-hidden={!showFilters}
                        className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden flex-shrink-0 ${
                            showFilters
                                ? "max-h-[600px] w-full md:w-56 opacity-100 translate-x-0 mb-6 md:mb-0 md:mr-8 lg:mr-12 pointer-events-auto"
                                : "max-h-0 md:max-h-[600px] w-full md:w-0 opacity-0 -translate-x-6 md:-translate-x-8 mb-0 md:mb-0 md:mr-0 pointer-events-none"
                        }`}
                    >
                        <div className="w-full md:w-56">
                            <nav className="flex md:flex-col overflow-x-auto scrollbar-none gap-5 sm:gap-6 md:gap-0 pb-2 md:pb-0 md:space-y-0.5">
                                {categoryTabs.map((tab) => {
                                    const isActive = selectedCategory === tab.id || (tab.id === "All" && (!selectedCategory || selectedCategory === "All"));

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => handleSelectCategory(tab.id)}
                                            className={`py-1 text-xs sm:text-sm leading-snug transition-colors text-left cursor-pointer shrink-0 md:w-full whitespace-nowrap ${
                                                isActive
                                                    ? "text-[#01390f] font-bold"
                                                    : "text-[#26332E] hover:text-[#01390f] font-normal"
                                            }`}
                                        >
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </aside>

                    {/* ================= RIGHT MAIN CONTENT AREA ================= */}
                    <section className="flex-1 w-full min-w-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
                        {searchQuery && (
                            <div className="flex items-center gap-2 mb-4 text-xs text-[#243746]">
                                <span>Filtered by search: <strong className="text-[#243746]">"{searchQuery}"</strong></span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery("");
                                        navigate(selectedCategory && selectedCategory !== "All" ? `/collection?category=${encodeURIComponent(selectedCategory)}` : "/collection", { replace: true });
                                    }}
                                    className="text-[#01390f] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <X size={12} /> Clear search
                                </button>
                            </div>
                        )}

                        {/* PRODUCT LIST GRID (UNBOXED MINIMALIST MATCHING BLK COSMETICS) */}
                        {loading && sortedProducts.length === 0 ? (
                            <div className={`grid gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-10 animate-pulse transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                                showFilters
                                    ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                    : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                            }`}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                    <div key={n} className="flex flex-col space-y-3">
                                        <div className="aspect-square bg-slate-100 w-full" />
                                        <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                                        <div className="h-4 bg-slate-100 rounded w-1/3" />
                                    </div>
                                ))}
                            </div>
                        ) : sortedProducts.length === 0 ? (
                            <div className="text-center py-20 max-w-md mx-auto">
                                <p className="text-slate-400 italic text-sm mb-4">No product found in this category.</p>
                                <button
                                    type="button"
                                    onClick={() => handleSelectCategory("All")}
                                    className="text-xs font-semibold text-[#01390f] hover:underline cursor-pointer"
                                >
                                    View all products
                                </button>
                            </div>
                        ) : (
                            <div className={`grid gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-10 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                                showFilters
                                    ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                    : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                            }`}>
                                {sortedProducts.map((item, idx) => {
                                    if (!item) return null;
                                    const mainImg = (item.images && item.images[0]) || item.image || "";
                                    const itemId = item._id || item.id || item.code || `prod-${idx}`;
                                    const hasOriginalPrice = Number(item.originalPrice || 0) > Number(item.price || 0);
                                    const title = item.itemDescription || item.itemName || item.name || "Mhira Natural Product";

                                    return (
                                        <div
                                            key={itemId}
                                            onClick={() => handleOpenProduct(item)}
                                            className="cursor-pointer group flex flex-col space-y-2.5 relative transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                        >
                                            {/* IMAGE HOLDER - SQUARE, NO BORDER RADIUS & NO OUTLINE */}
                                            <div className="aspect-square bg-white overflow-hidden relative flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
                                                {getImageUrl(mainImg) ? (
                                                    <img
                                                        src={getImageUrl(mainImg)}
                                                        alt={title}
                                                        onError={(e) => {
                                                             e.currentTarget.style.display = "none";
                                                             const fallbackEl = e.currentTarget.parentElement?.querySelector(".no-img-label");
                                                             if (fallbackEl) fallbackEl.style.display = "flex";
                                                        }}
                                                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : null}
                                                <div
                                                    className={`no-img-label w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-50 select-none ${
                                                        getImageUrl(mainImg) ? "hidden" : "flex"
                                                    }`}
                                                >
                                                    <span className="text-[11px] sm:text-xs font-semibold text-[#243746] uppercase tracking-wider line-clamp-3 leading-snug">
                                                        {title}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-mono">
                                                        {item.category || item.code || ""}
                                                    </span>
                                                </div>

                                                {/* SALE BADGE */}
                                                {(item.isOnSale || item.promoBadge) && (
                                                    <span className="absolute top-2 left-2 bg-[#79A94B] text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                                                        {item.promoBadge || "Sale"}
                                                    </span>
                                                )}
                                            </div>

                                            {/* PRODUCT DETAILS (TITLE & PRICE ONLY) */}
                                            <div className="space-y-1">
                                                <h3 className="text-xs sm:text-sm font-medium text-[#243746] group-hover:text-[#01390f] transition-colors duration-200 line-clamp-2 leading-snug">
                                                    {title}
                                                </h3>
                                                <div className="flex items-center gap-2 pt-0.5">
                                                    <p className="text-xs sm:text-sm font-bold text-[#243746] group-hover:text-[#01390f] transition-colors duration-200">
                                                        ₱{Number(item.price || 0).toFixed(2)}
                                                    </p>
                                                    {item.isOnSale && hasOriginalPrice && (
                                                        <span className="text-xs text-slate-400 line-through font-normal">
                                                            ₱{Number(item.originalPrice).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default OurCollection;
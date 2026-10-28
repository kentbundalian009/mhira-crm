import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Heart, ShoppingBag, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import axios, { API } from "../../axios";

import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { getUserId } from "../../utils/userId";
import { safeSetItem, cleanOldCaches } from "../../utils/safeStorage";
import { useAppData } from "../../context/AppDataContext";
import { maskCustomerName, CustomerTierBadge } from "./CustomerProductReviews";
import { useLiveSync } from "../../utils/liveSync";

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
    marketingDescription: "A brightening and hydrating body lotion infused with Niacinamide to deeply nourish the skin, improve texture, and restore natural glow.",
    image: "",
    images: [],
    quantity: 15,
    rating: 5,
    soldCount: 0,
    isOnSale: false,
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
    marketingDescription: "A revitalizing hair formula with botanical plant extracts that conditions each strand for silky smooth, lustrous, and manageable hair.",
    image: "",
    images: [],
    quantity: 20,
    rating: 5,
    soldCount: 0,
    isOnSale: false,
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
    marketingDescription: "Formulated with pure botanical oils to nurture hair roots and strengthen weak strands, keeping hair shiny and full of life all day.",
    image: "",
    images: [],
    quantity: 12,
    rating: 5,
    soldCount: 0,
    isOnSale: false,
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
    marketingDescription: "Give your skin a boost of hydration and care with Face Serum Collagen. Its lightweight serum formula helps keep skin feeling soft, smooth, and hydrated.",
    image: "",
    images: [],
    quantity: 18,
    rating: 5,
    soldCount: 0,
    isOnSale: false,
  },
];

function CustomerProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(() => {
    try {
      const cached = localStorage.getItem("mhira_db_products");
      const list = cached ? JSON.parse(cached) : DEFAULT_CATALOG;
      const found = list.find(p =>
        String(p._id) === String(id) ||
        String(p.id) === String(id) ||
        String(p.code).toLowerCase() === String(id).toLowerCase() ||
        (p.itemDescription && p.itemDescription.toLowerCase() === decodeURIComponent(id).toLowerCase())
      );
      if (found) return found;
    } catch (e) { }
    return DEFAULT_CATALOG.find(p =>
      String(p._id) === String(id) ||
      String(p.id) === String(id) ||
      String(p.code).toLowerCase() === String(id).toLowerCase() ||
      (p.itemDescription && p.itemDescription.toLowerCase() === decodeURIComponent(id).toLowerCase())
    ) || DEFAULT_CATALOG[0];
  });

  const [loading, setLoading] = useState(false);

  const [activeImage, setActiveImage] = useState(() => {
    try {
      const cached = localStorage.getItem("mhira_db_products");
      const list = cached ? JSON.parse(cached) : DEFAULT_CATALOG;
      const item = list.find(p =>
        String(p._id) === String(id) ||
        String(p.id) === String(id) ||
        String(p.code).toLowerCase() === String(id).toLowerCase()
      ) || DEFAULT_CATALOG[0];
      if (item) {
        const imgs = (item.images && item.images.length > 0) ? item.images : (item.image ? [item.image] : []);
        return imgs[0] || "";
      }
    } catch (e) { }
    return "";
  });

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [addingToCart, setAddingToCart] = useState(false);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);
  const addedTimeoutRef = useRef(null);
  const reviewsTabRef = useRef(null);

  const handleScrollToReviews = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setActiveTab("reviews");
    setTimeout(() => {
      if (reviewsTabRef.current) {
        reviewsTabRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  // Related products (Instant from cache)
  const [relatedProducts, setRelatedProducts] = useState(() => {
    try {
      const cached = localStorage.getItem("mhira_db_products");
      const list = cached ? JSON.parse(cached) : DEFAULT_CATALOG;
      return list.filter(item => String(item._id || item.id) !== String(id)).slice(0, 4);
    } catch (e) { }
    return DEFAULT_CATALOG.filter(item => String(item._id || item.id) !== String(id)).slice(0, 4);
  });

  const appData = useAppData();
  const contextFavorites = Array.isArray(appData?.favorites) ? appData.favorites : [];

  // Wishlist
  const isFavorite = useMemo(() => {
    if (!product && !id) return false;
    return appData?.isFavorite ? appData.isFavorite(product || { _id: id, id, code: id }) : false;
  }, [appData, product, id]);

  // Reviews
  const [reviews, setReviews] = useState([]);

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const API_BASE_URL =
    !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === "production"
      ? "https://mhira-crmsystem.onrender.com"
      : "http://localhost:5000";

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

  const userId = getUserId();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const fetchProductData = async () => {
      // 0ms instant cache lookup
      try {
        const cached = localStorage.getItem("mhira_db_products");
        if (cached) {
          const list = JSON.parse(cached);
          const localItem = list.find(p => String(p._id) === String(id) || String(p.id) === String(id) || p.code === id || String(p._id).toLowerCase() === String(id).toLowerCase());
          if (localItem) {
            setProduct(localItem);
            const imgs = (localItem.images && localItem.images.length > 0) ? localItem.images : (localItem.image ? [localItem.image] : []);
            setActiveImage(imgs[0] || "");
            setLoading(false);
          }
        }
      } catch (e) { }

      try {
        let foundProduct = null;

        // 1. Try fetching by ID
        try {
          const res = await axios.get(`${API_BASE_URL}/api/collections/public/${id}`);
          if (res.data && (res.data._id || res.data.id || res.data.code)) {
            foundProduct = res.data;
          }
        } catch (e) { }

        // 2. Fallback: Search in all public collection items
        if (!foundProduct) {
          try {
            const listRes = await axios.get(`${API_BASE_URL}/api/collections/public`);
            if (Array.isArray(listRes.data)) {
              foundProduct = listRes.data.find(p =>
                String(p._id) === String(id) ||
                String(p.id) === String(id) ||
                p.code === id ||
                String(p._id).toLowerCase() === String(id).toLowerCase()
              );
            }
          } catch (e) { }
        }

        if (!isMounted) return;

        if (foundProduct) {
          setProduct(foundProduct);
          const allImages = (foundProduct.images && foundProduct.images.length > 0)
            ? foundProduct.images
            : (foundProduct.image ? [foundProduct.image] : []);
          setActiveImage(allImages[0] || "");
        }
        setLoading(false);

        // Fetch Related Products & Reviews in parallel in background
        Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/collections/public`),
          axios.get(`${API_BASE_URL}/api/reviews/product/${foundProduct?._id || id}`)
        ]).then(([relatedResult, reviewsResult]) => {
          if (!isMounted) return;
          if (relatedResult.status === "fulfilled" && Array.isArray(relatedResult.value.data)) {
            const filtered = relatedResult.value.data
              .filter(item => String(item._id || item.id) !== String(foundProduct?._id || id))
              .slice(0, 4);
            setRelatedProducts(filtered);
          }
          if (reviewsResult.status === "fulfilled" && Array.isArray(reviewsResult.value.data)) {
            setReviews(reviewsResult.value.data);
          }
        });

      } catch (error) {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    if (id) {
      fetchProductData();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Real-time automatic product stock and review sync without refresh
  useLiveSync(["products", "inventory", "reviews"], async () => {
    if (!id) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/collections/public/${id}`).catch(() => null);
      if (res?.data && (res.data._id || res.data.id || res.data.code)) {
        setProduct((prev) => (prev ? { ...prev, ...res.data } : res.data));
      }
      const reviewsRes = await axios.get(`${API_BASE_URL}/api/reviews/product/${product?._id || id}`).catch(() => null);
      if (Array.isArray(reviewsRes?.data)) {
        setReviews(reviewsRes.data);
      }
    } catch (e) {}
  });

  const handleToggleFavorite = async () => {
    if (!product) return;
    const activeUserId = getUserId();
    const token = localStorage.getItem("token");
    if (!activeUserId || !token) {
      showErrorToast("Please log in to your customer account to save favorites.");
      navigate("/login");
      return;
    }
    try {
      const willFav = await (appData?.toggleFavorite ? appData.toggleFavorite(product) : false);
      const title = product.itemDescription || product.itemName || product.name || "Product";
      const productId = String(product._id || product.id || product.code || title);
      showSuccessToast(
        willFav ? `Added "${title}" to favorites!` : `Removed "${title}" from favorites`,
        { id: `fav-${productId}` }
      );
    } catch (error) {
      console.warn("Favorite toggle error:", error);
      showSuccessToast("Wishlist updated");
    }
  };

  const handleAddToCart = async (goToCart = false) => {
    if (!product) return;
    const activeUserId = getUserId();
    if (!activeUserId) {
      showErrorToast("Please log in to your customer account to add items to your cart.");
      navigate("/login");
      return;
    }
    const productId = String(product._id || product.id || product.code || id);
    const qtyToAdd = Number(quantity) > 0 ? Number(quantity) : 1;

    const formattedProduct = {
      _id: productId,
      id: productId,
      code: product.code || "",
      itemDescription: product.itemDescription || product.itemName || product.name || "Mhira Natural Product",
      itemName: product.itemName || product.itemDescription || product.name || "Mhira Natural Product",
      name: product.name || product.itemDescription || product.itemName || "Mhira Natural Product",
      price: Number(product.price) > 0 ? Number(product.price) : 200,
      originalPrice: product.originalPrice || 0,
      image: (product.images && product.images[0]) || product.image || "",
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : (product.image ? [product.image] : []),
      category: product.category || product.navbarTag || "Skin Care",
      navbarTag: product.navbarTag || product.category || "Skin Care",
      quantity: typeof product.quantity === "number" ? product.quantity : 10
    };

    // 1. Update cached_cart_items immediately for 0ms instant bag rendering
    try {
      const stored = localStorage.getItem("cached_cart_items");
      let currentCart = stored ? JSON.parse(stored) : [];
      const idx = currentCart.findIndex(i => {
        const pId = String(i.product?._id || i.product?.id || i.product?.code || i.product);
        return pId === productId;
      });
      if (idx > -1) {
        currentCart[idx].quantity = (Number(currentCart[idx].quantity) || 0) + qtyToAdd;
      } else {
        currentCart.push({ product: formattedProduct, quantity: qtyToAdd });
      }
      safeSetItem("cached_cart_items", currentCart);
      if (activeUserId) safeSetItem(`cached_cart_items_${activeUserId}`, currentCart);
    } catch (e) { }

    // 2. 0ms INSTANT FEEDBACK (Does not block consecutive clicks)
    setIsAddedSuccess(true);
    if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
    addedTimeoutRef.current = setTimeout(() => {
      setIsAddedSuccess(false);
    }, 1800);

    showSuccessToast(`Added ${qtyToAdd}x ${formattedProduct.itemDescription} to cart!`);
    window.dispatchEvent(new CustomEvent("itemAddedToBag", { detail: { product: formattedProduct, quantity: qtyToAdd } }));
    window.dispatchEvent(new Event("cartUpdated"));

    console.log("[PRODUCT_DETAIL] Adding to cart:", { activeUserId, productId, qtyToAdd, formattedProduct });

    try {
      setAddingToCart(true);
      const res = await axios.post(`${API_BASE_URL}/api/cart/add`, {
        userId: activeUserId,
        productId,
        quantity: qtyToAdd,
        product: formattedProduct
      });
      console.log("[PRODUCT_DETAIL] Add to cart response:", res.data);
      if (res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
        safeSetItem("cached_cart_items", res.data.items);
        if (activeUserId) safeSetItem(`cached_cart_items_${activeUserId}`, res.data.items);
        window.dispatchEvent(new Event("cartUpdated"));
      }
    } catch (error) {
      console.error("[PRODUCT_DETAIL] Error adding to cart:", error);
    } finally {
      setAddingToCart(false);
      if (goToCart) {
        navigate("/cart");
      }
    }
  };

  const handleQuantityChange = (delta) => {
    setQuantity(prev => {
      const max = product ? Math.max(1, product.quantity || 99) : 99;
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > max) return max;
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
        <HeaderContainer />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="aspect-square bg-gray-100 rounded-2xl w-full" />
            <div className="space-y-4">
              <div className="h-4 bg-gray-100 rounded w-24" />
              <div className="h-8 bg-gray-100 rounded w-3/4" />
              <div className="h-6 bg-gray-100 rounded w-1/4" />
              <div className="h-20 bg-gray-100 rounded w-full mt-6" />
              <div className="h-12 bg-gray-100 rounded w-full mt-6" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif]">
        <HeaderContainer />
        <div className="flex-1 max-w-lg mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-normal text-slate-800 mb-2">Product Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">
            The item you are looking for does not exist or has been removed.
          </p>
          <Link
            to="/collection"
            className="inline-block bg-slate-900 text-white text-xs font-semibold py-3 px-6 uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            Back to Collection
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isOutOfStock = product.quantity <= 0;
  const productImages = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.filter(Boolean);
    }
    if (product.image) return [product.image];
    return [];
  }, [product]);

  // Infinite 10-second auto-slide for product images
  useEffect(() => {
    if (!productImages || productImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImage((prev) => {
        const idx = productImages.findIndex((img) => img === prev);
        const nextIdx = idx === -1 ? 0 : (idx + 1) % productImages.length;
        return productImages[nextIdx];
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [productImages]);

  const handlePrevImage = (e) => {
    if (e) e.stopPropagation();
    if (!productImages || productImages.length <= 1) return;
    setActiveImage((prev) => {
      const idx = productImages.findIndex((img) => img === prev);
      const prevIdx = idx === -1 ? 0 : (idx - 1 + productImages.length) % productImages.length;
      return productImages[prevIdx];
    });
  };

  const handleNextImage = (e) => {
    if (e) e.stopPropagation();
    if (!productImages || productImages.length <= 1) return;
    setActiveImage((prev) => {
      const idx = productImages.findIndex((img) => img === prev);
      const nextIdx = idx === -1 ? 0 : (idx + 1) % productImages.length;
      return productImages[nextIdx];
    });
  };

  const hasOriginalPrice = Number(product.originalPrice) > Number(product.price);
  const discountPercent = hasOriginalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const displayCategory = product.category || product.navbarTag || "Fresh";

  const displayRating = (() => {
    if (reviews && reviews.length > 0) {
      const validReviews = reviews.filter((r) => r.rating !== undefined && r.rating !== null && !isNaN(Number(r.rating)));
      if (validReviews.length > 0) {
        const total = validReviews.reduce((sum, r) => sum + Number(r.rating), 0);
        return (total / validReviews.length).toFixed(1);
      }
    }
    const r = Number(product.rating);
    if (!isNaN(r) && r > 0) return r.toFixed(1);
    return "0.0";
  })();

  const formattedSoldCount = (() => {
    const raw = Number(product.soldCount) || 0;
    if (raw >= 1000) {
      return `${(raw / 1000).toFixed(1).replace(/\.0$/, "")}k sold`;
    }
    return `${raw} sold`;
  })();

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* TWO COLUMN PRODUCT DETAILS SECTION (NO OUTER CONTAINER CARD) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14 items-start">

          {/* LEFT: PRODUCT IMAGE GALLERY */}
          <div className="md:col-span-6 space-y-4">
            {/* MAIN IMAGE (NO BORDER RADIUS, NO OUTLINE, WITH LEFT/RIGHT NAVIGATION) */}
            <div className="relative w-full aspect-square bg-slate-50 overflow-hidden flex items-center justify-center select-none group">
              {getImageUrl(activeImage) ? (
                <img
                  src={getImageUrl(activeImage)}
                  alt={product.itemDescription || product.itemName}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallbackEl = e.currentTarget.parentElement.querySelector(".no-img-label");
                    if (fallbackEl) fallbackEl.style.display = "flex";
                  }}
                  className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                />
              ) : null}
              <div
                className={`no-img-label w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 select-none ${getImageUrl(activeImage) ? "hidden" : "flex"
                  }`}
              >
                <span className="text-base sm:text-lg font-semibold text-slate-700 uppercase tracking-wider line-clamp-3 leading-snug">
                  {product.itemDescription || product.itemName || "Item"}
                </span>
                <span className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-mono">
                  {product.category || product.code || ""}
                </span>
              </div>

              {/* PROMO / FREE GIFT CIRCULAR BADGE IF PRESENT */}
              {product.promoBadge ? (
                <div className="absolute top-5 left-5 w-20 h-20 rounded-full bg-[#d85c5c] text-white flex flex-col items-center justify-center text-center p-2 shadow-sm text-xs font-bold leading-tight z-10">
                  {product.promoBadge}
                </div>
              ) : product.isOnSale && discountPercent > 0 ? (
                <div className="absolute top-5 left-5 w-16 h-16 rounded-full bg-[#d85c5c] text-white flex flex-col items-center justify-center text-center p-1 text-[11px] font-bold leading-tight z-10">
                  <span>SAVE</span>
                  <span className="text-xs">{discountPercent}%</span>
                </div>
              ) : null}

              {/* LEFT & RIGHT NAVIGATION BUTTONS (TRANSPARENT, INFINITE 10-SEC AUTO-SLIDE) */}
              {productImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-transparent text-slate-800 hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer z-10 hover:scale-110 active:scale-90"
                    aria-label="Previous Image"
                    title="Previous Image"
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-transparent text-slate-800 hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer z-10 hover:scale-110 active:scale-90"
                    aria-label="Next Image"
                    title="Next Image"
                  >
                    <ChevronRight size={32} />
                  </button>
                </>
              )}
            </div>

            {/* THUMBNAILS (CLEAN #01390f OUTLINE ONLY, NO SHADOW ON SELECTED) */}
            {productImages.length > 1 && (
              <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
                {productImages.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-none shrink-0 transition-all cursor-pointer shadow-none ring-0 outline-none ${
                      activeImage === img
                        ? "border-2 border-[#01390f] opacity-100"
                        : "border border-gray-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={getImageUrl(img)} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover rounded-none" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: PRODUCT INFO & PURCHASE CONTROLS */}
          <div className="md:col-span-6 flex flex-col space-y-4 pt-1">

            {/* BREADCRUMB */}
            <div className="text-xs text-slate-500 tracking-normal flex flex-wrap items-center gap-1.5">
              <Link to="/" className="hover:underline">Home</Link>
              <span>/</span>
              <Link to={`/collection?category=${encodeURIComponent(displayCategory)}`} className="hover:underline">
                {displayCategory}
              </Link>
              <span>/</span>
              <span className="text-[#243746]">{product.itemDescription}</span>
            </div>

            {/* PRODUCT TITLE */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-normal text-[#243746] leading-tight">
              {product.itemDescription}
            </h1>

            {/* PRICING (ON TOP) */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                ₱{Number(product.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>

              {product.isOnSale && hasOriginalPrice && (
                <span className="text-base sm:text-lg text-slate-400 line-through">
                  ₱{Number(product.originalPrice).toFixed(2)}
                </span>
              )}

              {product.isOnSale && discountPercent > 0 && (
                <span className="bg-[#f87171] text-white text-[11px] font-semibold px-2 py-0.5 rounded-sm">
                  Sale • Save {discountPercent}%
                </span>
              )}
            </div>

            {/* RATINGS & SOLD COUNT (BELOW THE PRICE) */}
            <div className="flex items-center gap-2 text-xs text-slate-600 pt-0.5">
              <button
                type="button"
                onClick={handleScrollToReviews}
                className="flex items-center gap-1 font-bold text-slate-800 hover:text-[#01390f] transition-colors cursor-pointer group"
                title="View product ratings and reviews"
              >
                <span className="text-amber-500 text-sm leading-none group-hover:scale-110 transition-transform">★</span>
                <span className="group-hover:underline">{displayRating}</span>
              </button>
              <span className="text-slate-300 font-normal">|</span>
              <button
                type="button"
                onClick={handleScrollToReviews}
                className="text-slate-500 hover:text-[#01390f] hover:underline font-medium transition-colors cursor-pointer"
                title="View customer reviews and purchases"
              >
                {formattedSoldCount}
              </button>
              {reviews.length > 0 && (
                <button
                  type="button"
                  onClick={handleScrollToReviews}
                  className="text-slate-500 hover:text-[#01390f] hover:underline font-normal ml-0.5 cursor-pointer"
                  title="View customer reviews"
                >
                  ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </button>
              )}
            </div>

            {/* OUT OF STOCK BADGE ONLY (NO 'ITEM IS IN STOCK' TEXT) */}
            {isOutOfStock && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-[#dc2626] flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#dc2626] inline-block" />
                  Item is out of stock
                </span>
              </div>
            )}

            {/* QUANTITY PICKER */}
            {!isOutOfStock && (
              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs text-slate-600">Quantity</span>
                <div className="inline-flex items-center border border-slate-300 bg-white">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-xs font-semibold text-slate-900 min-w-[32px] text-center select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (product.quantity || 99)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS (ADD TO FAVORITES & ADD TO CART - MATCHES REJECT ALL / ACCEPT ALL UI) */}
            <div className="pt-3 space-y-2.5">
              {!isOutOfStock ? (
                <>
                  {/* ADD TO CART (MATCHES 'ACCEPT ALL' UI) */}
                  <button
                    type="button"
                    onClick={() => handleAddToCart(false)}
                    className="w-full py-2.5 sm:py-3 px-4 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isAddedSuccess ? (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Added to Cart (+{quantity})</span>
                      </>
                    ) : (
                      <span>Add to Cart</span>
                    )}
                  </button>

                  {/* FAVORITE BUTTON (MATCHES 'REJECT ALL' UI: SAME BG, SAME TEXT, ONLY HEART LOGO TURNS ROSE-600) */}
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className="w-full py-2.5 sm:py-3 px-4 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 border border-[#d5ead7]"
                  >

                    <span>Favorited</span>
                    <Heart
                      className={`w-4 h-4 transition-colors ${isFavorite
                          ? "fill-rose-600 stroke-rose-600 text-rose-600"
                          : "stroke-current fill-none text-[#01390f]"
                        }`}
                    />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className="w-full py-2.5 sm:py-3 px-4 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 border border-[#d5ead7]"
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${isFavorite
                          ? "fill-rose-600 stroke-rose-600 text-rose-600"
                          : "stroke-current fill-none text-[#01390f]"
                        }`}
                    />
                    <span>Favorited</span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="w-full bg-[#f4ebe1] text-[#9b8577] py-2.5 sm:py-3 px-4 rounded-full text-[12px] font-semibold uppercase tracking-wider cursor-not-allowed text-center"
                  >
                    SOLD OUT - NOTIFY ME WHEN AVAILABLE
                  </button>
                </>
              )}
            </div>

            {/* TABS / SECTIONS (ACTIVE TEXT COLOR IS #01390f) */}
            <div ref={reviewsTabRef} id="product-reviews-section" className="pt-6 border-t border-[#E1E9EF] text-xs sm:text-sm text-slate-600 leading-relaxed scroll-mt-24">
              <div className="flex gap-6 border-b border-[#E1E9EF] text-xs font-semibold overflow-x-auto no-scrollbar scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab("description")}
                  className={`pb-2.5 cursor-pointer transition-colors whitespace-nowrap border-b-2 ${activeTab === "description"
                      ? "text-[#01390f] font-bold border-[#01390f]"
                      : "text-slate-400 hover:text-[#01390f] font-medium border-transparent"
                    }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("shipping")}
                  className={`pb-2.5 cursor-pointer transition-colors whitespace-nowrap border-b-2 ${activeTab === "shipping"
                      ? "text-[#01390f] font-bold border-[#01390f]"
                      : "text-slate-400 hover:text-[#01390f] font-medium border-transparent"
                    }`}
                >
                  Shipping & Returns
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("reviews")}
                  className={`pb-2.5 cursor-pointer transition-colors whitespace-nowrap border-b-2 ${activeTab === "reviews"
                      ? "text-[#01390f] font-bold border-[#01390f]"
                      : "text-slate-400 hover:text-[#01390f] font-medium border-transparent"
                    }`}
                >
                  Reviews ({reviews.length})
                </button>
              </div>

              <div className="pt-4 text-xs text-slate-600 leading-relaxed">
                {activeTab === "description" && (
                  <div className="space-y-2 whitespace-pre-line">
                    {product.marketingDescription ? (
                      <p>{product.marketingDescription}</p>
                    ) : (
                      <>
                        <p>• Suitable for daily skincare and all skin types.</p>
                        <p>• Formulated without harsh sulfates, artificial parabens, or synthetic dyes.</p>
                        <p>• Proudly made with locally sourced organic botanical ingredients.</p>
                      </>
                    )}
                  </div>
                )}

                {activeTab === "shipping" && (
                  <div className="space-y-2 whitespace-pre-line">
                    {product.shippingReturns ? (
                      <p>{product.shippingReturns}</p>
                    ) : (
                      <>
                        <p><strong>Metro Manila:</strong> 1-3 Business Days</p>
                        <p><strong>Provincial / Nationwide:</strong> 3-7 Business Days</p>
                        <p><strong>Returns:</strong> 7-day replacement guarantee for damaged or defective items upon delivery.</p>
                      </>
                    )}
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div className="space-y-4 pt-1">
                    {reviews.length === 0 ? (
                      <p className="text-slate-400 text-xs italic py-2">
                        No reviews yet for this product.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {reviews.slice(0, 3).map((rev, index) => (
                          <div key={rev._id || index} className="pb-3 border-b border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs">
                                  {maskCustomerName(rev.userName || "Verified Buyer", rev.isAnonymous)}
                                </span>
                                <CustomerTierBadge tier={rev.userTier} badge={rev.userBadge} />
                                {rev.verifiedPurchase !== false && (
                                  <span className="text-[10px] bg-[#EAF3E4] text-[#79A94B] font-semibold px-1.5 py-0.2 rounded border border-[#79A94B]/40">
                                    Verified Purchase
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center text-amber-500 text-xs">
                                {"★".repeat(Math.min(5, Math.max(1, rev.rating || 5)))}
                                {"☆".repeat(5 - Math.min(5, Math.max(1, rev.rating || 5)))}
                              </div>
                            </div>
                            <p className="text-slate-600 text-xs leading-relaxed">{rev.comment}</p>
                            {rev.createdAt && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        ))}

                        {/* LALABAS LANG ANG SEE MORE PAG MAY TATLONG REVIEW NA (reviews.length >= 3) */}
                        {reviews.length >= 3 && (
                          <div className="pt-2">
                            <Link
                              to={`/product/${product?._id || id}/reviews`}
                              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors cursor-pointer group"
                            >
                              <span>See more Reviews ({reviews.length})</span>
                              <span className="group-hover:translate-x-0.5 transition-transform no-underline">→</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 pt-10 border-t border-[#E1E9EF]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-normal text-[#243746]">You may also like</h2>
              <Link to="/collection" className="text-xs text-slate-500 hover:text-[#01390f] hover:underline">
                View all
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((item) => {
                const img = (item.images && item.images[0]) || item.image;
                const title = item.itemDescription || item.itemName || item.name || "Mhira Natural Product";
                const hasOriginalPrice = Number(item.originalPrice || 0) > Number(item.price || 0);
                return (
                  <div
                    key={item._id || item.id}
                    onClick={() => navigate(`/product/${item._id || item.id}`)}
                    className="cursor-pointer group flex flex-col space-y-2.5 relative"
                  >
                    {/* IMAGE HOLDER - MATCHING COLLECTION UI (SQUARE, NO BORDER RADIUS, NO OUTLINE) */}
                    <div className="aspect-square bg-white overflow-hidden relative flex items-center justify-center">
                      {img && getImageUrl(img) ? (
                        <img
                          src={getImageUrl(img)}
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
                          img && getImageUrl(img) ? "hidden" : "flex"
                        }`}
                      >
                        <span className="text-[11px] sm:text-xs font-semibold text-[#243746] uppercase tracking-wider line-clamp-3 leading-snug">
                          {title}
                        </span>
                      </div>
                      {(item.isOnSale || item.promoBadge) && (
                        <span className="absolute top-2 left-2 bg-[#79A94B] text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                          {item.promoBadge || "Sale"}
                        </span>
                      )}
                    </div>

                    {/* PRODUCT DETAILS (TITLE & PRICE ONLY) */}
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-medium text-[#243746] group-hover:text-[#01390f] transition-colors duration-200 line-clamp-2 leading-snug">
                        {title}
                      </h4>
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
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

export default CustomerProductDetail;

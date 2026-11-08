import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios, { API } from "../../axios";
import {
  SlidersHorizontal,
  ChevronDown,
  Heart,
  X,
  Package
} from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { subscribeLiveSync } from "../../utils/liveSync";
import { getUserId as importedGetUserId } from "../../utils/userId";
import { useAppData } from "../../context/AppDataContext";

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

function CustomerPackageSet() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = getUserId();
  const appData = useAppData();
  const contextFavorites = Array.isArray(appData?.favorites) ? appData.favorites : [];

  const [allPackages, setAllPackages] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_package_sets");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("category") || "All");
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState("featured");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  const favoriteProductIds = useMemo(() => {
    return contextFavorites
      .filter(Boolean)
      .map((i) => String(i?.productId || i?.product?._id || i?.product?.id || i?.product?.code || i?.product || ""))
      .filter(Boolean);
  }, [contextFavorites]);

  // Click outside to close sort dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Package Sets from API
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/collections/public`);
      const allItems = Array.isArray(res.data) ? res.data : [];

      const packageItems = allItems.filter(
        (item) =>
          item.isBundle === true ||
          item.category === "Package Sets" ||
          item.category === "Package Set" ||
          item.navbarTag === "Package Sets" ||
          item.category === "Special Bundles" ||
          (Array.isArray(item.bundleItems) && item.bundleItems.length > 0)
      );

      setAllPackages(packageItems);
      try {
        localStorage.setItem("cached_package_sets", JSON.stringify(packageItems));
      } catch (e) { }
    } catch (e) {
      console.error("Error fetching package sets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();

    const unsubscribe = subscribeLiveSync(() => {
      fetchPackages();
    });

    const handleFocus = () => fetchPackages();
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Sync URL search params
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch !== null && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
    const urlCat = searchParams.get("category");
    if (urlCat !== null && urlCat !== selectedCategory) {
      setSelectedCategory(urlCat);
    }
  }, [searchParams]);

  const handleToggleFavorite = async (e, product) => {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    const activeUserId = getUserId();
    const token = localStorage.getItem("token");
    if (!activeUserId || !token) {
      showErrorToast("Please log in to your customer account to save favorites.");
      navigate("/login");
      return;
    }

    try {
      const willFav = await (appData?.toggleFavorite ? appData.toggleFavorite(product) : false);
      const title = product.itemName || product.itemDescription || product.name || "Package Set";
      showSuccessToast(willFav ? `Added "${title}" to favorites!` : `Removed "${title}" from favorites`);
    } catch (error) {
      console.warn("Favorite toggle error:", error);
      showSuccessToast("Wishlist updated");
    }
  };

  // Distinct categories / bundle types for left sidebar
  const categoryTabs = useMemo(() => {
    const set = new Set();
    allPackages.forEach((p) => {
      if (p.promoBadge && p.promoBadge.trim()) {
        set.add(p.promoBadge.trim());
      }
      if (p.category && p.category !== "Package Sets" && p.category !== "All") {
        set.add(p.category.trim());
      }
    });

    const list = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [
      { id: "All", label: "All Sets" },
      ...list.map((c) => ({ id: c, label: c })),
    ];
  }, [allPackages]);

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    if (catId === "All") {
      navigate(searchQuery ? `/packages?search=${encodeURIComponent(searchQuery)}` : "/packages", { replace: true });
    } else {
      navigate(searchQuery ? `/packages?category=${encodeURIComponent(catId)}&search=${encodeURIComponent(searchQuery)}` : `/packages?category=${encodeURIComponent(catId)}`, { replace: true });
    }
  };

  // Filter & Sort calculation
  const sortedPackages = useMemo(() => {
    let list = [...allPackages];

    // Filter by Category / Promo Badge
    if (selectedCategory && selectedCategory !== "All") {
      const qCat = selectedCategory.toLowerCase();
      list = list.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        const badge = (p.promoBadge || "").toLowerCase();
        return cat === qCat || badge === qCat;
      });
    }

    // Filter by Search Query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const name = (p.itemDescription || p.itemName || p.name || p.title || "").toLowerCase();
        const code = (p.code || "").toLowerCase();
        const hasBundled = Array.isArray(p.bundleItems) && p.bundleItems.some((bi) => {
          return (bi.itemName || "").toLowerCase().includes(q) || (bi.code || "").toLowerCase().includes(q);
        });
        return name.includes(q) || code.includes(q) || hasBundled;
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
  }, [allPackages, selectedCategory, searchQuery, sortBy]);

  const handleOpenProduct = (product) => {
    const productId = product._id || product.id || product.code;
    navigate(`/product/${productId}`);
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* BREADCRUMB & PAGE TITLE (MATCHES OUR COLLECTION / MY ORDERS) */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3">
            <Link to="/" className="hover:underline hover:text-[#01390f] transition-colors">Home</Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-900 capitalize">
              {selectedCategory && selectedCategory !== "All" ? selectedCategory : "Package Sets"}
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
            <h1 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight capitalize">
              Package Sets
            </h1>

            {/* CONTROLS (HIDE FILTERS + SORT BY - IDENTICAL TO OUR COLLECTION) */}
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
                  className={`transition-transform duration-300 ease-out group-hover:scale-110 ${!showFilters ? "rotate-90 text-[#01390f]" : "text-slate-700 group-hover:text-[#01390f]"
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
                    className={`transition-transform duration-200 ${isSortOpen ? "rotate-180 text-[#01390f]" : "text-slate-700 group-hover:text-[#01390f]"
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
                            className={`w-full px-5 py-2.5 text-xs sm:text-sm text-right transition-colors cursor-pointer block font-semibold ${isSelected
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

        {/* 2-COLUMN LAYOUT: CATEGORY SIDEBAR + PRODUCTS GRID */}
        <div className="flex flex-col md:flex-row items-start transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
          {/* ================= LEFT SIDEBAR (CLEAN TEXT-ONLY CATEGORIES WITH SILKY COLLAPSE ANIMATION) ================= */}
          <aside
            aria-hidden={!showFilters}
            className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden flex-shrink-0 ${showFilters
              ? "max-h-[600px] w-full md:w-56 opacity-100 translate-x-0 mb-6 md:mb-0 md:mr-8 lg:mr-12 pointer-events-auto"
              : "max-h-0 md:max-h-[600px] w-full md:w-0 opacity-0 -translate-x-6 md:-translate-x-8 mb-0 md:mb-0 md:mr-0 pointer-events-none"
              }`}
          >
            <div className="w-full md:w-56">
              <nav className="flex md:flex-col overflow-x-auto scrollbar-none gap-5 sm:gap-6 md:gap-0 pb-2 md:pb-0 md:space-y-0.5">
                {categoryTabs.map((tab) => {
                  const isActive =
                    selectedCategory === tab.id ||
                    (tab.id === "All" && (!selectedCategory || selectedCategory === "All"));

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectCategory(tab.id)}
                      className={`py-1 text-xs sm:text-sm leading-snug transition-colors text-left cursor-pointer shrink-0 md:w-full whitespace-nowrap ${isActive
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
                <span>
                  Filtered by search: <strong className="text-[#243746]">&ldquo;{searchQuery}&rdquo;</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    navigate(selectedCategory && selectedCategory !== "All" ? `/packages?category=${encodeURIComponent(selectedCategory)}` : "/packages", { replace: true });
                  }}
                  className="text-[#01390f] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X size={12} /> Clear search
                </button>
              </div>
            )}

            {/* PRODUCT LIST GRID (UNBOXED MINIMALIST MATCHING BLK COSMETICS & OUR COLLECTION) */}
            {loading && sortedPackages.length === 0 ? (
              <div
                className={`grid gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-10 animate-pulse transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${showFilters
                  ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                  }`}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="flex flex-col space-y-3">
                    <div className="aspect-square bg-slate-100 w-full" />
                    <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : sortedPackages.length === 0 ? (
              <div className="text-center py-20 max-w-md mx-auto">
                <p className="text-slate-400 italic text-sm mb-4">No package sets found in this selection.</p>
                <button
                  type="button"
                  onClick={() => handleSelectCategory("All")}
                  className="text-xs font-semibold text-[#01390f] hover:underline cursor-pointer"
                >
                  View all package sets
                </button>
              </div>
            ) : (
              <div
                className={`grid gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-10 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${showFilters
                  ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                  }`}
              >
                {sortedPackages.map((item, idx) => {
                  if (!item) return null;
                  const mainImg = (item.images && item.images[0]) || item.image || "";
                  const itemId = item._id || item.id || item.code || `pkg-${idx}`;
                  const hasOriginalPrice = Number(item.originalPrice || 0) > Number(item.price || 0);
                  const title = item.itemName || item.itemDescription || item.name || "Mhira Package Set";
                  const isFav = favoriteProductIds.includes(String(itemId));

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
                          className={`no-img-label w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-50 select-none ${getImageUrl(mainImg) ? "hidden" : "flex"
                            }`}
                        >
                          <span className="text-[11px] sm:text-xs font-semibold text-[#243746] uppercase tracking-wider line-clamp-3 leading-snug">
                            {title}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-mono">
                            {item.code || "Bundle"}
                          </span>
                        </div>

                        {/* VALUE SET / PROMO BADGE (MATCHES OUR COLLECTION GREEN BADGE) */}
                        <span className="absolute top-2 left-2 bg-[#79A94B] text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                          {item.promoBadge || "Bundle"}
                        </span>

                        {/* WISHLIST BUTTON */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, item)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow-xs border border-[#E1E9EF] flex items-center justify-center hover:bg-white transition-all cursor-pointer"
                          title={isFav ? "Remove from Wishlist" : "Add to Wishlist"}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-colors ${isFav
                              ? "fill-rose-500 stroke-rose-500"
                              : "stroke-[#243746] hover:stroke-rose-500"
                              }`}
                          />
                        </button>
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
                          {hasOriginalPrice && (
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

export default CustomerPackageSet;

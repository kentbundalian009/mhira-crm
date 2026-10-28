import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, ShoppingBag, Heart, ChevronDown } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios, { API, getImageUrl } from "../../axios";

import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { subscribeLiveSync } from "../../utils/liveSync";
import { getUserId } from "../../utils/userId";
import { useAppData } from "../../context/AppDataContext";

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
  const favoriteProductIds = useMemo(() => {
    return contextFavorites
      .filter(Boolean)
      .map(i => String(i?.productId || i?.product?._id || i?.product?.id || i?.product?.code || i?.product || ""))
      .filter(Boolean);
  }, [contextFavorites]);

  const [sortBy, setSortBy] = useState("featured");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const API_BASE_URL = import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com'
    : 'http://localhost:5000';

  // Fetch User Favorites
  const fetchUserFavorites = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/favorites/${userId}`);
      if (res.data && Array.isArray(res.data.items)) {
        const ids = res.data.items.map(i => String(i.product?._id || i.product?.id || i.product?.code || i.product)).filter(Boolean);
        setFavoriteProductIds(ids);
      }
    } catch (e) {
      console.error("Error fetching favorites:", e);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/collections/public`);
      const allItems = Array.isArray(res.data) ? res.data : [];

      // Filter only Package Sets / Bundles
      const packageItems = allItems.filter(item =>
        item.category === 'Package Sets' ||
        item.category === 'Package Set' ||
        item.navbarTag === 'Package Sets' ||
        item.category === 'Special Bundles'
      );

      setAllPackages(packageItems);
      try {
        localStorage.setItem("cached_package_sets", JSON.stringify(packageItems));
      } catch (e) {}
    } catch (e) {
      console.error("Error fetching package sets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserFavorites();
    window.addEventListener("favoritesUpdated", fetchUserFavorites);
    return () => window.removeEventListener("favoritesUpdated", fetchUserFavorites);
  }, [userId]);

  // Sync URL search params
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch !== null && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

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

  const handleToggleFavorite = async (e, product) => {
    e.stopPropagation();
    const activeUserId = getUserId();
    const token = localStorage.getItem("token");
    if (!activeUserId || !token) {
      showErrorToast("Please log in to your customer account to save favorites.");
      navigate("/login");
      return;
    }

    try {
      const willFav = await (appData?.toggleFavorite ? appData.toggleFavorite(product) : false);
      showSuccessToast(willFav ? "Saved to wishlist" : "Removed from wishlist");
    } catch (error) {
      console.warn("Favorite toggle error:", error);
      showSuccessToast("Wishlist updated");
    }
  };

  const sortedPackages = useMemo(() => {
    let list = [...allPackages];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => {
        const name = (p.itemDescription || p.itemName || p.name || p.title || "").toLowerCase();
        return name.includes(q);
      });
    }

    if (sortBy === "price-low-high") {
      return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (sortBy === "price-high-low") {
      return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }
    if (sortBy === "newest") {
      return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list; // featured
  }, [allPackages, searchQuery, sortBy]);

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* BREADCRUMB & PAGE TITLE (BLK COSMETICS / NIKE STYLE) */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-[#243746] font-medium">Package Sets</span>
          </nav>

          <div className="flex items-center justify-between border-b border-[#E1E9EF] pb-4">
            <h1 className="text-xl sm:text-2xl font-normal text-[#243746] tracking-tight">
              Package Sets
            </h1>

            {/* NIKE-STYLE SORT BY DROPDOWN */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors cursor-pointer py-1 select-none"
              >
                <span>Sort By</span>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isSortOpen ? "rotate-180" : ""}`} />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-40 animate-fadeIn">
                  {[
                    { label: "Featured", value: "featured" },
                    { label: "Newest", value: "newest" },
                    { label: "Price: High-Low", value: "price-high-low" },
                    { label: "Price: Low-High", value: "price-low-high" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value);
                        setIsSortOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between hover:bg-slate-50 ${sortBy === opt.value
                        ? "text-slate-900 font-bold bg-slate-50/70"
                        : "text-slate-600 font-normal"
                        }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.value && (
                        <span className="text-[#79A94B] text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PACKAGE SETS PRODUCT GRID (UNBOXED MINIMALIST MATCHING BLK COSMETICS) */}
        {loading && sortedPackages.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-10 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex flex-col space-y-3">
                <div className="aspect-square bg-slate-100 rounded-xl w-full" />
                <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : sortedPackages.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <p className="text-slate-400 italic  text-sm mb-4">No product found. Try clearing your search query or selecting a different category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-10">
            {sortedPackages.map((item) => {
              const mainImg = (item.images && item.images[0]) || item.image;
              const isFav = favoriteProductIds.includes(item._id || item.id);
              const hasOriginalPrice = Number(item.originalPrice) > Number(item.price);

              return (
                <div
                  key={item._id || item.id}
                  onClick={() => navigate(`/product/${item._id || item.id}`)}
                  className="cursor-pointer group flex flex-col space-y-2.5 relative"
                >
                  {/* IMAGE HOLDER - NO BORDER, NO ROUNDED CORNERS */}
                  <div className="aspect-square bg-white overflow-hidden relative flex items-center justify-center">
                    {getImageUrl(mainImg) ? (
                      <img
                        src={getImageUrl(mainImg)}
                        alt={item.itemDescription || item.packageName || item.name}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallbackEl = e.currentTarget.parentElement.querySelector(".no-img-label");
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
                        {item.itemDescription || item.packageName || item.name || "Package Set"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-mono">
                        {item.code || "Bundle"}
                      </span>
                    </div>

                    {/* VALUE SET BADGE */}
                    <span className="absolute top-2 left-2 bg-[#79A94B] text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                      Bundle
                    </span>

                    {/* WISHLIST BUTTON */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, item)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow-xs border border-[#E1E9EF] flex items-center justify-center hover:bg-white transition-all cursor-pointer"
                      title={isFav ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <Heart className={`w-3.5 h-3.5 transition-colors ${isFav ? "fill-rose-500 stroke-rose-500" : "stroke-[#243746] hover:stroke-rose-500"}`} />
                    </button>
                  </div>

                  {/* PRODUCT DETAILS (TITLE & PRICE ONLY) */}
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-medium text-[#243746] group-hover:text-[#246C94] transition-colors duration-200 line-clamp-2 leading-snug">
                      {item.itemDescription}
                    </h3>
                    <div className="flex items-center gap-2 pt-0.5">
                      <p className="text-xs sm:text-sm font-bold text-[#243746] group-hover:text-[#246C94] transition-colors duration-200">
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
      </main>

      <Footer />
    </div>
  );
}

export default CustomerPackageSet;
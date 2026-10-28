import React, { useState, useEffect, useRef } from "react";
import { Heart, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios, { API } from "../../axios";
import { getUserId } from "../../utils/userId";

export default function AddedToFavoritesToast() {
  const [isOpen, setIsOpen] = useState(false);
  const [productData, setProductData] = useState(null);
  const [favoritesCount, setFavoritesCount] = useState(1);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const API_BASE_URL =
    import.meta.env.MODE === "production"
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

  // Distinct favorite products count (matches header badge count)
  const fetchFavoritesCount = async () => {
    try {
      const activeId = getUserId();
      const userCached = activeId ? localStorage.getItem(`cached_favorites_items_${activeId}`) : null;
      const cached = userCached || localStorage.getItem("cached_favorites_items");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setFavoritesCount(parsed.length);
        }
      }
    } catch (err) {}

    try {
      const userId = getUserId();
      if (!userId) return;
      const res = await axios.get(`${API_BASE_URL}/api/favorites/${userId}`);
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.favorites?.items || []);
      if (Array.isArray(items)) {
        setFavoritesCount(items.length);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const handleFavoriteAdded = (event) => {
      const detail = event.detail || {};
      if (detail.product) {
        setProductData(detail.product);
        fetchFavoritesCount();
        setIsOpen(true);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIsOpen(false);
        }, 5000);
      }
    };

    const handleBagAdded = () => {
      // Close favorites toast if cart toast opens
      setIsOpen(false);
    };

    window.addEventListener("itemAddedToFavorites", handleFavoriteAdded);
    window.addEventListener("itemAddedToBag", handleBagAdded);
    window.addEventListener("favoritesUpdated", fetchFavoritesCount);

    return () => {
      window.removeEventListener("itemAddedToFavorites", handleFavoriteAdded);
      window.removeEventListener("itemAddedToBag", handleBagAdded);
      window.removeEventListener("favoritesUpdated", fetchFavoritesCount);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!isOpen || !productData) return null;

  const rawImg =
    productData.image || (productData.images && productData.images[0]) || "";
  const displayImg = getImageUrl(rawImg);
  const title = productData.itemDescription || productData.itemName || productData.name || "Product";
  const category =
    productData.category || productData.navbarTag || "Natural Botanical";
  const price = Number(productData.price || 0);

  return (
    <div className="fixed top-20 right-4 sm:right-8 z-50 w-[90vw] max-w-sm bg-white rounded-2xl shadow-2xl border border-[#E1E9EF] p-5 animate-fadeIn">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 fill-rose-600 stroke-rose-600 text-rose-600" />
          <span className="font-semibold text-sm text-[#243746]">Added to Favorites</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* PRODUCT ROW */}
      <div className="flex gap-4 items-center mb-5">
        {/* SQUARE IMAGE (NO BORDER RADIUS) */}
        <div className="w-16 h-16 bg-[#f5f5f5] overflow-hidden shrink-0 aspect-square">
          {displayImg ? (
            <img
              src={displayImg}
              alt={title}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
              No Img
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs sm:text-sm font-medium text-[#243746] leading-snug line-clamp-1">
            {title}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">{category}</p>
          <p className="text-xs sm:text-sm font-medium text-[#243746] mt-1">
            ₱{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* ACTION PILL BUTTONS (MATCHES REJECT ALL / ACCEPT ALL UI) */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            navigate("/favorites");
          }}
          className="w-full py-2.5 px-4 bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border border-[#d5ead7] rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center active:scale-[0.99]"
        >
          View Favorites ({favoritesCount})
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="w-full py-2.5 px-4 bg-[#01390f] hover:bg-[#0a5219] text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center shadow-md active:scale-[0.99]"
        >
          Continue Browsing
        </button>
      </div>
    </div>
  );
}

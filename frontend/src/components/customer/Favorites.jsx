import React from "react";
import { Heart, ShoppingBag, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast } from "../../utils/toast";
import { isUserLoggedIn } from "../../utils/userId";
import { useAppData } from "../../context/AppDataContext";

function Favorites({ isEmbedded = false }) {
  const navigate = useNavigate();
  const loggedIn = isUserLoggedIn();
  const { favorites, loading, removeFavorite, addToCart } = useAppData();

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

  const handleRemoveFavorite = (e, productId) => {
    if (e) e.stopPropagation();
    removeFavorite(productId);
    showSuccessToast("Removed item from wishlist.", { id: `fav-${productId}` });
  };

  const handleAddToCart = (e, product) => {
    if (e) e.stopPropagation();
    addToCart(product, 1);
    const title = product?.itemDescription || product?.itemName || product?.name || "item";
    const productId = product?._id || product?.id || title;
    showSuccessToast(`Added ${title} to cart!`, { id: `cart-${productId}` });
  };

  const contentMarkup = (
    <div className="space-y-6">
      {/* BREADCRUMB & PAGE TITLE */}
      <div className="mb-8">
        <nav className="text-xs text-slate-500 mb-3">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-900">Favorites</span>
        </nav>

        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h1 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
            Favorites {loggedIn && favorites.length > 0 && `(${favorites.length})`}
          </h1>
        </div>
      </div>

      {/* CONTENT SECTION */}
      {!loggedIn ? (
        <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center">
          <Heart size={44} className="text-[#01390f] mb-3" strokeWidth={1.8} />
          <h3 className="text-base sm:text-lg font-normal text-slate-900 mb-1">
            Please Sign In to View Your Wishlist
          </h3>
          <p className="text-slate-400 text-xs mb-6 max-w-sm">
            Sign in with your customer account to save, view, and manage your handcrafted favorite items.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <span>Sign In / Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : favorites.length === 0 ? (
        <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center">
          <Heart size={44} className="text-[#01390f] mb-3" strokeWidth={1.8} />
          <h3 className="text-base sm:text-lg font-normal text-slate-900 mb-1">
            Your wishlist is empty
          </h3>
          <p className="text-slate-400 text-xs mb-6 max-w-sm">
            Explore our 100% natural organic skincare collection and add items to your favorites.
          </p>
          <Link
            to="/collection"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <span>Explore Collection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-10 animate-fadeIn">
          {favorites.map((fav) => {
            const product = fav.product || fav;
            if (!product) return null;
            const productId = String(product._id || product.id || product.code || fav.productId || fav);

            const displayImg =
              (Array.isArray(product.images) && product.images[0]) ||
              product.image ||
              product.imageUrl ||
              "";
            const hasOriginalPrice = Number(product.originalPrice) > Number(product.price);
            const title = product.itemDescription || product.name || product.itemName || "Mhira Natural Product";

            return (
              <div
                key={productId}
                onClick={() => navigate(`/product/${productId}`)}
                className="cursor-pointer group flex flex-col space-y-2.5 relative"
              >
                {/* IMAGE HOLDER - NO OUTLINE, NO BORDER RADIUS, NO HEART ICON OVERLAY */}
                <div className="aspect-square bg-white overflow-hidden relative flex items-center justify-center">
                  {getImageUrl(displayImg) ? (
                    <img
                      src={getImageUrl(displayImg)}
                      alt={title}
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
                      getImageUrl(displayImg) ? "hidden" : "flex"
                    }`}
                  >
                    <span className="text-[11px] sm:text-xs font-semibold text-[#243746] uppercase tracking-wider line-clamp-3 leading-snug">
                      {title}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-mono">
                      {product.category || product.code || ""}
                    </span>
                  </div>
                  {(product.isOnSale || product.promoBadge) && (
                    <span className="absolute top-2 left-2 bg-[#79A94B] text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                      {product.promoBadge || "Sale"}
                    </span>
                  )}
                </div>

                {/* PRODUCT DETAILS */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {product.category || product.navbarTag || "Natural"}
                  </span>
                  <h3 className="text-xs sm:text-sm font-medium text-[#243746] group-hover:text-[#01390f] transition-colors duration-200 line-clamp-2 leading-snug">
                    {title}
                  </h3>

                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-[#243746] group-hover:text-[#01390f] transition-colors duration-200">
                      ₱{Number(product.price > 0 ? product.price : 200).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {hasOriginalPrice && Number(product.originalPrice) > Number(product.price > 0 ? product.price : 200) && (
                      <span className="text-xs text-slate-400 line-through font-normal">
                        ₱{Number(product.originalPrice).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* ACTIONS: ADD TO CART & REMOVE */}
                  <div className="flex items-center justify-between pt-1.5 gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, product)}
                      className="text-xs font-semibold text-[#01390f] hover:underline flex items-center gap-1.5 cursor-pointer"
                      title="Add to cart"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFavorite(e, productId)}
                      className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove from favorites"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return contentMarkup;
  }

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {contentMarkup}
      </main>
      <Footer />
    </div>
  );
}

export default Favorites;

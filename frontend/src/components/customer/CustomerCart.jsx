import React, { useState, useEffect } from "react";
import { Trash2, Plus, Minus, Heart, ArrowRight, Truck, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios, { API } from "../../axios";

import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { getUserId, isUserLoggedIn } from "../../utils/userId";
import { useAppData } from "../../context/AppDataContext";

function Cart() {
  const {
    cart: cartItems,
    favorites,
    user: userProfile,
    updateCartQuantity,
    removeFromCart,
    addToFavorite,
    clearCart,
  } = useAppData();

  const [recommendedProducts, setRecommendedProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Special Instructions State
  const [specialInstructions, setSpecialInstructions] = useState(() => {
    try {
      return localStorage.getItem("cart_special_instructions") || "";
    } catch {
      return "";
    }
  });

  // Selection States
  const [selectedItemIds, setSelectedItemIds] = useState(() => {
    try {
      if (Array.isArray(cartItems) && cartItems.length > 0) {
        return cartItems.map((i) => String(i.productId || i.product?._id || i.product?.id || i.product?.code || i.product || i._id));
      }
    } catch {}
    return [];
  });

  // Sync selectedItemIds when cart changes
  useEffect(() => {
    if (cartItems && cartItems.length > 0) {
      const allIds = cartItems.map((i) => String(i.productId || i.product?._id || i.product?.id || i.product?.code || i.product || i._id));
      setSelectedItemIds((prev) => {
        if (prev.length === 0) return allIds;
        const filtered = prev.filter((id) => allIds.includes(String(id)));
        return filtered.length > 0 ? filtered : allIds;
      });
    } else {
      setSelectedItemIds([]);
    }
  }, [cartItems]);

  const navigate = useNavigate();

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

  // Background fetch for extra recommendations and platform vouchers
  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      axios.get(`${API_BASE_URL}/api/collections/public`),
      axios.get(`${API_BASE_URL}/api/coupons`).catch(() => ({ data: [] })),
    ]).then(([publicRes, couponRes]) => {
      if (!isMounted) return;

      if (publicRes.status === "fulfilled" && Array.isArray(publicRes.value?.data)) {
        setRecommendedProducts(publicRes.value.data.slice(0, 4));
      }

      if (couponRes.status === "fulfilled" && Array.isArray(couponRes.value?.data)) {
        const activeCoupons = couponRes.value.data
          .filter((c) => c.status === "Active")
          .map((c) => {
            const isPercent = c.discount?.includes("%");
            const numVal = parseFloat(c.discount?.replace(/[^0-9.]/g, "")) || 0;
            const minNum = parseFloat(c.minSpend?.replace(/[^0-9.]/g, "")) || 0;
            return {
              code: c.code,
              discountType: isPercent ? "percent" : "fixed",
              discountValue: numVal,
              description: `${c.discount} OFF ${c.minSpend ? `(Min. ${c.minSpend})` : ""}`,
              minSpend: minNum,
            };
          });

        if (activeCoupons.length > 0) {
          setAvailableVouchers((prev) => {
            const combined = [...activeCoupons];
            prev.forEach((p) => {
              if (!combined.some((c) => c.code.toUpperCase() === p.code.toUpperCase())) {
                combined.push(p);
              }
            });
            return combined;
          });
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [API_BASE_URL]);

  // 2. SELECTION
  const getItemId = (item) => {
    if (!item) return "";
    return String(item.productId || item.product?._id || item.product?.id || item.product?.code || item._id || "");
  };

  const isItemSelected = (item) => {
    const id = getItemId(item);
    return selectedItemIds.map(String).includes(id);
  };

  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === cartItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(cartItems.map(getItemId));
    }
  };

  const handleToggleSelectItem = (id) => {
    const sId = String(id);
    setSelectedItemIds((prev) => {
      const cur = prev.map(String);
      return cur.includes(sId) ? cur.filter((i) => i !== sId) : [...cur, sId];
    });
  };

  // 3. QUANTITY CHANGE (Optimistic via Global AppDataContext)
  const handleQuantityChange = (productId, change) => {
    updateCartQuantity(productId, change);
  };

  // 4. REMOVE ITEM (Optimistic via Global AppDataContext)
  const handleRemoveItem = (cartItemOrId) => {
    const pStr = typeof cartItemOrId === "object"
      ? getItemId(cartItemOrId)
      : String(cartItemOrId);

    removeFromCart(pStr);
    setSelectedItemIds((prev) => prev.filter((id) => String(id) !== pStr));
    showSuccessToast("Item removed from cart.");
  };

  // 5. BULK DELETE (Optimistic via Global AppDataContext)
  const handleBulkDelete = () => {
    if (selectedItemIds.length === 0) return;
    selectedItemIds.forEach((pid) => removeFromCart(pid));
    setSelectedItemIds([]);
    showSuccessToast("Selected items removed from cart.");
  };

  // 6. BULK MOVE TO FAVORITES (Moves selected items to favorites and removes from cart)
  const handleBulkMoveToFavorites = () => {
    if (selectedItemIds.length === 0) return;
    const selectedItems = cartItems.filter(isItemSelected);
    selectedItems.forEach((item) => {
      const product = item.product || item;
      const pId = getItemId(item);
      if (!isFav(pId)) {
        addToFavorite(product);
      }
      removeFromCart(pId);
    });
    setSelectedItemIds([]);
    showSuccessToast("Moved selected items to favorites! ❤️");
  };

  // 6. TOGGLE FAVORITE (Optimistic via Global AppDataContext)
  const handleToggleFavorite = (product) => {
    addToFavorite(product);
    showSuccessToast("Wishlist updated!");
  };

  const isFav = (productId) => {
    const pStr = String(productId);
    return (favorites || []).some((f) => {
      const fid = String(f.productId || f.product?._id || f.product?.id || f.product?.code || f.product || f._id);
      return fid === pStr;
    });
  };

  // CALCULATIONS
  const selectedCartItems = cartItems.filter(isItemSelected);
  const totalSelectedQty = selectedCartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

  const subtotal = selectedCartItems.reduce((acc, item) => {
    const price = Number(item.product?.price ?? item.price ?? 0);
    const qty = Number(item.quantity) || 1;
    return acc + price * qty;
  }, 0);

  // 8. CHECKOUT
  const handleCheckout = () => {
    if (!isUserLoggedIn()) {
      showErrorToast("Please log in to your customer account to proceed to checkout.");
      navigate("/login");
      return;
    }
    if (selectedCartItems.length === 0) {
      showErrorToast("Please select at least one item to checkout.");
      return;
    }
    navigate("/checkout");
  };

  const loggedIn = isUserLoggedIn();

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* BREADCRUMB & HEADER */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-900 font-medium">Cart</span>
          </nav>

          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h1 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
              Cart {loggedIn && cartItems.length > 0 && `(${cartItems.length})`}
            </h1>
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT - ALIGNED AT TOP WITH ITEMS-START */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT COLUMN: CART ITEMS */}
          <div className="lg:col-span-8 space-y-4">
            {!loggedIn ? (
              <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center">
                <ShoppingBag size={44} className="text-[#01390f] mb-3" strokeWidth={1.8} />
                <h3 className="text-base sm:text-lg font-normal text-slate-900 mb-1">
                  Please Sign In to View Your Cart
                </h3>
                <p className="text-slate-400 text-xs mb-6 max-w-sm">
                  Sign in with your customer account to add products, manage your shopping bag, and complete your order.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span>Sign In / Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center">
                <ShoppingBag size={44} className="text-[#01390f] mb-3" strokeWidth={1.8} />
                <h3 className="text-base sm:text-lg font-normal text-slate-900 mb-1">
                  Your cart is empty
                </h3>
                <p className="text-slate-400 text-xs mb-6 max-w-sm">
                  Explore our 100% natural organic skincare collection and add items to your cart.
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
              <>
                {/* SELECT ALL & BULK ACTION BAR (UNBOXED) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 text-xs text-slate-700 border-b border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                    <input
                      type="checkbox"
                      checked={cartItems.length > 0 && selectedItemIds.length === cartItems.length}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 accent-[#01390f] rounded cursor-pointer"
                    />
                    <span>
                      Select All ({selectedItemIds.length}/{cartItems.length})
                    </span>
                  </label>

                  {selectedItemIds.length > 0 && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={handleBulkMoveToFavorites}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1.5 rounded hover:bg-rose-50 flex items-center gap-1.5 group"
                        title="Move selected items to favorites"
                      >
                        <Heart className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:fill-rose-500 transition-colors" />
                        <span className="hidden sm:inline text-xs font-medium text-slate-600 group-hover:text-rose-600">
                          Move to Favorites
                        </span>
                      </button>

                      <span className="text-gray-300 select-none">|</span>

                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1.5 rounded hover:bg-rose-50 flex items-center gap-1.5 group"
                        title="Delete selected items"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                        <span className="hidden sm:inline text-xs font-medium text-slate-600 group-hover:text-rose-600">
                          Delete
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* LIST OF CART ITEMS - NATURAL FLOW WITHOUT TRAPPED INTERNAL SCROLL */}
                <div className="divide-y divide-gray-200">
                  {cartItems.map((cartItem) => {
                    const product = cartItem.product || cartItem;
                    const productId = getItemId(cartItem);
                    const title = product.itemDescription || product.itemName || product.name || "Mhira Natural Product";
                    const itemImg =
                      (Array.isArray(product.images) && product.images[0]) ||
                      product.image ||
                      product.imageUrl ||
                      (Array.isArray(cartItem.images) && cartItem.images[0]) ||
                      cartItem.image ||
                      "";
                    const price = Number(product.price ?? cartItem.price ?? 200);
                    const qty = Number(cartItem.quantity) || 1;

                    return (
                      <div key={productId} className="py-6 flex gap-3 sm:gap-5 items-start">
                        {/* CHECKBOX */}
                        <div className="pt-2 shrink-0">
                          <input
                            type="checkbox"
                            checked={isItemSelected(cartItem)}
                            onChange={() => handleToggleSelectItem(productId)}
                            className="w-4 h-4 accent-[#01390f] rounded cursor-pointer"
                          />
                        </div>

                        {/* THUMBNAIL (NO OUTLINE, NO BORDER RADIUS) */}
                        <Link
                          to={`/product/${productId}`}
                          className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-50 overflow-hidden shrink-0 aspect-square flex items-center justify-center relative block"
                        >
                          {getImageUrl(itemImg) ? (
                            <img
                              src={getImageUrl(itemImg)}
                              alt={title}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fallbackEl = e.currentTarget.parentElement.querySelector(".no-img-label");
                                if (fallbackEl) fallbackEl.style.display = "flex";
                              }}
                              className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-500"
                            />
                          ) : null}
                          <div
                            className={`no-img-label w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-50 select-none ${
                              getImageUrl(itemImg) ? "hidden" : "flex"
                            }`}
                          >
                            <span className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider line-clamp-2 leading-tight">
                              {title}
                            </span>
                          </div>
                        </Link>

                        {/* DETAILS & ACTIONS */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <Link to={`/product/${productId}`}>
                                <h3 className="text-sm sm:text-base font-medium text-[#243746] hover:text-[#01390f] transition-colors leading-snug">
                                  {title}
                                </h3>
                              </Link>
                              <p className="text-xs text-slate-500">
                                {product.category || product.navbarTag || "Skin Care"}
                              </p>
                            </div>

                            <span className="text-sm sm:text-base font-bold text-[#243746] whitespace-nowrap">
                              ₱{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* QUANTITY PICKER & ACTIONS */}
                          <div className="space-y-3 pt-4">
                            <div className="flex items-center gap-4 text-slate-600 text-sm">
                              <div className="inline-flex items-center border border-slate-300 bg-white rounded-md overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(productId, -1)}
                                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-[#EDF7EE] hover:text-[#01390f] transition-colors cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-3 py-1 text-xs font-semibold text-slate-900 min-w-[28px] text-center select-none">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(productId, 1)}
                                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-[#EDF7EE] hover:text-[#01390f] transition-colors cursor-pointer"
                                  title="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* TRASH */}
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(productId)}
                                className="p-1.5 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: SUMMARY (SPECIAL INSTRUCTION, ESTIMATED TOTAL, DISCLAIMER, CHECKOUT) */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[116px] space-y-6">
              <h2 className="text-xl sm:text-2xl font-normal text-[#243746] tracking-tight">
                Summary
              </h2>

              <div className="space-y-4 text-sm text-slate-800">
                {/* 1. SPECIAL INSTRUCTION */}
                <div className="space-y-1.5 pb-4 border-b border-[#E1E9EF]">
                  <label className="block text-xs sm:text-sm font-medium text-[#243746]">
                    Special Instruction
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => {
                      setSpecialInstructions(e.target.value);
                      try {
                        localStorage.setItem("cart_special_instructions", e.target.value);
                      } catch (err) {}
                    }}
                    placeholder="Order notes, delivery instructions..."
                    className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 p-0 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 resize-none leading-relaxed"
                  />
                </div>

                {/* 2. ESTIMATED TOTAL */}
                <div className="flex justify-between items-center py-1">
                  <span className="text-base font-semibold text-[#243746]">Estimated Total:</span>
                  <span className="text-xl sm:text-2xl font-bold text-[#01390f]">
                    {selectedCartItems.length > 0
                      ? `₱${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </span>
                </div>

                {/* 3. TAXES AND SHIPPING NOTICE */}
                <p className="text-xs text-slate-500 leading-relaxed">
                  Taxes and shipping and calculated at checkout.
                </p>

                {/* 4. CHECKOUT BUTTON */}
                {selectedCartItems.length > 0 ? (
                  <button
                    type="button"
                    disabled={checkingOut}
                    onClick={handleCheckout}
                    className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-3.5 sm:py-4 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-98 disabled:opacity-50"
                  >
                    {checkingOut ? "Processing..." : `Checkout (${totalSelectedQty})`}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-[#f0f0f0] text-slate-400 py-3.5 sm:py-4 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider cursor-not-allowed"
                  >
                    Checkout (0)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FULL-WIDTH YOU MIGHT ALSO LIKE (OUTSIDE 2-COLUMN GRID FOR CLEAN LAYOUT) */}
        {recommendedProducts.length > 0 && (
          <div className="mt-16 pt-10 border-t border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-normal text-[#243746]">
                You Might Also Like
              </h2>
              <Link to="/collection" className="text-xs text-slate-500 hover:text-[#01390f] hover:underline">
                View all
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {recommendedProducts.map((item) => {
                const mainImg = (Array.isArray(item.images) && item.images[0]) || item.image || item.imageUrl || "";
                const itemId = item._id || item.id;
                const price = Number(item.price || 200);

                return (
                  <div
                    key={itemId}
                    onClick={() => navigate(`/product/${itemId}`)}
                    className="cursor-pointer group flex flex-col space-y-2.5 relative"
                  >
                    {/* IMAGE HOLDER - NO BORDER, NO ROUNDED CORNERS */}
                    <div className="aspect-square bg-white overflow-hidden flex items-center justify-center relative">
                      {getImageUrl(mainImg) ? (
                        <img
                          src={getImageUrl(mainImg)}
                          alt={item.itemDescription || item.name}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallbackEl = e.currentTarget.parentElement.querySelector(".no-img-label");
                            if (fallbackEl) fallbackEl.style.display = "flex";
                          }}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : null}
                      <div
                        className={`no-img-label w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-50 select-none ${
                          getImageUrl(mainImg) ? "hidden" : "flex"
                        }`}
                      >
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider line-clamp-2 leading-tight">
                          {item.itemDescription || item.name || "Item"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-medium text-[#243746] group-hover:text-[#01390f] transition-colors truncate">
                        {item.itemDescription || item.name}
                      </h4>
                      <p className="text-xs sm:text-sm font-bold text-[#243746] group-hover:text-[#01390f] transition-colors">
                        ₱{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
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

export default Cart;
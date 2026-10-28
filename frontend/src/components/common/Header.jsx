import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, ShoppingBag, Heart, LogOut, Menu, X, Bell, User, Headset, Award } from "lucide-react";
import axios from "../../axios";
import { getUserId as importedGetUserId } from "../../utils/userId";
import { showSuccessToast } from "../../utils/toast";
import { useAppData } from "../../context/AppDataContext";
import { hasActiveOrders, getCachedOrders, syncCustomerOrders } from "../../utils/ordersHelper";

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

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const appData = useAppData();
  const contextCart = appData?.cart;
  const contextFavorites = appData?.favorites;
  const contextUser = appData?.user;

  // Navigation & UI States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Live Search States & Data
  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState(() => {
    try {
      const cached = localStorage.getItem("mhira_db_products");
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) { }
    return [];
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Instant User State (0ms Lag from Local Storage)
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const storedUser = localStorage.getItem("user");
      if (storedUser) return JSON.parse(storedUser);
    } catch (e) { }
    return null;
  });

  const activeUser = user || contextUser;
  const isLoggedIn = Boolean(activeUser && (typeof window !== 'undefined' && localStorage.getItem("token")));

  // Active Orders Red Dot Notification
  const [hasOrderNotification, setHasOrderNotification] = useState(() => {
    const activeId = getUserId();
    const cached = getCachedOrders();
    return hasActiveOrders(cached, activeId);
  });

  useEffect(() => {
    if (contextUser !== undefined) {
      setUser(contextUser);
    }
  }, [contextUser]);

  useEffect(() => {
    const activeId = getUserId();
    if (activeId && isLoggedIn) {
      syncCustomerOrders(activeId).then((orders) => {
        setHasOrderNotification(hasActiveOrders(orders, activeId));
      });
    }

    const handleOrdersSync = () => {
      const currentId = getUserId();
      const cached = getCachedOrders();
      setHasOrderNotification(hasActiveOrders(cached, currentId));
    };

    window.addEventListener("ordersUpdated", handleOrdersSync);
    window.addEventListener("storage", handleOrdersSync);

    return () => {
      window.removeEventListener("ordersUpdated", handleOrdersSync);
      window.removeEventListener("storage", handleOrdersSync);
    };
  }, [isLoggedIn]);

  // Live Reactive Cart & Favorites Counts (Distinct Product Items Count)
  const cartCount = useMemo(() => {
    if (Array.isArray(contextCart)) {
      return contextCart.length;
    }
    try {
      const activeId = getUserId();
      const userCached = localStorage.getItem(`cached_cart_items_${activeId}`);
      const cached = userCached || localStorage.getItem("cached_cart_items");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (e) { }
    return 0;
  }, [contextCart]);

  const favoritesCount = useMemo(() => {
    if (Array.isArray(contextFavorites)) {
      return contextFavorites.length;
    }
    try {
      const activeId = getUserId();
      const userCached = localStorage.getItem(`cached_favorites_items_${activeId}`);
      const cached = userCached || localStorage.getItem("cached_favorites_items");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (e) { }
    return 0;
  }, [contextFavorites]);

  const [packageSetsCount, setPackageSetsCount] = useState(0);

  const isLinkActive = (path) => {
    if (path === "/collection") {
      return pathname === "/collection" || pathname.startsWith("/collection") || pathname.startsWith("/product");
    }
    return pathname === path || pathname.startsWith(path);
  };

  const isSearchActive = isSearchOpen || (pathname === "/collection" && location.search.includes("search="));
  const isCartActive = pathname === "/cart";
  const isFavoriteActive = pathname === "/favorites" || pathname === "/favorite";
  const isAccountActive = pathname.startsWith("/account") || pathname.startsWith("/orders") || pathname.startsWith("/notifications") || pathname === "/login" || isAccountDropdownOpen;

  // Close search dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchFocused(false);
        if (!searchTerm.trim()) {
          setIsSearchOpen(false);
        }
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchTerm]);

  // Fetch all public products once for instant fast local autocomplete & package sets count
  useEffect(() => {
    let isMounted = true;
    axios.get(`${API_BASE_URL}/api/collections/public`)
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res.data) && res.data.length > 0) {
          setAllProducts(res.data);
          try {
            localStorage.setItem("mhira_db_products", JSON.stringify(res.data));
          } catch (e) { }

          const packages = res.data.filter(i =>
            i.navbarTag === 'Package Sets' || i.category === 'Package Sets'
          );
          setPackageSetsCount(packages.length);
        }
      })
      .catch(() => { });

    return () => { isMounted = false; };
  }, []);

  // Filter search results in real time - strictly by product name only
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchTerm.toLowerCase().trim();
    const filtered = allProducts.filter((p) => {
      const productName = (p.itemDescription || p.itemName || p.name || p.title || "").toLowerCase();
      return productName.includes(query);
    }).slice(0, 6); // Top 6 matches

    setSearchResults(filtered);
  }, [searchTerm, allProducts]);

  const handleSelectProduct = (productId) => {
    setIsSearchFocused(false);
    setIsSearchOpen(false);
    setSearchTerm("");
    navigate(`/product/${productId}`);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchTerm.trim()) {
      setIsSearchFocused(false);
      setIsSearchOpen(false);
      navigate(`/collection?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  // Fetch User Profile
  const loadUser = useCallback(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const storedProfileImage = localStorage.getItem("profileImage");
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (!parsed.profileImage && storedProfileImage) {
          parsed.profileImage = storedProfileImage;
        }
        setUser(parsed);
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadUser();

    const handleAuthSync = () => loadUser();
    const handleLogoutSync = () => loadUser();

    window.addEventListener("userLogin", handleAuthSync);
    window.addEventListener("userLogout", handleLogoutSync);
    window.addEventListener("userUpdated", loadUser);
    window.addEventListener("profileUpdated", loadUser);
    window.addEventListener("storage", handleAuthSync);

    return () => {
      window.removeEventListener("userLogin", handleAuthSync);
      window.removeEventListener("userLogout", handleLogoutSync);
      window.removeEventListener("userUpdated", loadUser);
      window.removeEventListener("profileUpdated", loadUser);
      window.removeEventListener("storage", handleAuthSync);
    };
  }, [loadUser]);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    localStorage.clear();
    try {
      sessionStorage.removeItem("mhira_show_offer_on_login");
      sessionStorage.removeItem("mhira_special_offer_guest_seen");
    } catch (e) { }
    setUser(null);
    setIsAccountDropdownOpen(false);
    setIsMobileMenuOpen(false);
    window.dispatchEvent(new Event("userLogout"));
    window.dispatchEvent(new Event("cartUpdated"));
    window.dispatchEvent(new Event("favoritesUpdated"));
    if (typeof showSuccessToast === "function") {
      showSuccessToast("You have been logged out successfully.");
    }
    navigate("/login");
  };

  const getUserDisplayName = () => {
    if (!user) return "";
    return user.fullName || user.username || user.firstName || "User";
  };

  return (
    <header className="bg-[#EDF7EE] font-['Poppins',sans-serif] customer-header-nav w-full border-b border-[#D5EAD7] shadow-xs relative z-40 text-[#2D3732]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-18 flex items-center justify-between gap-3 lg:gap-6 relative">

        {/* 1. LEFT OF HEADER: NAVIGATION LINKS (DESKTOP) / HAMBURGER (MOBILE) */}
        <div className="flex-1 flex items-center justify-start min-w-0">
          {/* Mobile Menu Button */}
          <button
            type="button"
            className={`lg:hidden p-2 -ml-2 rounded-xl hover:bg-[#D5EAD7]/50 transition cursor-pointer text-[#01390f]`}
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open Mobile Navigation"
          >
            <Menu size={22} className="stroke-[2]" />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 whitespace-nowrap font-['Poppins',sans-serif]">
            <Link
              to="/collection"
              className={`font-semibold text-xs tracking-wider transition-colors relative py-1 ${
                isLinkActive("/collection")
                  ? "text-[#01390f] font-bold after:content-[''] after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#01390f] after:rounded-full"
                  : "text-[#2D3732] hover:text-[#01390f]"
              }`}
            >
              ALL PRODUCTS
            </Link>

            <Link
              to="/packages"
              className={`font-semibold text-xs tracking-wider flex items-center gap-1.5 transition-colors relative py-1 ${
                isLinkActive("/packages")
                  ? "text-[#01390f] font-bold after:content-[''] after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#01390f] after:rounded-full"
                  : "text-[#2D3732] hover:text-[#01390f]"
              }`}
            >
              <span>PACKAGE SETS</span>
              {packageSetsCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold border transition-colors ${
                    isLinkActive("/packages")
                      ? "bg-[#01390f] text-white border-[#01390f]"
                      : "bg-[#D5EAD7] text-[#01390f] border-[#c0e0c3]"
                  }`}
                >
                  {packageSetsCount}
                </span>
              )}
            </Link>

            <Link
              to="/top-customers"
              className={`font-semibold text-xs tracking-wider transition-colors relative py-1 ${
                isLinkActive("/top-customers")
                  ? "text-[#01390f] font-bold after:content-[''] after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#01390f] after:rounded-full"
                  : "text-[#2D3732] hover:text-[#01390f]"
              }`}
            >
              <span>MHIRA SHOPPERS</span>
            </Link>

            <Link
              to="/events"
              className={`font-semibold text-xs tracking-wider transition-colors relative py-1 ${
                isLinkActive("/events")
                  ? "text-[#01390f] font-bold after:content-[''] after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#01390f] after:rounded-full"
                  : "text-[#2D3732] hover:text-[#01390f]"
              }`}
            >
              EVENTS & PROMOS
            </Link>

            <Link
              to="/about"
              className={`font-semibold text-xs tracking-wider transition-colors relative py-1 ${
                isLinkActive("/about")
                  ? "text-[#01390f] font-bold after:content-[''] after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#01390f] after:rounded-full"
                  : "text-[#2D3732] hover:text-[#01390f]"
              }`}
            >
              OUR STORY
            </Link>
          </nav>
        </div>

        {/* 2. CENTER OF HEADER: BRAND LOGO */}
        <div className="shrink-0 flex items-center justify-center px-2">
          <Link to="/" className="flex items-center justify-center py-1">
            <img
              src="/mhira_removebg.png"
              alt="Mhira Natural Logo"
              className="h-10 sm:h-11 md:h-12 lg:h-13 w-auto object-contain transition-transform hover:scale-105"
            />
          </Link>
        </div>

        {/* 3. RIGHT OF HEADER: ICONS ONLY (SEARCH BESIDE CART, CART, FAVORITE, MY ACCOUNT) */}
        <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">

          {/* SEARCH (EXPANDABLE INPUT / ICON BESIDE CART) */}
          <div className="relative" ref={searchContainerRef}>
            {!isSearchOpen ? (
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 60);
                }}
                className={`p-2 rounded-full hover:bg-gray-100 transition flex items-center justify-center cursor-pointer ${
                  isSearchActive ? "text-[#01390f]" : "text-gray-700 hover:text-gray-950"
                }`}
                title="Search products"
                aria-label="Search"
              >
                <Search size={20} className="stroke-[2]" />
              </button>
            ) : (
              <div className="relative w-44 sm:w-56 md:w-64 animate-fadeIn">
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    autoFocus
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsSearchFocused(true);
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder="Search products..."
                    className="w-full bg-white rounded-full pl-8 pr-7 py-1.5 text-xs font-normal text-[#2D3732] placeholder:text-slate-400 border border-[#D5EAD7] focus:border-[#01390f] focus:ring-2 focus:ring-[#01390f]/20 focus:outline-none transition-all shadow-xs"
                  />
                  <Search size={14} className="absolute left-2.5 text-gray-500 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchTerm("");
                      setIsSearchFocused(false);
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-0.5"
                    title="Close search"
                  >
                    ✕
                  </button>
                </form>

                {/* AUTOCOMPLETE DROPDOWN */}
                {isSearchFocused && searchTerm.trim().length > 0 && (
                  <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-[#f7faf8] rounded-2xl shadow-xl border border-[#D5EAD7] overflow-hidden z-50 animate-fadeIn max-h-[360px] overflow-y-auto custom-scrollbar font-normal text-[#2D3732]">
                    {searchResults.length > 0 ? (
                      <div>
                        {searchResults.map((item) => {
                          const img = (item.images && item.images[0]) || item.image;
                          return (
                            <div
                              key={item._id || item.id}
                              onClick={() => handleSelectProduct(item._id || item.id)}
                              className="flex items-center gap-3 p-2.5 hover:bg-[#EDF7EE] transition-colors cursor-pointer group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                {img ? (
                                  <img
                                    src={getImageUrl(img)}
                                    alt={item.itemDescription || item.itemName || item.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400 font-normal">
                                    No Img
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-semibold text-[#01390f] uppercase tracking-wider block">
                                  {item.category || item.navbarTag || "Natural"}
                                </span>
                                <p className="text-xs font-normal text-[#2D3732] truncate group-hover:text-[#01390f] transition-colors leading-snug">
                                  {item.itemDescription || item.itemName || item.name}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div
                          onClick={() => handleSearchSubmit()}
                          className="p-2.5 bg-[#EDF7EE] hover:bg-[#01390f] hover:text-white text-[#01390f] text-xs font-semibold text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5 border-t border-[#D5EAD7]"
                        >
                          <span>View all results for "{searchTerm}"</span>
                          <span>→</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">
                        <p className="text-slate-400 italic text-[11px]">No products found for "{searchTerm}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CART ICON WITH BADGE (VISIBLE ONLY WHEN LOGGED IN) */}
          {isLoggedIn && (
            <Link
              to="/cart"
              className={`relative p-2 rounded-full hover:bg-gray-100 transition flex items-center justify-center cursor-pointer ${
                isCartActive ? "text-[#01390f]" : "text-gray-700 hover:text-gray-950"
              }`}
              aria-label="View Cart"
              title="Shopping Cart"
            >
              <ShoppingBag size={20} className="stroke-[2]" />
              {cartCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs ${
                  isCartActive ? "bg-[#01390f]" : "bg-gray-800"
                }`}>
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {/* FAVORITE ICON WITH BADGE (VISIBLE ONLY WHEN LOGGED IN) */}
          {isLoggedIn && (
            <Link
              to="/favorites"
              className={`relative p-2 rounded-full hover:bg-gray-100 transition flex items-center justify-center cursor-pointer ${
                isFavoriteActive ? "text-[#01390f]" : "text-gray-700 hover:text-gray-950"
              }`}
              aria-label="View Favorites"
              title="Favorites Wishlist"
            >
              <Heart size={20} className={`stroke-[2] transition-colors ${
                isFavoriteActive ? "stroke-[#01390f] fill-[#01390f]/20" : "stroke-current"
              }`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs">
                  {favoritesCount}
                </span>
              )}
            </Link>
          )}

          {/* MY ACCOUNT ICON (AVATAR / USER ICON WITH DROPDOWN WHEN LOGGED IN, OR LOGIN ICON) */}
          <div
            className="relative hidden lg:block"
            onMouseEnter={() => isLoggedIn && setIsAccountDropdownOpen(true)}
            onMouseLeave={() => isLoggedIn && setIsAccountDropdownOpen(false)}
          >
            {isLoggedIn ? (
              <button
                onClick={() => navigate("/account")}
                className={`p-0.5 rounded-full transition flex items-center justify-center cursor-pointer ${
                  isAccountActive
                    ? "ring-2 ring-[#01390f] text-[#01390f]"
                    : "hover:ring-2 hover:ring-gray-900 text-gray-700 hover:text-gray-950"
                }`}
                aria-label="My Account"
                title={`My Account (${getUserDisplayName()})`}
              >
                <div className="relative inline-flex items-center justify-center">
                  {activeUser?.profileImage ? (
                    <img
                      src={activeUser.profileImage}
                      alt={getUserDisplayName()}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shadow-2xs border-2 transition-colors ${
                        isAccountActive ? "border-[#01390f]" : "border-gray-700 hover:border-gray-950"
                      }`}
                    />
                  ) : (
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white font-bold flex items-center justify-center text-xs shadow-2xs ring-1 transition-colors ${
                      isAccountActive ? "bg-[#01390f] ring-[#01390f]" : "bg-gray-700 hover:bg-gray-950 ring-gray-700"
                    }`}>
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </div>
                  )}
                  {hasOrderNotification && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-[#c81e1e] rounded-full" />
                  )}
                </div>
              </button>
            ) : (
              <Link
                to="/login"
                className={`p-2 rounded-full hover:bg-gray-100 transition flex items-center justify-center cursor-pointer ${
                  isAccountActive ? "text-[#01390f]" : "text-gray-700 hover:text-gray-950"
                }`}
                title="Login / Register"
                aria-label="Login or Register"
              >
                <User size={20} className="stroke-[2]" />
              </Link>
            )}

            {/* DROPDOWN MENU */}
            {isLoggedIn && isAccountDropdownOpen && (
              <div className="absolute right-0 pt-2 w-56 z-50 animate-fadeIn">
                <div className="bg-[#f7faf8] border border-[#D5EAD7] shadow-xl rounded-2xl overflow-hidden ring-1 ring-black/5 text-[#2D3732]">
                  <div className="px-4 py-3 bg-[#EDF7EE] border-b border-[#D5EAD7] flex items-center gap-3">
                    {activeUser?.profileImage ? (
                      <img
                        src={activeUser.profileImage}
                        alt={getUserDisplayName()}
                        className="w-9 h-9 rounded-full object-cover border-2 border-[#01390f] shadow-xs"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#01390f] text-white font-bold flex items-center justify-center text-xs shadow-xs ring-1 ring-[#01390f]">
                        {getUserDisplayName().charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-[10px] text-gray-500 font-normal">Logged in as</p>
                      <p className="font-bold text-[#01390f] text-xs truncate">
                        {getUserDisplayName()}
                      </p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border ${
                          activeUser?.tier === 'Platinum'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : activeUser?.tier === 'Gold'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : activeUser?.tier === 'Silver'
                            ? 'bg-slate-200 text-slate-800 border-slate-300'
                            : 'bg-orange-100 text-orange-900 border-orange-200'
                        }`}>
                          {activeUser?.tier ? `${activeUser.tier} VIP` : 'Bronze Member'}
                        </span>
                        {activeUser?.rewardPoints != null && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 font-mono">
                            ⭐ {activeUser.rewardPoints} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-1 text-xs">
                    <Link
                      to="/account"
                      onClick={() => setIsAccountDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2 transition font-semibold ${
                        pathname === "/account" || pathname.startsWith("/account")
                          ? "bg-[#EDF7EE] text-[#01390f] font-bold"
                          : "text-gray-700 hover:text-[#01390f] hover:bg-[#EDF7EE]"
                      }`}
                    >
                      <User size={15} /> My Account
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setIsAccountDropdownOpen(false)}
                      className={`flex items-center justify-between px-4 py-2 transition font-semibold ${
                        pathname === "/orders" || pathname.startsWith("/orders")
                          ? "bg-[#EDF7EE] text-[#01390f] font-bold"
                          : "text-gray-700 hover:text-[#01390f] hover:bg-[#EDF7EE]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <ShoppingBag size={15} /> My Orders
                      </span>
                      {hasOrderNotification && (
                        <span className="w-1.5 h-1.5 bg-[#c81e1e] rounded-full" />
                      )}
                    </Link>
                    <Link
                      to="/contact-agent"
                      onClick={() => setIsAccountDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2 transition font-semibold ${
                        pathname === "/contact-agent" || pathname.startsWith("/contact-agent")
                          ? "bg-[#EDF7EE] text-[#01390f] font-bold"
                          : "text-gray-700 hover:text-[#01390f] hover:bg-[#EDF7EE]"
                      }`}
                    >
                      <Headset size={15} /> Contact Agent
                    </Link>
                    <Link
                      to="/top-customers"
                      onClick={() => setIsAccountDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2 transition font-semibold ${
                        pathname === "/top-customers"
                          ? "bg-[#EDF7EE] text-[#01390f] font-bold"
                          : "text-gray-700 hover:text-[#01390f] hover:bg-[#EDF7EE]"
                      }`}
                    >
                      <Award size={15} className="text-amber-600" /> Mhira Shoppers
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => setIsAccountDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2 transition font-semibold ${
                        pathname === "/notifications" || pathname.startsWith("/notifications")
                          ? "bg-[#EDF7EE] text-[#01390f] font-bold"
                          : "text-gray-700 hover:text-[#01390f] hover:bg-[#EDF7EE]"
                      }`}
                    >
                      <Bell size={15} /> Notification
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 text-left font-bold border-t border-[#E8E6DF] mt-1 cursor-pointer transition"
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MOBILE SLIDE-OVER DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-start">

          {/* DIMMED BACKDROP OVERLAY */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* SLIDE-IN CONTENT DRAWER */}
          <div className="relative w-full max-w-xs bg-[#f7faf8] h-full shadow-2xl flex flex-col justify-between z-10 animate-slideRight overflow-y-auto">

            {/* DRAWER HEADER */}
            <div>
              <div className="p-5 flex items-center justify-between border-b border-[#E8E6DF]">
                <img src="/mhira_removebg.png" alt="Logo" className="h-9 sm:h-10 object-contain" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                  aria-label="Close Mobile Menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* NAVIGATION LINKS */}
              <div className="p-5 space-y-2 text-sm font-semibold text-gray-700 font-['Poppins',sans-serif]">
                <Link
                  to="/collection"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block py-2 px-1 transition-colors ${
                    isLinkActive("/collection")
                      ? "text-[#01390f] font-bold"
                      : "text-gray-700 hover:text-[#01390f]"
                  }`}
                >
                  ALL PRODUCTS
                </Link>

                <Link
                  to="/packages"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between py-2 px-1 transition-colors ${
                    isLinkActive("/packages")
                      ? "text-[#01390f] font-bold"
                      : "text-gray-700 hover:text-[#01390f]"
                  }`}
                >
                  <span>PACKAGE SETS</span>
                  {packageSetsCount > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isLinkActive("/packages")
                          ? "bg-[#01390f] text-white border-[#01390f]"
                          : "bg-[#EDF7EE] text-[#01390f] border-[#D5EAD7]"
                      }`}
                    >
                      {packageSetsCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/top-customers"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block py-2 px-1 transition-colors ${
                    isLinkActive("/top-customers")
                      ? "text-[#01390f] font-bold"
                      : "text-gray-700 hover:text-[#01390f]"
                  }`}
                >
                  MHIRA SHOPPERS
                </Link>

                <Link
                  to="/events"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block py-2 px-1 transition-colors ${
                    isLinkActive("/events")
                      ? "text-[#01390f] font-bold"
                      : "text-gray-700 hover:text-[#01390f]"
                  }`}
                >
                  EVENTS & PROMOS
                </Link>

                <Link
                  to="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block py-2 px-1 transition-colors ${
                    isLinkActive("/about")
                      ? "text-[#01390f] font-bold"
                      : "text-gray-700 hover:text-[#01390f]"
                  }`}
                >
                  OUR STORY
                </Link>
              </div>
            </div>

            {/* DRAWER FOOTER (FOR LOGGED-IN ACTIONS - COMPACT HEIGHT) */}
            {user ? (
              <div className="p-2.5 border-t border-[#D5EAD7] bg-[#f7faf8] space-y-0.5">
                <Link
                  to="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors group cursor-pointer ${
                    pathname === "/account" || pathname.startsWith("/account")
                      ? "text-[#01390f] bg-[#EDF7EE] font-bold"
                      : "text-gray-700 hover:text-gray-950 hover:bg-[#EDF7EE]"
                  }`}
                >
                  <div className="relative inline-flex items-center justify-center shrink-0">
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={getUserDisplayName()}
                        className={`w-5.5 h-5.5 rounded-full object-cover border transition-colors ${
                          pathname === "/account" || pathname.startsWith("/account")
                            ? "border-[#01390f]"
                            : "border-gray-700 group-hover:border-gray-950"
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-5.5 h-5.5 rounded-full text-white font-bold flex items-center justify-center text-[10px] transition-colors ${
                          pathname === "/account" || pathname.startsWith("/account")
                            ? "bg-[#01390f]"
                            : "bg-gray-700 group-hover:bg-gray-950"
                        }`}
                      >
                        {getUserDisplayName().charAt(0).toUpperCase()}
                      </div>
                    )}
                    {hasOrderNotification && (
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#c81e1e] rounded-full" />
                    )}
                  </div>
                  <span className="text-xs font-semibold">My Account</span>
                </Link>

                <Link
                  to="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors group cursor-pointer ${
                    pathname === "/orders" || pathname.startsWith("/orders")
                      ? "text-[#01390f] bg-[#EDF7EE] font-bold"
                      : "text-gray-700 hover:text-gray-950 hover:bg-[#EDF7EE]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 flex items-center justify-center shrink-0 transition-colors ${
                      pathname === "/orders" || pathname.startsWith("/orders")
                        ? "text-[#01390f]"
                        : "text-gray-700 group-hover:text-gray-950"
                    }`}>
                      <ShoppingBag size={16} className="stroke-[2]" />
                    </div>
                    <span className="text-xs font-semibold">My Orders</span>
                  </div>
                  {hasOrderNotification && (
                    <span className="w-1.5 h-1.5 bg-[#c81e1e] rounded-full mr-1" />
                  )}
                </Link>

                <Link
                  to="/contact-agent"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors group cursor-pointer ${
                    pathname === "/contact-agent" || pathname.startsWith("/contact-agent")
                      ? "text-[#01390f] bg-[#EDF7EE] font-bold"
                      : "text-gray-700 hover:text-gray-950 hover:bg-[#EDF7EE]"
                  }`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center shrink-0 transition-colors ${
                    pathname === "/contact-agent" || pathname.startsWith("/contact-agent")
                      ? "text-[#01390f]"
                      : "text-gray-700 group-hover:text-gray-950"
                  }`}>
                    <Headset size={16} className="stroke-[2]" />
                  </div>
                  <span className="text-xs font-semibold">Contact Agent</span>
                </Link>

                <Link
                  to="/top-customers"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors group cursor-pointer ${
                    pathname === "/top-customers" || pathname.startsWith("/top-customers")
                      ? "text-[#01390f] bg-[#EDF7EE] font-bold"
                      : "text-gray-700 hover:text-gray-950 hover:bg-[#EDF7EE]"
                  }`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center shrink-0 transition-colors ${
                    pathname === "/top-customers" || pathname.startsWith("/top-customers")
                      ? "text-[#01390f]"
                      : "text-gray-700 group-hover:text-gray-950"
                  }`}>
                    <Award size={16} className="stroke-[2] text-amber-600" />
                  </div>
                  <span className="text-xs font-semibold">Mhira Shoppers</span>
                </Link>

                <Link
                  to="/notifications"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors group cursor-pointer ${
                    pathname === "/notifications" || pathname.startsWith("/notifications")
                      ? "text-[#01390f] bg-[#EDF7EE] font-bold"
                      : "text-gray-700 hover:text-gray-950 hover:bg-[#EDF7EE]"
                  }`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center shrink-0 transition-colors ${
                    pathname === "/notifications" || pathname.startsWith("/notifications")
                      ? "text-[#01390f]"
                      : "text-gray-700 group-hover:text-gray-950"
                  }`}>
                    <Bell size={16} className="stroke-[2]" />
                  </div>
                  <span className="text-xs font-semibold">Notification</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold transition-colors group cursor-pointer text-left"
                >
                  <div className="w-6 h-6 flex items-center justify-center shrink-0 text-red-600 group-hover:text-red-700 transition-colors">
                    <LogOut size={16} className="stroke-[2]" />
                  </div>
                  <span className="text-xs font-semibold">Logout</span>
                </button>
              </div>
            ) : (
              <div className="p-3 border-t border-[#D5EAD7] bg-[#f7faf8]">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#01390f] hover:bg-[#024a14] text-white text-xs font-bold transition-all shadow-xs"
                >
                  <User size={15} />
                  <span>Login / Register</span>
                </Link>
              </div>
            )}

          </div>
        </div>
      )}

    </header>
  );
}

export default Header;
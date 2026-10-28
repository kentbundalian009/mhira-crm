import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import axios from "../../axios";

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

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [packageSetsCount, setPackageSetsCount] = useState(0);

  const isLinkActive = (path) => {
    if (path === "/collection") {
      return pathname === "/collection" || pathname.startsWith("/collection") || pathname.startsWith("/product");
    }
    return pathname === path || pathname.startsWith(path);
  };

  // Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState(() => {
    try {
      const cached = localStorage.getItem("mhira_db_products");
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) {}
    return [];
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close search dropdown on click outside
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

  // Fetch public products and packages count
  useEffect(() => {
    let isMounted = true;
    const fetchNavbarData = async () => {
      try {
        const resPublic = await axios.get(`${API_BASE_URL}/api/collections/public`).catch(() => ({ data: [] }));
        if (!isMounted) return;
        if (Array.isArray(resPublic.data)) {
          setAllProducts(resPublic.data);
          try {
            localStorage.setItem("mhira_db_products", JSON.stringify(resPublic.data));
          } catch (e) {}

          const packages = resPublic.data.filter(i =>
            i.navbarTag === 'Package Sets' || i.category === 'Package Sets'
          );
          setPackageSetsCount(packages.length);
        }
      } catch (e) {
        console.error("Error fetching navbar data:", e);
      }
    };

    fetchNavbarData();
    return () => { isMounted = false; };
  }, []);

  // Filter search results in real time
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchTerm.toLowerCase().trim();
    const filtered = allProducts.filter((p) => {
      const productName = (p.itemDescription || p.itemName || p.name || p.title || "").toLowerCase();
      return productName.includes(query);
    }).slice(0, 6);

    setSearchResults(filtered);
  }, [searchTerm, allProducts]);

  const handleSelectProduct = (productId) => {
    setIsSearchFocused(false);
    setSearchTerm("");
    navigate(`/product/${productId}`);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchTerm.trim()) {
      setIsSearchFocused(false);
      navigate(`/collection?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <nav className="hidden lg:block w-full bg-white border-t border-[#E1E9EF] border-b border-[#E1E9EF] font-poppins text-xs font-bold text-[#243746] relative z-40 shadow-2xs">
      <div className="max-w-[1440px] mx-auto px-6 md:px-8 h-11 flex items-center justify-between gap-6">
        {/* DESKTOP NAV LINKS (LEFT) */}
        <div className="flex items-center gap-6 xl:gap-8 text-[13px] font-bold tracking-wider h-full">
          <Link
            to="/collection"
            className={`h-full flex items-center transition-colors relative py-1 ${
              isLinkActive("/collection")
                ? "text-[#79A94B] font-extrabold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#79A94B] after:rounded-full"
                : "text-[#243746] hover:text-[#79A94B]"
            }`}
          >
            <span>ALL PRODUCTS</span>
          </Link>

          <Link
            to="/packages"
            className={`h-full flex items-center gap-1.5 transition-colors relative py-1 ${
              isLinkActive("/packages")
                ? "text-[#79A94B] font-extrabold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#79A94B] after:rounded-full"
                : "text-[#243746] hover:text-[#79A94B]"
            }`}
          >
            <span>PACKAGE SETS</span>
            {packageSetsCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold border transition-colors ${
                  isLinkActive("/packages")
                    ? "bg-[#79A94B] text-white border-[#79A94B]"
                    : "bg-[#EAF3E4] text-[#79A94B] border-[#79A94B]/30"
                }`}
              >
                {packageSetsCount}
              </span>
            )}
          </Link>

          <Link
            to="/events"
            className={`h-full flex items-center transition-colors relative py-1 ${
              isLinkActive("/events")
                ? "text-[#79A94B] font-extrabold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#79A94B] after:rounded-full"
                : "text-[#243746] hover:text-[#79A94B]"
            }`}
          >
            <span>EVENTS & PROMOS</span>
          </Link>

          <Link
            to="/about"
            className={`h-full flex items-center transition-colors relative py-1 ${
              isLinkActive("/about")
                ? "text-[#79A94B] font-extrabold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#79A94B] after:rounded-full"
                : "text-[#243746] hover:text-[#79A94B]"
            }`}
          >
            <span>OUR STORY</span>
          </Link>
        </div>

        {/* SEARCH BUTTON / EXPANDABLE INPUT (RIGHT OF NAV LINKS) */}
        <div className="relative" ref={searchContainerRef}>
          {!isSearchOpen ? (
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 60);
              }}
              className="py-1 px-3 rounded-full bg-white hover:bg-[#EAF3E4]/40 border border-[#E1E9EF] text-[#243746] hover:text-[#79A94B] transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none shadow-2xs"
              title="Search products"
            >
              <Search size={15} className="stroke-[2.2] text-[#79A94B]" />
              <span>Search</span>
            </button>
          ) : (
            <div className="relative w-64 xl:w-72 animate-fadeIn">
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
                  className="w-full bg-white rounded-full pl-8 pr-7 py-1.5 text-xs font-normal text-[#243746] placeholder:text-slate-400 border border-[#E1E9EF] focus:border-[#246C94] focus:ring-2 focus:ring-[#246C94]/20 focus:outline-none transition-all shadow-xs"
                />
                <Search size={14} className="absolute left-2.5 text-[#79A94B] pointer-events-none" />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchTerm("");
                    setIsSearchFocused(false);
                  }}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-0.5"
                  title="Close search"
                >
                  ✕
                </button>
              </form>
            </div>
          )}

          {/* AUTOCOMPLETE DROPDOWN */}
          {isSearchOpen && isSearchFocused && searchTerm.trim().length > 0 && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E1E9EF] overflow-hidden z-50 animate-fadeIn max-h-[380px] overflow-y-auto custom-scrollbar font-normal">
              {searchResults.length > 0 ? (
                <div>
                  {searchResults.map((item) => {
                    const img = (item.images && item.images[0]) || item.image;
                    return (
                      <div
                        key={item._id || item.id}
                        onClick={() => handleSelectProduct(item._id || item.id)}
                        className="flex items-center gap-3 p-2.5 hover:bg-[#EAF3E4]/60 transition-colors cursor-pointer group"
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
                          <span className="text-[10px] font-medium text-[#79A94B] uppercase tracking-wider block">
                            {item.category || item.navbarTag || "Natural"}
                          </span>
                          <p className="text-xs font-normal text-[#243746] truncate group-hover:text-[#246C94] transition-colors leading-snug">
                            {item.itemDescription || item.itemName || item.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div
                    onClick={() => handleSearchSubmit()}
                    className="p-2.5 bg-[#EAF3E4] hover:bg-[#246C94] hover:text-white text-[#246C94] text-xs font-normal text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5"
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
      </div>
    </nav>
  );
}

export default Navbar;
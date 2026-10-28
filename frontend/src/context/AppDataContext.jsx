import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios, { API } from "../axios";
import { getUserId, isUserLoggedIn } from "../utils/userId";
import { safeSetItem, safeGetItem, cleanOldCaches } from "../utils/safeStorage";
import { notifyLiveSync, useLiveSync } from "../utils/liveSync";

const AppDataContext = createContext(null);

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

export function AppDataProvider({ children }) {
  // 1. Initial State Hydration (0ms Instant Load from Storage)
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        const savedImg = localStorage.getItem("profileImage") || u.profileImage || "";
        return {
          customerCode: u.customerCode || u.customerNo || u.empNo || "CTM-000001",
          customerNo: u.customerNo || u.customerCode || u.empNo || "CTM-000001",
          username: u.username || "",
          fullName: u.fullName || u.fullname || u.username || "Customer",
          email: u.email || "",
          phoneNumber: u.phoneNumber || u.phone || "",
          accountType: u.accountType || "Customer",
          role: u.role || "Customer",
          gender: u.gender || "",
          profileImage: savedImg,
          billingAddress: u.billingAddress || null,
          shippingAddress: u.shippingAddress || null,
          ...u,
        };
      }
    } catch (e) {
      console.warn("User state hydration failed:", e);
    }
    return null;
  });

  const [cart, setCart] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const activeId = getUserId();
      if (!token || !activeId) return [];
      const userCached = localStorage.getItem(`cached_cart_items_${activeId}`);
      const stored = userCached || localStorage.getItem("cached_cart_items");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Cart state hydration failed:", e);
    }
    return [];
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const activeId = getUserId();
      if (!token || !activeId) return [];
      const userCached = localStorage.getItem(`cached_favorites_items_${activeId}`);
      const stored = userCached || localStorage.getItem("cached_favorites_items");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Favorites state hydration failed:", e);
    }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const stored = localStorage.getItem("user");
      return !token || !stored;
    } catch {
      return false;
    }
  });
  const [error, setError] = useState(null);
  const initialFetchDone = useRef(false);

  // 2. Fetch User, Cart, & Favorites IN PARALLEL (Promise.all) ONLY ONCE on Mount
  const fetchAllAppData = useCallback(async (isRefresh = false) => {
    const token = localStorage.getItem("token");
    const activeUserId = getUserId();

    if (!token || !activeUserId) {
      setLoading(false);
      return;
    }

    try {
      const storedUser = localStorage.getItem("user");
      if (!isRefresh && !storedUser) setLoading(true);
      setError(null);

      const isGuest = String(activeUserId).startsWith("guest_");
      const authHeaders = { Authorization: `Bearer ${token}` };

      const [userRes, cartRes, favRes] = await Promise.all([
        !isGuest
          ? axios
              .get(`${API_BASE_URL}/api/users/profile/${activeUserId}`, {
                headers: authHeaders,
              })
              .catch((err) => {
                console.warn("User profile fetch failed:", err);
                return { data: null };
              })
          : Promise.resolve({ data: null }),
        axios
          .get(`${API_BASE_URL}/api/cart/${activeUserId}`, {
            headers: authHeaders,
          })
          .catch((err) => {
            console.warn("Cart fetch failed, preserving local state:", err);
            return { data: { _isError: true, items: null } };
          }),
        axios
          .get(`${API_BASE_URL}/api/favorites/${activeUserId}`, {
            headers: authHeaders,
          })
          .catch((err) => {
            console.warn("Favorites fetch failed, preserving local state:", err);
            return { data: { _isError: true, items: null } };
          }),
      ]);

      // Process User Data
      if (userRes?.data && !userRes.data._isError) {
        const rawUserData = userRes.data.user || userRes.data.data || userRes.data;
        if (rawUserData && (rawUserData._id || rawUserData.username || rawUserData.email)) {
          const p = rawUserData;
          const savedImg = p.profileImage || p.ProfileImage || localStorage.getItem("profileImage") || "";
          const formattedUser = {
            customerCode: p.customerNo || p.customerCode || p.empNo || "CTM-000001",
            customerNo: p.customerNo || p.customerCode || p.empNo || "CTM-000001",
            username: p.username || p.Username || "",
            fullName: p.fullName || p.fullname || p.Fullname || "Customer",
            email: p.email || p.Email || "",
            phoneNumber: p.phoneNumber || p.phone || "",
            accountType: p.accountType || "Customer",
            role: p.role || "Customer",
            gender: p.gender || "",
            profileImage: savedImg,
            billingAddress: p.billingAddress && (p.billingAddress.street || p.billingAddress.city) ? p.billingAddress : null,
            shippingAddress: p.shippingAddress && (p.shippingAddress.street || p.shippingAddress.city) ? p.shippingAddress : null,
            ...p,
          };
          setUser(formattedUser);

          const stored = localStorage.getItem("user");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.fullName = p.fullName || p.fullname || parsed.fullName;
              parsed.email = p.email || parsed.email;
              parsed.phoneNumber = p.phoneNumber || parsed.phoneNumber;
              if (savedImg) parsed.profileImage = savedImg;
              localStorage.setItem("user", JSON.stringify(parsed));
            } catch (e) {}
          }
        }
      }

      // Process Cart Data (handles both array and object response)
      if (cartRes?.data && !cartRes.data._isError) {
        const cartList = Array.isArray(cartRes.data)
          ? cartRes.data
          : (cartRes.data.items || cartRes.data.cart?.items || cartRes.data.data || []);

        if (Array.isArray(cartList)) {
          const validItems = cartList.filter((item) => item && (item.product || item.productId));
          setCart(validItems);
          try {
            localStorage.setItem("cached_cart_items", JSON.stringify(validItems));
            localStorage.setItem(`cached_cart_items_${activeUserId}`, JSON.stringify(validItems));
          } catch (e) {}
        }
      }

      // Process Favorites Data (handles both array and object response)
      if (favRes?.data && !favRes.data._isError) {
        const favList = Array.isArray(favRes.data)
          ? favRes.data
          : (favRes.data.items || favRes.data.favorites?.items || favRes.data.data || []);

        if (Array.isArray(favList)) {
          const validFavs = favList.filter((item) => item && (item.product || item.productId));
          setFavorites(validFavs);
          try {
            localStorage.setItem("cached_favorites_items", JSON.stringify(validFavs));
            localStorage.setItem(`cached_favorites_items_${activeUserId}`, JSON.stringify(validFavs));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Non-blocking background app data sync:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Single mount execution
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchAllAppData();
    }

    const handleCartSync = () => {
      const activeId = getUserId();
      try {
        const userCached = localStorage.getItem(`cached_cart_items_${activeId}`);
        const stored = userCached || localStorage.getItem("cached_cart_items");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setCart(parsed);
        }
      } catch (e) {}
    };

    const handleFavoritesSync = () => {
      const activeId = getUserId();
      try {
        const userCached = localStorage.getItem(`cached_favorites_items_${activeId}`);
        const stored = userCached || localStorage.getItem("cached_favorites_items");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setFavorites(parsed);
        }
      } catch (e) {}
    };

    const handleAuthOrStorageSync = () => {
      handleCartSync();
      handleFavoritesSync();
      fetchAllAppData(true);
    };

    const handleLogoutSync = () => {
      setUser(null);
      setCart([]);
      setFavorites([]);
      setLoading(false);
    };

    window.addEventListener("cartUpdated", handleCartSync);
    window.addEventListener("favoritesUpdated", handleFavoritesSync);
    window.addEventListener("storage", handleAuthOrStorageSync);
    window.addEventListener("userLogin", handleAuthOrStorageSync);
    window.addEventListener("userUpdated", handleAuthOrStorageSync);
    window.addEventListener("profileUpdated", handleAuthOrStorageSync);
    window.addEventListener("userLogout", handleLogoutSync);

    return () => {
      window.removeEventListener("cartUpdated", handleCartSync);
      window.removeEventListener("favoritesUpdated", handleFavoritesSync);
      window.removeEventListener("storage", handleAuthOrStorageSync);
      window.removeEventListener("userLogin", handleAuthOrStorageSync);
      window.removeEventListener("userUpdated", handleAuthOrStorageSync);
      window.removeEventListener("profileUpdated", handleAuthOrStorageSync);
      window.removeEventListener("userLogout", handleLogoutSync);
    };
  }, [fetchAllAppData]);

  // Real-time automatic app data synchronization without refresh
  useLiveSync(["cart", "favorites", "users"], () => {
    fetchAllAppData(true);
  });

  // 3. Add to Cart (Optimistic + Backend Data Sync)
  const addToCart = useCallback(
    async (product, quantity = 1) => {
      const activeUserId = getUserId();
      const token = localStorage.getItem("token");
      const productId = String(product?._id || product?.id || product?.code || product);

      const formattedProduct = {
        _id: productId,
        id: productId,
        code: product?.code || "",
        itemDescription: product?.itemDescription || product?.itemName || product?.name || "Mhira Natural Product",
        itemName: product?.itemName || product?.itemDescription || product?.name || "Mhira Natural Product",
        name: product?.name || product?.itemDescription || product?.itemName || "Mhira Natural Product",
        price: Number(product?.price) > 0 ? Number(product?.price) : 200,
        originalPrice: product?.originalPrice || 0,
        image: (Array.isArray(product?.images) && product?.images[0]) || product?.image || product?.imageUrl || "",
        images: Array.isArray(product?.images) && product?.images.length > 0 ? product?.images : (product?.image ? [product.image] : []),
        category: product?.category || product?.navbarTag || "Skin Care",
      };

      // 1. Optimistic Update
      setCart((prev) => {
        const nextCart = [...prev];
        const idx = nextCart.findIndex((i) => {
          const pId = String(i.productId || i.product?._id || i.product?.id || i.product?.code || i.product);
          return pId === productId;
        });

        if (idx > -1) {
          nextCart[idx] = {
            ...nextCart[idx],
            quantity: (Number(nextCart[idx].quantity) || 0) + quantity,
          };
        } else {
          nextCart.unshift({
            productId,
            product: formattedProduct,
            quantity,
          });
        }

        try {
          safeSetItem("cached_cart_items", nextCart);
          if (activeUserId) {
            safeSetItem(`cached_cart_items_${activeUserId}`, nextCart);
          }
        } catch (e) {}

        return nextCart;
      });

      window.dispatchEvent(new Event("cartUpdated"));
      window.dispatchEvent(new CustomEvent("itemAddedToBag", { detail: { product: formattedProduct, quantity } }));

      // 2. Backend Sync
      if (activeUserId && token) {
        try {
          const res = await axios.post(
            `${API_BASE_URL}/api/cart/add`,
            {
              userId: activeUserId,
              productId,
              quantity,
              product: formattedProduct,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const returnedItems = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.cart?.items || []);
          if (Array.isArray(returnedItems) && returnedItems.length > 0) {
            const validItems = returnedItems.filter((item) => item && (item.product || item.productId));
            setCart(validItems);
            try {
              safeSetItem("cached_cart_items", validItems);
              safeSetItem(`cached_cart_items_${activeUserId}`, validItems);
            } catch (e) {}
            window.dispatchEvent(new Event("cartUpdated"));
          }
        } catch (err) {
          console.error("Background API sync failed (addToCart):", err);
        }
      }
    },
    []
  );

  // Update Cart Quantity (Optimistic + Backend Data Sync)
  const updateQuantity = useCallback(
    async (productId, change) => {
      const activeUserId = getUserId();
      const token = localStorage.getItem("token");
      const pStr = String(productId);

      setCart((prev) => {
        const nextCart = prev
          .map((item) => {
            const iId = String(item.productId || item.product?._id || item.product?.id || item.product?.code || item._id || "");
            if (iId === pStr) {
              const nextQty = (Number(item.quantity) || 1) + change;
              return nextQty > 0 ? { ...item, quantity: nextQty } : null;
            }
            return item;
          })
          .filter(Boolean);

        try {
          safeSetItem("cached_cart_items", nextCart);
          if (activeUserId) {
            safeSetItem(`cached_cart_items_${activeUserId}`, nextCart);
          }
        } catch (e) {}

        return nextCart;
      });

      window.dispatchEvent(new Event("cartUpdated"));

      if (activeUserId && token) {
        try {
          const res = await axios.put(
            `${API_BASE_URL}/api/cart/update-quantity`,
            {
              userId: activeUserId,
              productId: pStr,
              change,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const returnedItems = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.cart?.items || []);
          if (Array.isArray(returnedItems) && returnedItems.length > 0) {
            const validItems = returnedItems.filter((item) => item && (item.product || item.productId));
            setCart(validItems);
            try {
              safeSetItem("cached_cart_items", validItems);
              safeSetItem(`cached_cart_items_${activeUserId}`, validItems);
            } catch (e) {}
            window.dispatchEvent(new Event("cartUpdated"));
          }
        } catch (err) {
          console.error("Background API sync failed (updateQuantity):", err);
        }
      }
    },
    []
  );
  const updateCartQuantity = updateQuantity;

  // Remove from Cart (Optimistic + Backend Data Sync)
  const removeFromCart = useCallback(
    async (productId) => {
      const activeUserId = getUserId();
      const token = localStorage.getItem("token");
      const pStr = String(productId);

      setCart((prev) => {
        const nextCart = prev.filter((item) => {
          const iId = String(item.productId || item.product?._id || item.product?.id || item.product?.code || item._id || "");
          const subId = String(item.product?._id || item.product?.id || item.product?.code || "");
          return iId !== pStr && subId !== pStr;
        });

        try {
          safeSetItem("cached_cart_items", nextCart);
          if (activeUserId) {
            safeSetItem(`cached_cart_items_${activeUserId}`, nextCart);
          }
        } catch (e) {}

        return nextCart;
      });

      window.dispatchEvent(new Event("cartUpdated"));

      if (activeUserId && token) {
        try {
          const res = await axios.delete(`${API_BASE_URL}/api/cart/remove/${activeUserId}/${encodeURIComponent(pStr)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const returnedItems = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.cart?.items || []);
          if (Array.isArray(returnedItems)) {
            const validItems = returnedItems.filter((item) => item && (item.product || item.productId));
            setCart(validItems);
            try {
              safeSetItem("cached_cart_items", validItems);
              safeSetItem(`cached_cart_items_${activeUserId}`, validItems);
            } catch (e) {}
            window.dispatchEvent(new Event("cartUpdated"));
          }
        } catch (err) {
          console.error("Background API sync failed (removeFromCart):", err);
        }
      }
    },
    []
  );

  // Clear Cart
  const clearCart = useCallback(async () => {
    const activeUserId = getUserId();
    const token = localStorage.getItem("token");
    setCart([]);
    try {
      safeSetItem("cached_cart_items", []);
      if (activeUserId) {
        safeSetItem(`cached_cart_items_${activeUserId}`, []);
      }
    } catch (e) {}

    window.dispatchEvent(new Event("cartUpdated"));

    if (activeUserId && token) {
      try {
        await axios.delete(`${API_BASE_URL}/api/cart/clear/${activeUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Background API sync failed (clearCart):", err);
      }
    }
  }, []);

  // Helper to match target product against stored favorite item
  const isMatchingFavoriteItem = useCallback((favItem, target) => {
    if (!favItem || !target) return false;
    const targetObj = typeof target === "object" ? target : null;
    const targetIdStr = String(
      targetObj?._id ||
      targetObj?.id ||
      targetObj?.code ||
      (typeof target === "string" ? target : "")
    ).trim();
    const targetCode = String(targetObj?.code || "").trim();

    const favProductId = String(favItem?.productId || "").trim();
    const favSubProdId = String(favItem?.product?._id || favItem?.product?.id || "").trim();
    const favCode = String(favItem?.product?.code || favItem?.code || "").trim();

    if (targetIdStr && (targetIdStr === favProductId || targetIdStr === favSubProdId || (targetCode && targetIdStr === favCode))) {
      return true;
    }
    if (targetCode && favCode && targetCode === favCode) {
      return true;
    }

    return false;
  }, []);

  // Quick check if a product is favorited
  const isFavorite = useCallback((product) => {
    if (!product || !Array.isArray(favorites)) return false;
    return favorites.some((item) => isMatchingFavoriteItem(item, product));
  }, [favorites, isMatchingFavoriteItem]);

  // 4. Toggle Favorite (Optimistic + Backend Data Sync)
  const toggleFavorite = useCallback(
    async (product) => {
      const activeUserId = getUserId();
      const token = localStorage.getItem("token");
      const productId = String(product?._id || product?.id || product?.code || product);

      const formattedProduct = {
        _id: productId,
        id: productId,
        code: product?.code || "",
        itemDescription: product?.itemDescription || product?.itemName || product?.name || "Mhira Natural Product",
        itemName: product?.itemName || product?.itemDescription || product?.name || "Mhira Natural Product",
        name: product?.name || product?.itemDescription || product?.itemName || "Mhira Natural Product",
        price: Number(product?.price) > 0 ? Number(product?.price) : 200,
        originalPrice: Number(product?.originalPrice) > 0 ? Number(product?.originalPrice) : 0,
        image: (Array.isArray(product?.images) && product?.images[0]) || product?.image || product?.imageUrl || "",
        images: Array.isArray(product?.images) && product?.images.length > 0 ? product?.images : (product?.image ? [product.image] : []),
        category: product?.category || product?.navbarTag || "Skin Care",
        specification: product?.specification || "",
        uom: product?.uom || "PCS",
      };

      // 1. Read existing cached favorites synchronously
      let currentFavs = [];
      try {
        const userCached = activeUserId ? localStorage.getItem(`cached_favorites_items_${activeUserId}`) : null;
        const stored = userCached || localStorage.getItem("cached_favorites_items");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) currentFavs = parsed;
        }
      } catch (e) {}

      const exists = currentFavs.some((item) => isMatchingFavoriteItem(item, product));
      const willFavorite = !exists;

      // 2. Compute updated favorites list
      let nextFavs;
      if (exists) {
        nextFavs = currentFavs.filter((item) => !isMatchingFavoriteItem(item, product));
      } else {
        nextFavs = [{ productId, product: formattedProduct, addedAt: new Date() }, ...currentFavs];
      }

      // 3. Immediately persist locally
      try {
        safeSetItem("cached_favorites_items", nextFavs);
        if (activeUserId) {
          safeSetItem(`cached_favorites_items_${activeUserId}`, nextFavs);
        }
      } catch (e) {}

      // 4. Update React Context state & notify all components
      setFavorites(nextFavs);
      window.dispatchEvent(new Event("favoritesUpdated"));

      if (willFavorite) {
        window.dispatchEvent(
          new CustomEvent("itemAddedToFavorites", {
            detail: { product: formattedProduct },
          })
        );
      }

      // 5. Asynchronously sync with Backend API
      if (activeUserId) {
        API.post(
          "/api/favorites/toggle",
          {
            userId: activeUserId,
            productId,
            product: formattedProduct,
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        )
          .then((res) => {
            const returnedFavs = Array.isArray(res.data)
              ? res.data
              : res.data?.items || res.data?.favorites?.items || [];
            if (Array.isArray(returnedFavs)) {
              const validFavs = returnedFavs.filter(
                (item) => item && (item.product || item.productId)
              );
              setFavorites(validFavs);
              try {
                safeSetItem("cached_favorites_items", validFavs);
                safeSetItem(`cached_favorites_items_${activeUserId}`, validFavs);
              } catch (e) {}
              window.dispatchEvent(new Event("favoritesUpdated"));
            }
          })
          .catch((err) => {
            console.warn("Background API sync failed (toggleFavorite):", err?.message);
          });
      }

      return willFavorite;
    },
    [isMatchingFavoriteItem]
  );
  const addToFavorite = toggleFavorite;

  // Remove Favorite (Optimistic + Backend Data Sync)
  const removeFavorite = useCallback(
    async (productId) => {
      const activeUserId = getUserId();
      const token = localStorage.getItem("token");
      const pStr = String(productId);

      setFavorites((prev) => {
        const nextFavs = prev.filter((item) => !isMatchingFavoriteItem(item, pStr));

        try {
          safeSetItem("cached_favorites_items", nextFavs);
          if (activeUserId) {
            safeSetItem(`cached_favorites_items_${activeUserId}`, nextFavs);
          }
        } catch (e) {}

        return nextFavs;
      });

      window.dispatchEvent(new Event("favoritesUpdated"));

      if (activeUserId && token) {
        try {
          const res = await axios.delete(
            `${API_BASE_URL}/api/favorites/remove/${activeUserId}/${encodeURIComponent(pStr)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const returnedFavs = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.favorites?.items || []);
          if (Array.isArray(returnedFavs)) {
            const validFavs = returnedFavs.filter((item) => item && (item.product || item.productId));
            setFavorites(validFavs);
            try {
              safeSetItem("cached_favorites_items", validFavs);
              safeSetItem(`cached_favorites_items_${activeUserId}`, validFavs);
            } catch (e) {}
            window.dispatchEvent(new Event("favoritesUpdated"));
          }
        } catch (err) {
          console.error("Background API sync failed (removeFavorite):", err);
        }
      }
    },
    [isMatchingFavoriteItem]
  );

  const value = {
    user,
    cart,
    favorites,
    loading,
    error,
    setUser,
    setCart,
    setFavorites,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleFavorite,
    addToFavorite,
    removeFavorite,
    isFavorite,
    isMatchingFavoriteItem,
    refetchAppData: fetchAllAppData,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    return {
      user: null,
      cart: [],
      favorites: [],
      loading: false,
      error: null,
      setUser: () => {},
      setCart: () => {},
      setFavorites: () => {},
      addToCart: () => {},
      updateCartQuantity: () => {},
      removeFromCart: () => {},
      clearCart: () => {},
      toggleFavorite: () => false,
      addToFavorite: () => false,
      removeFavorite: () => {},
      isFavorite: () => false,
      isMatchingFavoriteItem: () => false,
      refetchAppData: () => {},
    };
  }
  return context;
}

export { AppDataContext };
export default AppDataProvider;

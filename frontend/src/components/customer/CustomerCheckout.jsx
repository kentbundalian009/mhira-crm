import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Plus,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Truck,
  Ticket,
  AlertTriangle,
  X,
  ArrowLeft,
  Check,
  ShoppingBag,
  Loader2,
  Banknote,
  FileText,
  MoreHorizontal,
  CreditCard,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios, { API } from "../../axios";

import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { getUserId, isUserLoggedIn } from "../../utils/userId";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_BASE_URL =
  !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

const getImageUrl = (url) => {
  if (!url || typeof url !== "string" || url.trim() === "" || url === "/mhira_removebg.png" || url === "mhira_removebg.png") {
    return "/mhira_removebg.png";
  }
  let trimmed = url.trim();
  if (trimmed.includes("localhost:5000")) {
    trimmed = trimmed.replace(/^https?:\/\/localhost:5000\/?/, "");
    return `${API_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  return `${API_BASE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
};

// ==========================================
// AUTHENTIC PAYMENT CHANNEL LOGOS (PAYMONGO)
// ==========================================
const MastercardLogo = () => (
  <div className="h-5 px-1.5 rounded bg-white border border-gray-200 flex items-center justify-center shadow-2xs shrink-0 select-none" title="Mastercard">
    <svg viewBox="0 0 32 20" className="h-3 w-auto">
      <circle cx="11" cy="10" r="7.5" fill="#EB001B" />
      <circle cx="21" cy="10" r="7.5" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  </div>
);

const VisaLogo = () => (
  <div className="h-5 px-2 rounded bg-white border border-gray-200 flex items-center justify-center shadow-2xs shrink-0 select-none" title="Visa">
    <span className="font-black italic text-[11px] tracking-tight text-[#1A1F71] leading-none">
      VISA
    </span>
  </div>
);

const GCashLogo = () => (
  <div className="h-5 px-1.5 rounded bg-[#005CE6] flex items-center justify-center gap-1 shadow-2xs shrink-0 select-none text-white font-bold" title="GCash">
    <span className="w-2.5 h-2.5 rounded-full bg-white text-[#005CE6] flex items-center justify-center text-[7px] font-black leading-none">G</span>
    <span className="text-[10px] font-extrabold tracking-tight">GCash</span>
  </div>
);

const MayaLogo = () => (
  <div className="h-5 px-2 rounded bg-black flex items-center justify-center shadow-2xs shrink-0 select-none" title="Maya">
    <span className="text-[#00E575] font-black text-[10px] tracking-tight lowercase">
      maya
    </span>
  </div>
);

const GrabPayLogo = () => (
  <div className="h-5 px-1.5 rounded bg-[#00B14F] flex items-center justify-center shadow-2xs shrink-0 select-none" title="GrabPay">
    <span className="text-white font-bold text-[9px] tracking-tight">
      GrabPay
    </span>
  </div>
);

const BPILogo = () => (
  <div className="h-5 px-1.5 rounded bg-[#B11116] flex items-center justify-center gap-0.5 shadow-2xs shrink-0 select-none" title="BPI Online">
    <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-white">
      <path d="M8 1L2 4v4c0 4 2.8 6.9 6 7.8 3.2-.9 6-3.8 6-7.8V4L8 1zm0 3.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zm0 5c1.4 0 2.8.6 3.2 1.6-.8.8-2 1.4-3.2 1.4s-2.4-.6-3.2-1.4c.4-1 1.8-1.6 3.2-1.6z"/>
    </svg>
    <span className="text-white font-bold text-[9px] tracking-wider">
      BPI
    </span>
  </div>
);

const BillEaseLogo = () => (
  <div className="h-5 px-1.5 rounded bg-white border border-gray-200 flex items-center justify-center shadow-2xs shrink-0 select-none" title="BillEase">
    <span className="font-extrabold text-[9px] text-[#0B2545]">bill</span>
    <span className="font-extrabold text-[9px] text-[#FF5A5F]">ease</span>
  </div>
);

function CustomerCheckout() {
  const navigate = useNavigate();
  const userId = getUserId();

  // User & Data States
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Addresses List & Selection (Ship to)
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);

  // Payment Option
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery"); // 'Cash on Delivery' | 'Bank Deposit' | 'E-Wallet / Online Payment (PayMongo)'

  // Loyalty Points Redemption
  const [usePoints, setUsePoints] = useState(false);

  // Special Notes from Cart
  const [customerMessage, setCustomerMessage] = useState(() => {
    try {
      return localStorage.getItem("cart_special_instructions") || "";
    } catch {
      return "";
    }
  });

  // UI Accordions & Confirmation Modal
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);

  // Voucher Management States
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showCouponsDropdown, setShowCouponsDropdown] = useState(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  // Load Initial Data (Cart Items, User Profile, Addresses)
  useEffect(() => {
    const fetchCheckoutData = async () => {
      const activeUserId = getUserId();
      if (!isUserLoggedIn() || !activeUserId) {
        showErrorToast("Please log in to your customer account to proceed to checkout.");
        navigate("/login");
        return;
      }

      // 0ms Instant Local Storage Read
      try {
        const userCached = localStorage.getItem(`cached_cart_items_${activeUserId}`);
        const stored = userCached || localStorage.getItem("cached_cart_items");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCheckoutItems(parsed);
          }
        }

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setUserProfile(u);
        }
      } catch (e) {}

      try {
        setLoading(true);
        const [cartRes, profileRes, addrRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/cart/${activeUserId}`),
          axios.get(`${API_BASE_URL}/api/users/profile/${activeUserId}`),
          axios.get(`${API_BASE_URL}/api/users/${activeUserId}/addresses`),
        ]);

        if (cartRes.status === "fulfilled" && cartRes.value.data?.items) {
          const valid = cartRes.value.data.items.filter((i) => i && i.product);
          setCheckoutItems(valid);
        }

        let prof = null;
        if (profileRes.status === "fulfilled" && profileRes.value.data) {
          prof = profileRes.value.data.user || profileRes.value.data;
          setUserProfile(prof);
        }

        let loadedAddresses = [];
        if (addrRes.status === "fulfilled" && Array.isArray(addrRes.value.data?.addresses)) {
          loadedAddresses = addrRes.value.data.addresses;
        }

        if (loadedAddresses.length === 0 && prof?.shippingAddress?.street) {
          loadedAddresses = [{
            _id: "default_addr",
            fullName: prof.fullName || "Kent Bundalian",
            phoneNumber: prof.phoneNumber || "+63 9154673941",
            streetAddress: prof.shippingAddress.street,
            street: prof.shippingAddress.street,
            apartment: prof.shippingAddress.apartment || "",
            barangay: prof.shippingAddress.barangay || "",
            city: prof.shippingAddress.city || "",
            province: prof.shippingAddress.province || "Laguna",
            postalCode: prof.shippingAddress.postalCode || "4027",
            label: "Home",
            isDefault: true,
          }];
        }

        // Fallback default address matching user's address if none exists
        if (loadedAddresses.length === 0) {
          loadedAddresses = [{
            _id: "default_addr",
            fullName: prof?.fullName || "Kent Bundalian",
            phoneNumber: prof?.phoneNumber || "+63 9154673941",
            streetAddress: "Citadel Residence, Block 25 Lot 1, Phase 1, Uwisan",
            street: "Citadel Residence, Block 25 Lot 1, Phase 1, Uwisan",
            apartment: "",
            barangay: "Uwisan",
            city: "Calamba City",
            province: "Laguna",
            postalCode: "4027",
            label: "Home",
            isDefault: true,
          }];
        }

        setAddresses(loadedAddresses);
        const defaultA = loadedAddresses.find((a) => a.isDefault) || loadedAddresses[0];
        setSelectedAddress(defaultA);

        // Fetch active coupons for quick selection
        axios.get(`${API_BASE_URL}/api/coupons`).then((res) => {
          if (Array.isArray(res.data)) {
            setAvailableCoupons(res.data.filter((c) => c.status === "Active"));
          }
        }).catch(() => {});
      } catch (err) {
        console.error("Fetch checkout data error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [navigate]);

  // Calculations
  const merchandiseSubtotal = useMemo(() => {
    return checkoutItems.reduce((acc, item) => {
      const p = Number(item.product?.price ?? item.price ?? 0);
      const q = Number(item.quantity || 1);
      return acc + p * q;
    }, 0);
  }, [checkoutItems]);

  const totalItemCount = useMemo(() => {
    return checkoutItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  }, [checkoutItems]);

  // Dynamic Shipping Fee based on Location & Products
  const [shippingFee, setShippingFee] = useState(85.0);
  const [shippingLocationLabel, setShippingLocationLabel] = useState("Luzon · ₱85.00");
  const [shippingDetails, setShippingDetails] = useState(null);

  useEffect(() => {
    const calculateDynamicShipping = async () => {
      const activeAddress =
        selectedAddress ||
        (userProfile?.shippingAddress?.street
          ? userProfile.shippingAddress
          : "Calamba City, Laguna");

      try {
        const res = await axios.post(`${API_BASE_URL}/api/shipping-rates/calculate`, {
          address: activeAddress,
          items: checkoutItems.map((i) => ({
            product: i.product?._id || i.product?.id || i._id,
            price: Number(i.product?.price ?? i.price ?? 0),
            quantity: Number(i.quantity || 1),
          })),
          subtotal: merchandiseSubtotal,
        });

        if (res.data?.success) {
          const fee = Number(res.data.shippingFee || 0);
          setShippingFee(fee);
          setShippingDetails(res.data);
          if (fee === 0) {
            setShippingLocationLabel(
              res.data.isOverFreeThreshold
                ? `Free Delivery Promo · ₱0.00 (${res.data.matchedRegion})`
                : `Free Shipping · ₱0.00 (${res.data.matchedRegion})`
            );
          } else {
            setShippingLocationLabel(`${res.data.matchedRegion} · ₱${fee.toFixed(2)}`);
          }
        }
      } catch (err) {
        // Fallback address analysis
        const addrText =
          typeof activeAddress === "string"
            ? activeAddress.toLowerCase()
            : `${activeAddress?.province || ""} ${activeAddress?.city || ""}`.toLowerCase();

        let estFee = 85.0;
        let regName = "Luzon";
        if (addrText.includes("laguna") || addrText.includes("calamba")) {
          estFee = 50.0;
          regName = "Laguna (Special Hub Rate)";
        } else if (
          addrText.includes("manila") ||
          addrText.includes("ncr") ||
          addrText.includes("quezon city") ||
          addrText.includes("makati") ||
          addrText.includes("taguig")
        ) {
          estFee = 65.0;
          regName = "Metro Manila (NCR)";
        } else if (
          addrText.includes("cebu") ||
          addrText.includes("visayas") ||
          addrText.includes("iloilo")
        ) {
          estFee = 135.0;
          regName = "Visayas";
        } else if (addrText.includes("davao") || addrText.includes("mindanao")) {
          estFee = 155.0;
          regName = "Mindanao";
        }

        if (merchandiseSubtotal >= 1500) {
          setShippingFee(0);
          setShippingLocationLabel(`Free Delivery Promo · ₱0.00 (${regName})`);
        } else {
          setShippingFee(estFee);
          setShippingLocationLabel(`${regName} · ₱${estFee.toFixed(2)}`);
        }
      }
    };

    calculateDynamicShipping();
  }, [selectedAddress, userProfile, merchandiseSubtotal, checkoutItems]);

  const availablePoints = Number(userProfile?.rewardPoints || 0);

  // Voucher calculation
  const voucherDiscount = useMemo(() => {
    if (!appliedVoucher || merchandiseSubtotal <= 0) return 0;
    if (appliedVoucher.discountAmount != null && !isNaN(Number(appliedVoucher.discountAmount))) {
      return Math.min(merchandiseSubtotal, Number(appliedVoucher.discountAmount));
    }
    const discountStr = String(appliedVoucher.discount || "").toUpperCase();
    if (discountStr.includes("%")) {
      const pct = parseFloat(discountStr) || 0;
      return Math.round((merchandiseSubtotal * (pct / 100)) * 100) / 100;
    }
    const flat = Number(discountStr.replace(/[^0-9.]/g, "")) || 0;
    return Math.min(merchandiseSubtotal, flat);
  }, [appliedVoucher, merchandiseSubtotal]);

  // Points redemption calculation (1 point = ₱1.00 discount)
  const maxPointsCanUse = Math.max(0, Math.floor(merchandiseSubtotal - voucherDiscount));
  const effectivePointsRedeemed = usePoints ? Math.min(availablePoints, maxPointsCanUse) : 0;
  const pointsDiscount = effectivePointsRedeemed;

  const totalPayment = Math.max(0, merchandiseSubtotal + shippingFee - voucherDiscount - pointsDiscount);

  // Voucher Apply Handler
  const handleApplyVoucher = async (codeToUse) => {
    const code = (typeof codeToUse === "string" ? codeToUse : voucherCodeInput).trim().toUpperCase();
    if (!code) {
      showErrorToast("Please enter a voucher code.");
      return;
    }

    try {
      setValidatingVoucher(true);
      const res = await axios.post(`${API_BASE_URL}/api/coupons/validate`, {
        code,
        subtotal: merchandiseSubtotal,
        userId,
      });

      if (res.data?.valid && res.data?.coupon) {
        setAppliedVoucher({
          ...res.data.coupon,
          discountAmount: res.data.discountAmount,
        });
        setVoucherCodeInput("");
        setShowCouponsDropdown(false);
        showSuccessToast(`Voucher ${code} applied successfully! 🎉`);
      } else {
        showErrorToast(res.data?.message || "Invalid voucher code.");
      }
    } catch (err) {
      console.error("Voucher apply error:", err);
      showErrorToast(err.response?.data?.message || "Could not apply voucher code.");
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    showSuccessToast("Voucher removed.");
  };

  // Address Display Helper
  const formattedAddressText = useMemo(() => {
    if (selectedAddress) {
      const street = selectedAddress.streetAddress || selectedAddress.street || "";
      const apt = selectedAddress.apartment || "";
      const brgy = selectedAddress.barangay
        ? `Brgy. ${selectedAddress.barangay.replace(/^Brgy\.?\s*/i, "")}`
        : "";
      const city = selectedAddress.city || "";
      const prov = selectedAddress.province || selectedAddress.region || "";
      const zip = selectedAddress.postalCode || "";

      const parts = [street, apt, brgy, city, prov, zip].filter(Boolean);
      return parts.join(", ");
    }
    if (userProfile?.shippingAddress?.street) {
      const s = userProfile.shippingAddress;
      return [
        s.street,
        s.apartment,
        s.barangay ? `Brgy. ${s.barangay.replace(/^Brgy\.?\s*/i, "")}` : "",
        s.city,
        s.province,
        s.postalCode,
      ]
        .filter(Boolean)
        .join(", ");
    }
    return "Citadel Residence, Block 25 Lot 1, Phase 1, Uwisan, Brgy. Uwisan, Calamba City, Laguna, 4027";
  }, [selectedAddress, userProfile]);

  const formattedRecipientName = useMemo(() => {
    if (selectedAddress?.fullName) return selectedAddress.fullName;
    return userProfile?.fullName || "Kent Bundalian";
  }, [selectedAddress, userProfile]);

  const activePhone = useMemo(() => {
    return selectedAddress?.phoneNumber || userProfile?.phoneNumber || "+63 9154673941";
  }, [selectedAddress, userProfile]);

  // Handle Switch Address
  const handleSelectAddress = (addr) => {
    setSelectedAddress(addr);
    setIsAddressSelectorOpen(false);
  };

  // Open Confirmation Modal before Placing Order
  const handleCompleteOrderClick = () => {
    if (checkoutItems.length === 0) {
      showErrorToast("Your bag is empty. Please add items before checking out.");
      navigate("/cart");
      return;
    }
    setIsConfirmOrderModalOpen(true);
  };

  // Detect cancelled payment attempt from PayMongo redirect
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("payment") === "cancelled") {
        showErrorToast("Online payment was cancelled or not completed. You can try again or choose Cash on Delivery.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}
  }, []);

  // Execute Order Placement upon Modal Confirmation
  const executePlaceOrder = async () => {
    setPlacingOrder(true);
    try {
      const activeRecipient = formattedRecipientName;
      const activeAddressStr = formattedAddressText;
      const finalShippingAddress = `${activeRecipient} (${activePhone}) - ${activeAddressStr}${customerMessage ? ` [Note: ${customerMessage.trim()}]` : ""}`;

      const isPayMongo =
        paymentMethod === "E-Wallet / Online Payment (PayMongo)" ||
        paymentMethod.includes("PayMongo") ||
        paymentMethod.includes("E-Wallet") ||
        paymentMethod.includes("GCash");

      if (isPayMongo) {
        const res = await axios.post(`${API_BASE_URL}/api/payments/create-checkout-session`, {
          userId,
          shippingAddress: finalShippingAddress,
          customerNotes: customerMessage.trim(),
          shippingFee,
          protectionFee: 0,
          voucherCode: appliedVoucher?.code || "",
          voucherDiscount,
          pointsRedeemed: effectivePointsRedeemed,
          items: checkoutItems.map((item) => {
            const p = item.product || item;
            const rawImg = (p.images && p.images[0]) || p.image || item.image || "";
            return {
              product: p._id || p.id || item._id,
              name: p.itemDescription || p.itemName || p.name || "Natural Botanical Item",
              price: Number(p.price || item.price || 0),
              quantity: Number(item.quantity || 1),
              image: getImageUrl(rawImg),
            };
          }),
          successUrl: `${window.location.origin}/orders?payment=success`,
          cancelUrl: `${window.location.origin}/checkout?payment=cancelled`,
        });

        if (res.data?.checkoutUrl) {
          try {
            localStorage.removeItem("cached_cart_items");
            if (userId) localStorage.removeItem(`cached_cart_items_${userId}`);
            localStorage.removeItem("cart_special_instructions");

            if (res.data?.order) {
              const existingOrders = JSON.parse(localStorage.getItem("cached_customer_orders") || "[]");
              localStorage.setItem("cached_customer_orders", JSON.stringify([res.data.order, ...existingOrders]));
            }
          } catch (e) {}

          window.dispatchEvent(new Event("cartUpdated"));
          window.dispatchEvent(new Event("ordersUpdated"));
          setIsConfirmOrderModalOpen(false);
          showSuccessToast("Redirecting to PayMongo payment gateway... 💳");
          window.location.href = res.data.checkoutUrl;
          return;
        }
      }

      // Default COD or Bank Deposit flow
      const res = await axios.post(`${API_BASE_URL}/api/orders/checkout`, {
        userId,
        shippingAddress: finalShippingAddress,
        customerNotes: customerMessage.trim(),
        paymentMethod: paymentMethod || "Cash on Delivery",
        shippingFee,
        protectionFee: 0,
        voucherCode: appliedVoucher?.code || "",
        voucherDiscount,
        pointsRedeemed: effectivePointsRedeemed,
        items: checkoutItems.map((item) => {
          const p = item.product || item;
          const rawImg = (p.images && p.images[0]) || p.image || item.image || "";
          return {
            product: p._id || p.id || item._id,
            name: p.itemDescription || p.itemName || p.name || "Natural Botanical Item",
            price: Number(p.price || item.price || 0),
            quantity: Number(item.quantity || 1),
            image: getImageUrl(rawImg),
          };
        }),
      });

      // Clear local cart
      try {
        localStorage.removeItem("cached_cart_items");
        if (userId) localStorage.removeItem(`cached_cart_items_${userId}`);
        localStorage.removeItem("cart_special_instructions");

        if (res.data?.order) {
          const existingOrders = JSON.parse(localStorage.getItem("cached_customer_orders") || "[]");
          localStorage.setItem("cached_customer_orders", JSON.stringify([res.data.order, ...existingOrders]));
        }
      } catch (e) {}

      window.dispatchEvent(new Event("cartUpdated"));
      window.dispatchEvent(new Event("ordersUpdated"));
      setIsConfirmOrderModalOpen(false);
      showSuccessToast("Order placed successfully! 🛍️");
      navigate("/orders");
    } catch (err) {
      console.error("Order error:", err);
      showErrorToast(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to place order. Please try again."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* BREADCRUMB & PAGE HEADER (CONSISTENT WITH HOME / CART / COLLECTION) */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3 flex items-center">
            <Link to="/" className="hover:underline text-slate-500">Home</Link>
            <span className="mx-2 text-slate-400">/</span>
            <Link to="/cart" className="hover:underline text-slate-500">Cart</Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-900 font-medium">Checkout</span>
          </nav>

          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h1 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
              Checkout {totalItemCount > 0 && `(${totalItemCount})`}
            </h1>
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT (CONSISTENT WITH CART LAYOUT: 8 COLS FORM + 4 COLS SUMMARY) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: GUDDS/SHOPIFY CHECKOUT FLOW */}
          <div className="lg:col-span-8 space-y-5">

            {/* 1. USER ACCOUNT BAR */}
            <div className="flex items-center justify-between py-1 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#EDF7EE] text-[#01390f] border border-[#D5EAD7] font-bold text-xs flex items-center justify-center shrink-0 select-none">
                  {(userProfile?.email || "K").charAt(0).toUpperCase()}
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                  {userProfile?.email || "kentbundalian009@gmail.com"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate("/account")}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Account options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* 2. "SHIP TO" & "SHIPPING" SUMMARY CARD */}
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200 shadow-2xs overflow-hidden">
              {/* Row 1: Ship to */}
              <div
                onClick={() => setIsAddressSelectorOpen((prev) => !prev)}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xs text-slate-400 font-normal w-14 shrink-0 pt-0.5">
                    Ship to
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {selectedAddress?.label && (
                        <span className="text-[10px] font-semibold bg-[#01390f]/10 text-[#01390f] px-2 py-0.5 rounded-full border border-[#01390f]/20">
                          {selectedAddress.label}
                        </span>
                      )}
                      {selectedAddress?.isDefault && (
                        <span className="text-[9px] font-semibold bg-[#01390f] text-white px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-xs sm:text-sm text-slate-900 leading-relaxed">
                      {formattedAddressText}
                    </p>
                    {selectedAddress?.deliveryInstructions && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">
                        Instructions: "{selectedAddress.deliveryInstructions}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#01390f] font-semibold hover:underline hidden sm:inline">
                    Change
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isAddressSelectorOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Saved Addresses Dropdown (if toggled) */}
              {isAddressSelectorOpen && (
                <div className="p-3.5 bg-slate-50/80 border-t border-gray-200 space-y-2.5 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between px-1">
                    <p className="font-semibold text-slate-700">Select Delivery Address:</p>
                    <Link
                      to="/account?tab=addresses"
                      className="text-[11px] font-semibold text-[#01390f] hover:underline"
                    >
                      + Manage Addresses
                    </Link>
                  </div>
                  {addresses.length === 0 ? (
                    <div className="p-3 bg-white rounded-xl border border-gray-200 text-slate-500 text-xs">
                      No saved addresses found.{" "}
                      <Link to="/account?tab=addresses" className="text-[#01390f] font-semibold underline">
                        Add an address in your account
                      </Link>
                    </div>
                  ) : (
                    addresses.map((addr) => {
                      const isSelected =
                        (selectedAddress?._id && selectedAddress._id === addr._id) ||
                        (selectedAddress?.id && selectedAddress.id === addr.id) ||
                        (!selectedAddress?._id && selectedAddress?.street === (addr.streetAddress || addr.street));
                      const addrStreet = addr.streetAddress || addr.street || "";
                      const addrFull = [
                        addrStreet,
                        addr.apartment,
                        addr.barangay ? `Brgy. ${addr.barangay.replace(/^Brgy\.?\s*/i, "")}` : "",
                        addr.city,
                        addr.province || addr.region,
                        addr.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ");

                      return (
                        <div
                          key={addr._id || addr.id || addr.street}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAddress(addr);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-white border-[#01390f] shadow-xs ring-1 ring-[#01390f]/20"
                              : "bg-white border-gray-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {addr.label && (
                                <span className="text-[10px] font-semibold bg-[#EDF7EE] text-[#01390f] px-2 py-0.5 rounded border border-[#01390f]/15">
                                  {addr.label}
                                </span>
                              )}
                              {addr.isDefault && (
                                <span className="text-[9px] font-semibold bg-[#01390f] text-white px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800 text-xs font-normal leading-relaxed">
                              {addrFull}
                            </p>
                            {addr.deliveryInstructions && (
                              <p className="text-slate-500 italic text-[11px]">
                                "{addr.deliveryInstructions}"
                              </p>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#01390f] shrink-0 mt-0.5" />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Row 2: Shipping */}
              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs sm:text-sm select-none">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-slate-400 font-normal w-14 shrink-0">
                    Shipping
                  </span>
                  <span className="font-semibold text-slate-900 truncate">
                    {shippingLocationLabel}
                  </span>
                </div>
                {shippingDetails?.estimatedDays && (
                  <span className="text-[11px] text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full font-semibold shrink-0">
                    {shippingDetails.estimatedDays}
                  </span>
                )}
              </div>
            </div>

            {/* 3. "PAYMENT" SECTION */}
            <div className="space-y-2 pt-1">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Payment
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  All transactions are secure and encrypted.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-2xs divide-y divide-gray-200">
                {/* OPTION 1: E-WALLET & ONLINE PAYMENT (PAYMONGO: GCASH, MAYA, CARDS, BPI, BILLEASE) */}
                <div>
                  <label
                    onClick={() => setPaymentMethod("E-Wallet / Online Payment (PayMongo)")}
                    className={`p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-colors ${
                      paymentMethod === "E-Wallet / Online Payment (PayMongo)"
                        ? "bg-[#EDF7EE]/70"
                        : "hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          paymentMethod === "E-Wallet / Online Payment (PayMongo)"
                            ? "border-[#01390f]"
                            : "border-slate-300"
                        }`}
                      >
                        {paymentMethod === "E-Wallet / Online Payment (PayMongo)" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#01390f]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 block select-none">
                          E-Wallets, Cards & Online Banking
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          Instant checkout via PayMongo gateway
                        </span>
                      </div>
                    </div>

                    {/* Channel Logos Preview */}
                    <div className="flex items-center gap-1 shrink-0 ml-2 overflow-x-auto">
                      <MastercardLogo />
                      <VisaLogo />
                      <GCashLogo />
                      <MayaLogo />
                      <GrabPayLogo />
                    </div>
                  </label>

                  {paymentMethod === "E-Wallet / Online Payment (PayMongo)" && (
                    <div className="bg-[#EDF7EE]/50 px-4 py-3 text-xs text-slate-700 border-t border-gray-200 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#01390f] shrink-0 mt-0.5" />
                      <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-900 font-semibold">Note:</strong> Pag-click mo ng{" "}
                        <strong className="text-[#01390f]">Complete Order</strong>, ire-redirect ka sa PayMongo secure portal. Doon mo pipiliin ang iyong gustong payment method (Card, E-Wallets tulad ng GCash/Maya, Online Banking, o Buy Now Pay Later) sa kanilang mga tabs.
                      </p>
                    </div>
                  )}
                </div>

                {/* OPTION 2: CASH ON DELIVERY (COD) */}
                <div>
                  <label
                    onClick={() => setPaymentMethod("Cash on Delivery")}
                    className={`p-3.5 sm:p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                      paymentMethod === "Cash on Delivery"
                        ? "bg-[#EDF7EE]/60"
                        : "hover:bg-slate-50/60"
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === "Cash on Delivery"
                        ? "border-[#01390f]"
                        : "border-slate-300"
                    }`}>
                      {paymentMethod === "Cash on Delivery" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#01390f]" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 select-none">
                      Cash on Delivery (COD)
                    </span>
                  </label>

                  {paymentMethod === "Cash on Delivery" && (
                    <div className="bg-slate-100/90 px-4 py-3 text-xs text-slate-700 border-t border-gray-200">
                      Cash Payment / Pay upon parcel delivery to courier
                    </div>
                  )}
                </div>

                {/* OPTION 3: BANK DEPOSIT */}
                <label
                  onClick={() => setPaymentMethod("Bank Deposit")}
                  className={`p-3.5 sm:p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                    paymentMethod === "Bank Deposit"
                      ? "bg-[#EDF7EE]/60"
                      : "hover:bg-slate-50/60"
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    paymentMethod === "Bank Deposit"
                      ? "border-[#01390f]"
                      : "border-slate-300"
                  }`}>
                    {paymentMethod === "Bank Deposit" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#01390f]" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 select-none">
                    Bank Deposit
                  </span>
                </label>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: ORDER SUMMARY (MATCHING CART'S RIGHT COLUMN & BRAND STYLING) */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[116px] space-y-6">
              <h2 className="text-xl sm:text-2xl font-normal text-[#243746] tracking-tight">
                Order Summary
              </h2>

              <div className="space-y-4 text-sm text-slate-800">
                {/* ITEMS LIST (COLLAPSIBLE / CLEAN PREVIEW) */}
                <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {checkoutItems.map((item, idx) => {
                    const p = item.product || item;
                    const itemTitle = p.itemDescription || p.itemName || p.name || "Mhira Natural Product";
                    const itemPrice = Number(p.price || item.price || 0);
                    const itemQty = Number(item.quantity || 1);
                    const img = (p.images && p.images[0]) || p.image || "";

                    return (
                      <div key={idx} className="py-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getImageUrl(img)}
                            alt={itemTitle}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-50 border border-gray-200 shrink-0"
                            onError={(e) => { e.currentTarget.src = "/mhira_removebg.png"; }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate max-w-[150px] sm:max-w-[180px]">
                              {itemTitle}
                            </p>
                            <span className="text-slate-400 text-[11px]">Qty: {itemQty}</span>
                          </div>
                        </div>
                        <span className="font-semibold text-slate-900 font-mono shrink-0">
                          ₱{(itemPrice * itemQty).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* SPECIAL INSTRUCTION NOTE IF PRESENT */}
                {customerMessage && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-gray-200">
                    <strong className="text-slate-800">Special Instruction: </strong>
                    <span>{customerMessage}</span>
                  </div>
                )}

                {/* APPLY VOUCHER SECTION */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-[#01390f]" />
                      <span>Apply Voucher</span>
                    </span>
                    {availableCoupons.length > 0 && !appliedVoucher && (
                      <button
                        type="button"
                        onClick={() => setShowCouponsDropdown((prev) => !prev)}
                        className="text-[#01390f] hover:underline font-medium text-[11px] cursor-pointer"
                      >
                        {showCouponsDropdown ? "Hide promos" : "View available promos"}
                      </button>
                    )}
                  </div>

                  {appliedVoucher ? (
                    <div className="flex items-center justify-between bg-[#EDF7EE] border border-[#01390f]/20 rounded-xl px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Ticket className="w-4 h-4 text-[#01390f] shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-[#01390f] uppercase tracking-wider block">
                            {appliedVoucher.code}
                          </span>
                          <span className="text-[11px] text-emerald-800 block">
                            {appliedVoucher.discount} applied (-₱{voucherDiscount.toFixed(2)})
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-md hover:bg-white/60"
                        title="Remove voucher"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={voucherCodeInput}
                        onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyVoucher();
                          }
                        }}
                        placeholder="Voucher code (e.g. MHIRA30)"
                        className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        disabled={validatingVoucher || !voucherCodeInput.trim()}
                        onClick={() => handleApplyVoucher()}
                        className="px-5 py-2 sm:py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] disabled:opacity-40 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                      >
                        {validatingVoucher ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Apply</span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* REWARD POINTS REDEMPTION SECTION */}
                  {availablePoints > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className={`p-3 rounded-xl border transition-all ${
                        usePoints ? 'bg-amber-50/70 border-amber-300 shadow-2xs' : 'bg-slate-50 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={usePoints}
                              onChange={(e) => setUsePoints(e.target.checked)}
                              className="w-4 h-4 rounded text-[#01390f] focus:ring-[#01390f] border-gray-300 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                <span>⭐</span>
                                <span>Redeem Mhira Reward Points</span>
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                Available: <strong className="text-amber-700">{availablePoints}</strong> pts (₱{availablePoints}.00 value)
                              </span>
                            </div>
                          </label>
                          {usePoints && effectivePointsRedeemed > 0 && (
                            <span className="text-xs font-bold font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                              -₱{effectivePointsRedeemed.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {usePoints && (
                          <p className="text-[10px] text-amber-800 font-medium mt-1.5 pl-6">
                            ✓ 1 point = ₱1.00 discount applied to order!
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ACTIVE OFFERS DROPDOWN */}
                  {showCouponsDropdown && !appliedVoucher && availableCoupons.length > 0 && (
                    <div className="bg-slate-50 border border-gray-200 rounded-xl p-2.5 space-y-2 mt-1.5 max-h-48 overflow-y-auto">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                        Available Promos
                      </span>
                      {availableCoupons.map((coupon) => (
                        <div
                          key={coupon._id || coupon.code}
                          className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                {coupon.code}
                              </span>
                              <span className="text-[11px] font-bold text-[#01390f]">
                                {coupon.discount}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Min. Spend: {coupon.minSpend || "₱0"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyVoucher(coupon.code)}
                            className="text-xs font-bold text-[#01390f] hover:bg-[#EDF7EE] px-2.5 py-1 rounded-md border border-[#01390f]/20 transition-colors cursor-pointer shrink-0"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SUBTOTAL & SHIPPING BREAKDOWN */}
                <div className="border-t border-gray-200 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-900 font-medium">₱{merchandiseSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping ({shippingDetails?.matchedRegion || "Standard Delivery"})</span>
                    <span className="font-mono text-slate-900 font-medium">
                      {shippingFee === 0 ? (
                        <span className="text-emerald-700 font-bold">FREE (₱0.00)</span>
                      ) : (
                        `₱${shippingFee.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  {voucherDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Voucher Discount</span>
                      <span className="font-mono">-₱{voucherDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {usePoints && effectivePointsRedeemed > 0 && (
                    <div className="flex justify-between text-amber-700 font-semibold">
                      <span className="flex items-center gap-1">
                        <span>⭐</span>
                        <span>Points Discount ({effectivePointsRedeemed} pts)</span>
                      </span>
                      <span className="font-mono font-bold">-₱{effectivePointsRedeemed.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="mt-1 text-center py-1.5 px-2.5 bg-emerald-50 text-[#01390f] rounded-lg text-[11px] font-bold border border-emerald-200/60">
                    🎉 Earn +{Math.floor(totalPayment / 50)} new points with this purchase!
                  </div>
                </div>

                {/* ESTIMATED TOTAL */}
                <div className="flex justify-between items-center py-2 border-t border-[#E1E9EF] border-b pb-3">
                  <span className="text-base font-semibold text-[#243746]">Estimated Total:</span>
                  <span className="text-xl sm:text-2xl font-bold text-[#01390f]">
                    ₱{totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* DISCLAIMER */}
                <p className="text-xs text-slate-500 leading-relaxed">
                  Taxes and shipping are calculated at checkout.
                </p>

                {/* COMPLETE ORDER BUTTON (CONSISTENT WITH CART BUTTON SYSTEM) */}
                <button
                  type="button"
                  disabled={placingOrder || checkoutItems.length === 0}
                  onClick={handleCompleteOrderClick}
                  className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-3.5 sm:py-4 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Order...</span>
                    </>
                  ) : (
                    <span>Complete Order</span>
                  )}
                </button>

                {/* POLICY LINKS */}
                <div className="pt-2 flex items-center justify-center gap-4 text-xs text-slate-500">
                  <Link
                    to="/refund-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-[#01390f] transition-colors font-medium"
                  >
                    Refund Policy
                  </Link>
                  <span className="text-slate-300">•</span>
                  <Link
                    to="/shipping-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-[#01390f] transition-colors font-medium"
                  >
                    Shipping Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ================= ORDER CONFIRMATION MODAL (CONFIRM BEFORE PLACING) ================= */}
      {isConfirmOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden font-sans animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/90">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#EDF7EE] text-[#01390f] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                    Confirm Your Order
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Please review your delivery details and items
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmOrderModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
              {/* Delivery Details */}
              <div className="bg-[#F8FAF9] p-3.5 sm:p-4 rounded-2xl border border-gray-200 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-[#01390f]" />
                  <span>Delivery Details</span>
                </div>
                <p className="font-bold text-slate-900 text-sm pt-0.5">{formattedRecipientName}</p>
                <p className="text-slate-600 leading-relaxed text-xs">{formattedAddressText}</p>
                <p className="text-slate-700 font-mono text-xs font-medium pt-0.5">{activePhone}</p>
              </div>

              {/* Payment Details */}
              <div className="bg-[#F8FAF9] p-3.5 sm:p-4 rounded-2xl border border-gray-200 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <Banknote className="w-3.5 h-3.5 text-[#01390f]" />
                  <span>Payment Method</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    {paymentMethod}
                  </span>
                  {paymentMethod.includes("PayMongo") ? (
                    <span className="text-[10px] font-semibold bg-[#EDF7EE] text-[#01390f] px-2 py-0.5 rounded-full border border-[#01390f]/20">
                      Online Gateway
                    </span>
                  ) : paymentMethod === "Cash on Delivery" ? (
                    <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      COD
                    </span>
                  ) : null}
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  {paymentMethod.includes("PayMongo") || paymentMethod.includes("E-Wallet")
                    ? "Redirects to PayMongo secure gateway (GCash, Maya, Card)"
                    : paymentMethod === "Cash on Delivery"
                    ? "Pay cash upon parcel delivery to courier"
                    : "Transfer & upload receipt proof"}
                </p>
              </div>

              {/* Special Instructions (if any) */}
              {customerMessage && (
                <div className="bg-[#F8FAF9] p-3 rounded-2xl border border-gray-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-[#01390f]" />
                    <span>Special Instructions</span>
                  </div>
                  <p className="text-slate-700 text-xs italic">"{customerMessage}"</p>
                </div>
              )}

              {/* Items Summary with Product Images */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span>Items ({totalItemCount})</span>
                  <span className="text-slate-400 font-normal">Preview</span>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white rounded-2xl border border-gray-200 p-2 sm:p-2.5">
                  {checkoutItems.map((item, idx) => {
                    const p = item.product || item;
                    const itemTitle = p.itemDescription || p.itemName || p.name || "Item";
                    const price = Number(p.price || item.price || 0);
                    const qty = Number(item.quantity || 1);
                    const rawImg = (p.images && p.images[0]) || p.image || item.image || "";

                    return (
                      <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getImageUrl(rawImg)}
                            alt={itemTitle}
                            loading="eager"
                            decoding="async"
                            className="w-12 h-12 rounded-xl object-cover bg-slate-50 border border-gray-200 shrink-0 shadow-2xs"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/mhira_removebg.png";
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-xs truncate max-w-[170px] sm:max-w-[220px]">
                              {itemTitle}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {itemTitle} × {qty}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm block">
                            ₱{(price * qty).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">₱{merchandiseSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping ({shippingDetails?.matchedRegion || "Standard Delivery"}):</span>
                  <span className="font-mono font-medium">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE (₱0.00)</span>
                    ) : (
                      `₱${shippingFee.toFixed(2)}`
                    )}
                  </span>
                </div>

                {appliedVoucher && voucherDiscount > 0 && (
                  <div className="flex justify-between items-center text-[#01390f] font-semibold">
                    <span className="flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Voucher ({appliedVoucher.code}):</span>
                    </span>
                    <span className="font-mono">-₱{voucherDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2.5 border-t border-gray-200 text-sm font-bold text-slate-900">
                  <span>Total Payment:</span>
                  <span className="text-base sm:text-lg font-extrabold text-[#01390f] font-mono">
                    ₱{totalPayment.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-gray-200 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={placingOrder}
                onClick={() => setIsConfirmOrderModalOpen(false)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer border border-[#d5ead7]"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={placingOrder}
                onClick={executePlaceOrder}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {placingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <span>Confirm & Place Order</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default CustomerCheckout;

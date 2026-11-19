import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  User,
  ShoppingBag,
  ShoppingCart,
  RotateCcw,
  X,
  Star,
  Package,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Clock,
  MapPin,
  Copy,
  Check,
  Truck,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  FileText,
  Printer,
  Download,
  Receipt,
  Camera,
  AlertTriangle,
  Eye,
  CalendarDays,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
  PackageCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import axios, { API } from "../../axios";

import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { getUserId } from "../../utils/userId";
import { useAppData } from "../../context/AppDataContext";
import { isOrderReviewed, markOrderAsReviewed } from "../../utils/ordersHelper";
import { useLiveSync, notifyLiveSync } from "../../utils/liveSync";

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

const formatShippingAddress = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr.trim();
  if (typeof addr === "object") {
    return [
      addr.streetAddress || addr.street,
      addr.apartment,
      addr.barangay ? `Brgy. ${String(addr.barangay).replace(/^Brgy\.?\s*/i, "")}` : "",
      addr.city,
      addr.province || addr.region,
      addr.postalCode,
      addr.country,
    ]
      .filter(Boolean)
      .join(", ");
  }
  return String(addr || "");
};

// ================= INTERACTIVE STAR RATING WIDGET (DRAG & HOVER GLOW) =================
function StarRatingWidget({
  value = 0,
  onChange,
  onCommit,
  size = 16,
  className = "",
  readOnly = false,
  showLabel = false,
}) {
  const [hoverVal, setHoverVal] = useState(0);
  const containerRef = useRef(null);
  const isPointerDownRef = useRef(false);

  const getStarFromPointer = (e) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    if (clientX == null) return 0;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const star = Math.min(5, Math.max(1, Math.ceil((x / rect.width) * 5)));
    return star;
  };

  const handlePointerDown = (e) => {
    if (readOnly) return;
    isPointerDownRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    const star = getStarFromPointer(e);
    setHoverVal(star);
    if (onChange) onChange(star);
  };

  const handlePointerMove = (e) => {
    if (readOnly) return;
    const star = getStarFromPointer(e);
    setHoverVal(star);
    if (isPointerDownRef.current && onChange) {
      onChange(star);
    }
  };

  const handlePointerUp = (e) => {
    if (readOnly) return;
    const star = getStarFromPointer(e);
    isPointerDownRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setHoverVal(0);
    if (onChange) onChange(star);
    if (onCommit) onCommit(star);
  };

  const handlePointerCancel = () => {
    isPointerDownRef.current = false;
    setHoverVal(0);
  };

  const activeStar = hoverVal || value;

  return (
    <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={() => {
          if (!isPointerDownRef.current) setHoverVal(0);
        }}
        className="flex items-center gap-1 cursor-pointer touch-none py-1"
        style={{ touchAction: "none" }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isLit = star <= activeStar;
          return (
            <button
              key={star}
              type="button"
              tabIndex={-1}
              onMouseEnter={() => setHoverVal(star)}
              onClick={(e) => {
                e.stopPropagation();
                if (onChange) onChange(star);
                if (onCommit) onCommit(star);
              }}
              className={`p-0.5 transition-all duration-150 rounded-xs focus:outline-none cursor-pointer ${
                isLit
                  ? "scale-115 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.85)]"
                  : "scale-100 text-slate-300 hover:text-yellow-200"
              }`}
              title={`Rate ${star} Star${star > 1 ? "s" : ""}`}
            >
              <Star
                size={size}
                className={`transition-colors duration-150 ${
                  isLit
                    ? "fill-yellow-400 stroke-yellow-500"
                    : "fill-transparent stroke-slate-300"
                }`}
              />
            </button>
          );
        })}
      </div>
      {showLabel && (
        <span className="text-xs font-bold text-yellow-800 transition-all ml-1">
          {activeStar > 0 ? `${activeStar} / 5 Stars` : "Select Stars"}
        </span>
      )}
    </div>
  );
}

function CustomerOrders() {
  const navigate = useNavigate();
  const appData = useAppData();
  const [activeTab, setActiveTab] = useState("All");
  const [allOrders, setAllOrders] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_customer_orders");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(null);

  // Return Modal States (Pure Returns, no refund wording)
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState(null);
  const [returnReason, setReturnReason] = useState("Damaged / Broken Item");
  const [returnComments, setReturnComments] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Review Modal States
  const [selectedProductForReview, setSelectedProductForReview] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMedia, setReviewMedia] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const reviewMediaInputRef = useRef(null);

  // Cancel Order Modal States
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("Changed mind");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Official Receipt & Order Details Modal State
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState(null);
  const [receiptModalMode, setReceiptModalMode] = useState("receipt"); // "receipt" | "order"

  const handleOpenReceiptModal = (order) => {
    setReceiptModalMode("receipt");
    setSelectedOrderForReceipt(order);
  };

  const handleOpenOrderModal = (order) => {
    setReceiptModalMode("order");
    setSelectedOrderForReceipt(order);
  };

  // Proof of Delivery (POD) & Timeline Modal States
  const [selectedOrderForPod, setSelectedOrderForPod] = useState(null);
  const [selectedOrderForTimeline, setSelectedOrderForTimeline] = useState(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState(null);

  // Expanded Orders Map for multiple items toggle
  const [expandedOrders, setExpandedOrders] = useState({});

  const userId = getUserId();

  const tabs = [
    { id: "All", label: "All Orders", icon: ShoppingBag, hasDot: false },
    { id: "Order Placed", label: "Order Placed", icon: Clock, hasDot: true },
    { id: "Waiting for Courier", label: "Waiting for Courier", icon: Package, hasDot: true },
    { id: "In Transit", label: "In Transit", icon: Truck, hasDot: true },
    { id: "Delivered", label: "Delivered", icon: CheckCircle2, hasDot: false },
    { id: "Cancel", label: "Cancel / Returns", icon: RotateCcw, hasDot: true },
  ];

  // Fetch Orders from Backend API
  const fetchOrders = async (silent = false) => {
    try {
      if (!silent && allOrders.length === 0) {
        setLoading(true);
      }
      let targetUserId = userId;
      if (!targetUserId) {
        try {
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          targetUserId = storedUser._id || storedUser.id || storedUser.email;
        } catch (e) {}
      }

      let res = null;
      if (targetUserId) {
        try {
          res = await axios.get(
            `${API_BASE_URL}/api/orders/user/${encodeURIComponent(targetUserId)}?status=All`
          );
        } catch (err) {
          console.warn("User orders fetch notice:", err?.message);
        }
      }

      // If no orders returned from user endpoint (e.g. staff previewing orders), try admin/staff orders endpoint
      if (!res || !Array.isArray(res.data) || res.data.length === 0) {
        try {
          const allRes = await axios.get(`${API_BASE_URL}/api/orders`);
          if (Array.isArray(allRes.data) && allRes.data.length > 0) {
            res = allRes;
          }
        } catch (e) {}
      }

      if (res && Array.isArray(res.data)) {
        const sorted = [...res.data].sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeB !== timeA) return timeB - timeA;
          return String(b._id || "").localeCompare(String(a._id || ""));
        });
        setAllOrders(sorted);
        try {
          localStorage.setItem("cached_customer_orders", JSON.stringify(sorted));
        } catch (e) {}
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time automatic customer order tracking sync without refresh
  useLiveSync(["orders", "returns"], () => {
    fetchOrders(true);
  });

  useEffect(() => {
    fetchOrders(true);
  }, [userId]);

  // Handle PayMongo Payment Redirect Verification
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isPaymentSuccess = urlParams.get("payment") === "success" || urlParams.get("payment_status") === "success";
      const sessionId = urlParams.get("session_id") || urlParams.get("sessionId");
      const orderId = urlParams.get("orderId") || urlParams.get("order_id");

      if (isPaymentSuccess && (sessionId || orderId)) {
        const verifyPayment = async () => {
          try {
            const res = await axios.get(
              `${API_BASE_URL}/api/payments/verify-session/${sessionId || ""}?orderId=${orderId || ""}`
            );
            if (res.data?.paid || res.data?.paymentStatus === "Paid") {
              showSuccessToast("Payment successful! Your order has been placed and is now being prepared for shipping. 🎉");
              setActiveTab("To Ship");
            } else {
              showSuccessToast("Payment session received! Order status will update shortly.");
              setActiveTab("To Pay");
            }
          } catch (err) {
            console.error("Payment verification check:", err);
            showSuccessToast("Payment processed! Updating order list...");
          } finally {
            fetchOrders();
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        };
        verifyPayment();
      }
    } catch (e) {
      console.error("URL parse error:", e);
    }
  }, []);

  // Pay Now for unpaid order in "To Pay"
  const [payingOrderId, setPayingOrderId] = useState(null);
  const handlePayNow = async (order) => {
    try {
      setPayingOrderId(order._id);
      const res = await axios.post(`${API_BASE_URL}/api/payments/pay-order/${order._id}`);
      if (res.data?.checkoutUrl) {
        showSuccessToast("Redirecting to PayMongo payment gateway... 💳");
        window.location.href = res.data.checkoutUrl;
      } else {
        showErrorToast("Could not initiate payment session. Please try again.");
      }
    } catch (err) {
      console.error("Pay now error:", err);
      showErrorToast(err.response?.data?.message || "Failed to initiate payment.");
    } finally {
      setPayingOrderId(null);
    }
  };

  // Helper to determine which tab an order belongs to (Mapped per user rules)
  const isOrderInTab = (order, tabName) => {
    if (!order) return false;
    const s = (order.status || "").toLowerCase().trim();
    const ps = (order.paymentStatus || "").toLowerCase().trim();

    // 0. All Orders
    if (tabName === "All" || tabName === "All Orders") {
      return true;
    }

    // 1. Order Placed / To Pay
    if (tabName === "Order Placed" || tabName === "To Pay") {
      if (
        s === "cancelled" ||
        s === "cancel" ||
        s === "completed" ||
        s === "delivered" ||
        s === "to review" ||
        s === "in transit" ||
        s === "in-transit" ||
        s === "to receive" ||
        s === "to-receive" ||
        s === "out for delivery" ||
        s === "waiting for courier" ||
        s === "waiting-for-courier" ||
        s === "waiting-courier" ||
        s === "to ship" ||
        s === "to-ship"
      ) {
        return false;
      }
      return (
        s === "order placed" ||
        s === "order-placed" ||
        s === "to pay" ||
        s === "to-pay" ||
        s === "pending" ||
        ps === "pending payment" ||
        ps === "unpaid"
      );
    }

    // 2. Waiting for Courier / To Ship
    if (tabName === "Waiting for Courier" || tabName === "To Ship") {
      if (
        s === "cancelled" ||
        s === "cancel" ||
        s === "completed" ||
        s === "delivered" ||
        s === "to review" ||
        s === "in transit" ||
        s === "in-transit" ||
        s === "to receive" ||
        s === "to-receive" ||
        s === "out for delivery"
      ) {
        return false;
      }
      return (
        s === "waiting for courier" ||
        s === "waiting-for-courier" ||
        s === "waiting-courier" ||
        s === "to ship" ||
        s === "to-ship" ||
        s === "processing" ||
        s === "preparing"
      );
    }

    // 3. In Transit / To Receive
    if (tabName === "In Transit" || tabName === "To Receive") {
      if (s === "cancelled" || s === "cancel" || s === "completed" || s === "delivered" || s === "to review") {
        return false;
      }
      return (
        s === "in transit" ||
        s === "in-transit" ||
        s === "to receive" ||
        s === "to-receive" ||
        s === "shipped" ||
        s === "out for delivery"
      );
    }

    // 4. Delivered / To Review
    if (tabName === "Delivered" || tabName === "To Review") {
      if (s === "cancelled" || s === "cancel") return false;
      return s === "delivered" || s === "to review" || s === "completed" || s === "paid";
    }

    // 5. Cancel / Returns: Returns / Refund requests & Cancelled orders
    if (tabName === "Cancel" || tabName === "Cancel / Returns" || tabName === "Returns" || tabName === "Cancelled") {
      return (
        s === "cancelled" ||
        s === "cancel" ||
        s === "returns" ||
        s === "return" ||
        s === "return refund" ||
        s === "returned" ||
        order.cancellationRequest?.status === "Requested" ||
        order.cancellationRequest?.status === "Approved" ||
        order.returnRequest?.status === "Requested" ||
        order.returnRequest?.status === "Approved"
      );
    }

    return s === tabName.toLowerCase();
  };

  // Instant Client-Side Tab Filtering (0ms Lag) with Most Recent at Top
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(allOrders)) return [];
    return [...allOrders]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return String(b._id || "").localeCompare(String(a._id || ""));
      })
      .filter((order) => isOrderInTab(order, activeTab));
  }, [allOrders, activeTab, userId]);

  // Helper to determine accurate payment status (Completed / Delivered / To Review = Paid)
  const getEffectivePaymentStatus = (order) => {
    if (!order) return "Paid";
    const status = String(order.status || "").toLowerCase().trim();
    const paymentStatus = String(order.paymentStatus || "").trim();

    // Once an order is delivered / completed / to review, COD collection is completed -> Paid!
    if (status === "completed" || status === "delivered" || status === "to review") {
      return "Paid";
    }

    if (!paymentStatus || paymentStatus === "Pending COD") {
      const method = String(order.paymentMethod || "").toLowerCase();
      if (method.includes("cod") || method.includes("cash on delivery")) {
        return "Pending COD";
      }
      return "Paid";
    }

    return paymentStatus;
  };

  // Handle Copy Order Number
  const handleCopyOrderId = (orderId) => {
    if (!orderId) return;
    const cleanId = String(orderId);
    navigator.clipboard?.writeText(cleanId);
    setCopiedOrderId(cleanId);
    showSuccessToast("Order number copied to clipboard!");
    setTimeout(() => {
      setCopiedOrderId(null);
    }, 2000);
  };

  // Handle Customer Order Confirmation (Moves order from 'Order Placed' to 'To Ship' / 'Waiting for courier')
  const handleConfirmOrder = async (orderId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        status: "To Ship",
      });
      showSuccessToast("Order confirmed! Status moved to Waiting for courier.");
      window.dispatchEvent(new Event("ordersUpdated"));
      fetchOrders();
      setActiveTab("To Ship");
    } catch (err) {
      console.error("Failed to confirm order:", err);
      showErrorToast("Failed to confirm order.");
    }
  };

  // Handle Confirm Order Received (Marks order Completed and moves it from 'To Review' to 'All')
  const handleConfirmOrderReceived = async (orderId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        status: "Completed",
      });

      // Immediately update local orders state for 0ms lag
      setAllOrders((prev) =>
        prev.map((o) =>
          o._id === orderId || o.id === orderId || String(o._id) === String(orderId)
            ? { ...o, status: "Completed" }
            : o
        )
      );

      try {
        const cached = localStorage.getItem("cached_customer_orders");
        if (cached) {
          const parsed = JSON.parse(cached);
          const updated = parsed.map((o) =>
            o._id === orderId || o.id === orderId || String(o._id) === String(orderId)
              ? { ...o, status: "Completed" }
              : o
          );
          localStorage.setItem("cached_customer_orders", JSON.stringify(updated));
        }
      } catch (e) {}

      showSuccessToast("Order confirmed as received! Order moved to All Orders. 🎉");
      window.dispatchEvent(new Event("ordersUpdated"));
      fetchOrders();
      setActiveTab("All");
    } catch (err) {
      console.error("Failed to mark order as received:", err);
      showErrorToast("Failed to confirm order receipt.");
    }
  };

  // Handle Buy Again
  const handleBuyAgain = async (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return;
    const activeUserId = getUserId();
    const token = localStorage.getItem("token");
    if (!activeUserId) {
      showErrorToast("Please log in to add items to your cart.");
      navigate("/login");
      return;
    }

    try {
      const stored = localStorage.getItem("cached_cart_items");
      let currentCart = stored ? JSON.parse(stored) : [];

      for (const item of order.items) {
        const pId = String(item.product || item._id || item.productId || item.code);
        const formattedProduct = {
          _id: pId,
          id: pId,
          code: item.code || "",
          itemDescription: item.name || item.itemDescription || "Mhira Natural Product",
          itemName: item.name || item.itemDescription || "Mhira Natural Product",
          name: item.name || item.itemDescription || "Mhira Natural Product",
          price: Number(item.price) > 0 ? Number(item.price) : 200,
          image: item.image || "",
          images: item.image ? [item.image] : [],
          category: item.category || "Skin Care",
          quantity: 10,
        };

        const idx = currentCart.findIndex((c) => {
          const cId = String(c.product?._id || c.product?.id || c.product?.code || c.product);
          return cId === pId;
        });

        const qtyToAdd = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        if (idx > -1) {
          currentCart[idx].quantity = (Number(currentCart[idx].quantity) || 0) + qtyToAdd;
        } else {
          currentCart.push({ product: formattedProduct, quantity: qtyToAdd });
        }

        // Fire background API
        if (token) {
          axios.post(
            `${API_BASE_URL}/api/cart/add`,
            {
              userId: activeUserId,
              productId: pId,
              quantity: qtyToAdd,
              product: formattedProduct,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ).catch(() => {});
        }
      }

      localStorage.setItem("cached_cart_items", JSON.stringify(currentCart));
      localStorage.setItem(`cached_cart_items_${activeUserId}`, JSON.stringify(currentCart));
      window.dispatchEvent(new Event("cartUpdated"));
      showSuccessToast("Items re-added to your bag! 🛍️");
      navigate("/cart");
    } catch (err) {
      console.error("Buy again error:", err);
      showErrorToast("Failed to re-order items.");
    }
  };

  // Add Order Items to Cart without navigating away
  const handleAddToCartFromOrder = async (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return;
    const activeUserId = getUserId();
    const token = localStorage.getItem("token");
    if (!activeUserId) {
      showErrorToast("Please log in to add items to your cart.");
      navigate("/login");
      return;
    }

    try {
      const stored = localStorage.getItem("cached_cart_items");
      let currentCart = stored ? JSON.parse(stored) : [];

      for (const item of order.items) {
        const pId = String(item.product || item._id || item.productId || item.code);
        const formattedProduct = {
          _id: pId,
          id: pId,
          code: item.code || "",
          itemDescription: item.name || item.itemDescription || "Mhira Natural Product",
          itemName: item.name || item.itemDescription || "Mhira Natural Product",
          name: item.name || item.itemDescription || "Mhira Natural Product",
          price: Number(item.price) > 0 ? Number(item.price) : 200,
          image: item.image || "",
          images: item.image ? [item.image] : [],
          category: item.category || "Skin Care",
          quantity: 10,
        };

        const idx = currentCart.findIndex((c) => {
          const cId = String(c.product?._id || c.product?.id || c.product?.code || c.product);
          return cId === pId;
        });

        const qtyToAdd = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        if (idx > -1) {
          currentCart[idx].quantity = (Number(currentCart[idx].quantity) || 0) + qtyToAdd;
        } else {
          currentCart.push({ product: formattedProduct, quantity: qtyToAdd });
        }

        if (token) {
          axios.post(
            `${API_BASE_URL}/api/cart/add`,
            {
              userId: activeUserId,
              productId: pId,
              quantity: qtyToAdd,
              product: formattedProduct,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ).catch(() => {});
        }
      }

      localStorage.setItem("cached_cart_items", JSON.stringify(currentCart));
      localStorage.setItem(`cached_cart_items_${activeUserId}`, JSON.stringify(currentCart));
      window.dispatchEvent(new Event("cartUpdated"));
      showSuccessToast("Items added to your shopping cart! 🛒");
    } catch (err) {
      console.error("Add to cart error:", err);
      showErrorToast("Failed to add items to cart.");
    }
  };

  // Open Chatbot with Order Context
  const handleContactSupportForOrder = (order) => {
    if (!order) return;
    window.dispatchEvent(
      new CustomEvent("openChatbotWithOrder", {
        detail: { order },
      })
    );
  };

  // Download Official PDF Receipt (Paper Document Style matching TikTok Shop preview)
  const handleDownloadReceiptPdf = (order) => {
    if (!order) return;
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const fullOrderId = String(order.orderNumber || order._id || "51ACE3DD").toUpperCase();
      const orderIdShort = fullOrderId.slice(-8);
      const receiptNum = `20261009-${String(order._id || fullOrderId).replace(/[^a-zA-Z0-9]/g, "").slice(-18).toUpperCase()}`;

      const customerName =
        order.customerName ||
        order.userId?.name ||
        order.user?.name ||
        (() => {
          try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            return u.name || u.fullName || "Kent Bundalian";
          } catch {
            return "Kent Bundalian";
          }
        })();

      const customerPhone =
        order.phone ||
        order.shippingPhone ||
        order.contactNumber ||
        (() => {
          try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            return u.phone || u.contactNumber || "+63 9154673941";
          } catch {
            return "+63 9154673941";
          }
        })();

      const customerAddress =
        formatShippingAddress(order.shippingAddress) || "ccc, Brgy. Uwisan, Calamba City, Laguna, 4027, Philippines";

      const orderCreated = order.createdAt ? new Date(order.createdAt) : new Date();
      const orderDateFormatted = orderCreated.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const orderTimeFormatted = orderCreated.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const receiptDateTime = `${orderDateFormatted} ${orderTimeFormatted}`;

      // Clean white document header
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(15);
      doc.text("MHIRA NATURAL BOTANICALS", 15, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Pure Organic Botanicals & Skin Care", 15, 23);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("Order Receipt", 195, 20, { align: "right" });

      // Shaded Receipt Box (#F8F9FA)
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, 28, 180, 14, 1.5, 1.5, "FD");

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.text(`Receipt Number : ${receiptNum}`, 19, 34);
      doc.text(`Receipt Date : ${receiptDateTime}`, 19, 39);

      // 3 Columns: Delivery Details, Sold By, Order Details
      // Column 1: Delivery Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Delivery Details", 15, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(customerName, 15, 55);

      const splitAddr = doc.splitTextToSize(customerAddress, 58);
      doc.text(splitAddr, 15, 59);
      const addrBottomY = 59 + (splitAddr.length * 3.5);
      if (customerPhone) {
        doc.text(customerPhone, 15, addrBottomY);
      }

      // Column 2: Sold By
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Sold By", 80, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text("MHIRA NATURAL BOTANICALS", 80, 55);
      doc.text("Calamba City, Laguna, Philippines", 80, 59);

      // Column 3: Order Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Order Details", 145, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Order Number :", 145, 55);
      doc.setTextColor(15, 23, 42);
      doc.text(fullOrderId, 168, 55);

      doc.setTextColor(100, 116, 139);
      doc.text("Order Date :", 145, 59);
      doc.setTextColor(15, 23, 42);
      doc.text(orderDateFormatted, 168, 59);

      doc.setTextColor(100, 116, 139);
      doc.text("Payment :", 145, 63);
      doc.setTextColor(15, 23, 42);
      doc.text(order.paymentMethod || "Cash on Delivery", 168, 63);

      const startTableY = Math.max(addrBottomY + 7, 72);

      // Table Header and Body
      const tableHead = [["Item Description", "Quantity"]];
      const itemsList = Array.isArray(order.items) && order.items.length > 0 ? order.items : [
        { name: "FACE SERUM COLLAGEN", price: order.totalAmount || 300, quantity: 1 }
      ];

      const tableBody = itemsList.map((it) => [
        `${it.name || it.itemDescription || "Botanical Product"} (PHP ${Number(it.price || 0).toFixed(2)})`,
        String(it.quantity || 1),
      ]);

      autoTable(doc, {
        startY: startTableY,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [248, 249, 250],
          textColor: [15, 23, 42],
          fontStyle: "bold",
          fontSize: 8.5,
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
          lineColor: [241, 245, 249],
          lineWidth: 0.1,
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: {
          0: { cellWidth: 150 },
          1: { cellWidth: 30, halign: "right" },
        },
        margin: { left: 15, right: 15 },
      });

      const finalY = doc.lastAutoTable.finalY + 6;
      const totalAmount = Number(order.totalAmount || 0);

      // Financial breakdown aligned right
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Subtotal", 130, finalY);
      doc.setTextColor(15, 23, 42);
      doc.text(`PHP ${totalAmount.toFixed(2)}`, 195, finalY, { align: "right" });

      doc.setTextColor(100, 116, 139);
      doc.text("Handling fee", 130, finalY + 5);
      doc.setTextColor(15, 23, 42);
      doc.text("PHP 0.00", 195, finalY + 5, { align: "right" });

      doc.setTextColor(100, 116, 139);
      doc.text("Shipping", 130, finalY + 10);
      doc.setTextColor(1, 57, 15);
      doc.setFont("helvetica", "bold");
      doc.text("FREE", 195, finalY + 10, { align: "right" });

      // Shaded grand total box
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(125, finalY + 14, 70, 9.5, 1, 1, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text("Grand total (includes VAT)", 128, finalY + 20);
      doc.text(`PHP ${totalAmount.toFixed(2)}`, 192, finalY + 20, { align: "right" });

      // Disclaimer footer centered
      const disclaimerY = finalY + 36;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("This receipt serves as proof of purchase and does not qualify as a tax invoice.", 105, disclaimerY, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("Thank you for your purchase.", 105, disclaimerY + 4.5, { align: "center" });

      doc.save(`Mhira_Receipt_${orderIdShort}.pdf`);
      showSuccessToast("Official Receipt PDF downloaded! 📄");
    } catch (err) {
      console.error("Download PDF receipt error:", err);
      showErrorToast("Failed to generate receipt PDF.");
    }
  };

  // Download Standard Courier Airway Bill / Shipping Label PDF (Waybill)
  const handleDownloadWaybillPdf = (order) => {
    if (!order) return;
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [100, 150] }); // 100x150mm standard thermal sticker format
      const orderIdShort = order._id ? String(order._id).slice(-8).toUpperCase() : "ORDER";
      const courierName = (order.courier || "J&T Express").trim();
      const trackingNo = order.trackingNumber || `JT${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
      const customerName = order.customerName || order.userId?.name || order.user?.name || "Customer";
      const customerPhone = order.phone || order.shippingPhone || order.contactNumber || order.userId?.phoneNumber || order.phoneNumber || "0917-000-0000";
      const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const totalAmount = Number(order.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

      const isCod = (order.paymentMethod || "").toLowerCase().includes("cod") || (order.paymentMethod || "").toLowerCase().includes("cash on delivery");

      // 1. Header Box - Courier & Service Type
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 100, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(courierName.toUpperCase(), 5, 7.5);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text("AIRWAY BILL & SHIPPING LABEL", 5, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("STANDARD EXP", 72, 7.5);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString(), 74, 12);

      // 2. Barcode Simulation Box
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 15, 100, 21, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(4, 17, 92, 17);

      doc.setFillColor(15, 23, 42);
      let bx = 9;
      for (let i = 0; i < 44; i++) {
        const barWidth = (i % 3 === 0 || i % 7 === 0) ? 1.4 : 0.6;
        if (i % 6 !== 0) {
          doc.rect(bx, 19, barWidth, 9.5, "F");
        }
        bx += barWidth + 1.1;
      }
      doc.setTextColor(15, 23, 42);
      doc.setFont("courier", "bold");
      doc.setFontSize(8.5);
      doc.text(`* ${trackingNo} *`, 50, 32, { align: "center" });

      // 3. Payment Method & Amount Box (Crucial for Courier Rider)
      doc.setDrawColor(30, 41, 59);
      if (isCod) {
        doc.setFillColor(254, 240, 138); // Yellow highlight for COD
        doc.rect(4, 36, 92, 13, "FD");
        doc.setTextColor(113, 63, 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text("CASH ON DELIVERY (COD)", 7, 41);
        doc.setFontSize(9.5);
        doc.text(`AMOUNT TO COLLECT: PHP ${totalAmount}`, 7, 46.5);
      } else {
        doc.setFillColor(219, 234, 254); // Blue highlight for Prepaid
        doc.rect(4, 36, 92, 13, "FD");
        doc.setTextColor(30, 58, 138);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text("PREPAID / NON-COD  [ DO NOT COLLECT CASH ]", 7, 41);
        doc.setFontSize(8);
        const refStr = order.paymentDetails?.referenceNumber ? ` | Ref: ${order.paymentDetails.referenceNumber}` : "";
        doc.text(`PAID ONLINE (${order.paymentDetails?.paymentMethodType || order.paymentMethod || "E-PAYMENT"}${refStr}) - PHP ${totalAmount}`, 7, 46.5);
      }

      // 4. Consignee (Receiver / TO)
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.rect(4, 51, 92, 28, "FD");
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text("RECIPIENT / SHIP TO:", 7, 55);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.text(customerName.toUpperCase(), 7, 60);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Phone: ${customerPhone}`, 7, 64);
      const splitAddress = doc.splitTextToSize(formatShippingAddress(order.shippingAddress) || "Customer Delivery Address", 86);
      doc.text(splitAddress, 7, 68);

      // 5. Shipper (Sender / FROM)
      doc.rect(4, 81, 92, 16, "FD");
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text("SENDER / RETURN TO:", 7, 85);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.5);
      doc.text("MHIRA NATURAL SKINCARE", 7, 89);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Logistics & Supply Chain Hub, Manila, Philippines | Tel: 0917-123-4567", 7, 93);

      // 6. Order Contents & Itemized Summary
      doc.rect(4, 99, 92, 27, "FD");
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text("PARCEL CONTENTS & ORDER INFO:", 7, 103);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(`Order Ref: #${orderIdShort} | Date Placed: ${orderDate}`, 7, 107);

      let itemY = 111;
      const itemsList = order.items || [];
      const totalItemsCount = itemsList.reduce((acc, it) => acc + (it.quantity || 1), 0);
      itemsList.slice(0, 3).forEach((it) => {
        const itemLine = `• ${(it.name || "Product").substring(0, 38)} (x${it.quantity || 1})`;
        doc.text(itemLine, 7, itemY);
        itemY += 3.5;
      });
      if (itemsList.length > 3) {
        doc.text(`+ ${itemsList.length - 3} more items...`, 7, itemY);
      }
      doc.setFont("helvetica", "bold");
      doc.text(`Total Pcs: ${totalItemsCount} units | Declared Value: PHP ${totalAmount}`, 7, 123);

      // 7. Rider Signature & Verification Box
      doc.rect(4, 128, 92, 17);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("DISPATCH / RIDER HANDOVER:", 7, 132);
      doc.text("RECIPIENT SIGNATURE:", 54, 132);
      doc.line(7, 140, 45, 140);
      doc.line(54, 140, 92, 140);
      doc.text(`Carrier: ${courierName}`, 7, 143.5);
      doc.text("Date Received:", 54, 143.5);

      const fileName = `Waybill_${courierName.replace(/\s+/g, "_")}_${trackingNo}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Waybill generated & downloaded: ${fileName}`);
    } catch (err) {
      console.error("Error generating Waybill PDF:", err);
      showErrorToast("Failed to generate Waybill shipping label.");
    }
  };

  // Handle Quick Star Rating Click
  const handleQuickStarClick = (order, item, starNumber) => {
    setSelectedProductForReview({
      productId: item.product || item._id || item.productId,
      orderId: order._id,
      name: item.name || item.itemDescription || "Mhira Natural Product",
      image: item.image,
    });
    setRatingValue(starNumber);
    setReviewComment("");
  };

  // Handle Cancel Order Request (Sends cancellation request to Logistics for approval)
  const handleConfirmCancelOrder = async () => {
    if (!selectedOrderForCancel?._id) return;
    setIsSubmittingCancel(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/orders/${selectedOrderForCancel._id}/request-cancel`, {
        reason: cancelReason || "Customer requested cancellation",
      });
      showSuccessToast("Cancellation request submitted! Logistics will review your request.");
      const updatedOrder = res.data?.order || {
        ...selectedOrderForCancel,
        cancellationRequest: {
          status: "Pending",
          reason: cancelReason || "Customer requested cancellation",
          requestedAt: new Date(),
        },
      };
      setAllOrders((prev) =>
        prev.map((o) => (o._id === selectedOrderForCancel._id ? updatedOrder : o))
      );
      try {
        const cached = localStorage.getItem("cached_customer_orders");
        if (cached) {
          const parsed = JSON.parse(cached);
          const updated = parsed.map((o) => (o._id === selectedOrderForCancel._id ? updatedOrder : o));
          localStorage.setItem("cached_customer_orders", JSON.stringify(updated));
        }
      } catch (e) {}
      window.dispatchEvent(new Event("ordersUpdated"));
      setSelectedOrderForCancel(null);
    } catch (err) {
      console.error("Cancel order error:", err);
      showErrorToast(err.response?.data?.message || "Failed to submit cancellation request. Please try again.");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Handle Return Request Submit (Pure Returns)
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderForReturn) return;

    try {
      setSubmittingReturn(true);
      const storedUser = localStorage.getItem("user");
      let customerName = "Customer";
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.name) customerName = parsed.name;
          else if (parsed.fullName) customerName = parsed.fullName;
          else if (parsed.email) customerName = parsed.email.split("@")[0];
        } catch (err) {}
      }

      await axios.post(`${API_BASE_URL}/api/returns/request`, {
        orderId: selectedOrderForReturn._id,
        userId: userId,
        customerName: customerName,
        reason: returnReason,
        comments: returnComments,
        refundAmount: selectedOrderForReturn.totalAmount,
        items: selectedOrderForReturn.items,
      });

      showSuccessToast("Return request submitted successfully! Our logistics team will inspect and process your return.");
      setSelectedOrderForReturn(null);
      setReturnComments("");
      setReturnReason("Damaged / Broken Item");

      window.dispatchEvent(new Event("ordersUpdated"));
      setActiveTab("Returns");
      fetchOrders();
    } catch (error) {
      console.error("Error submitting return request:", error);
      showErrorToast(error.response?.data?.message || "Failed to submit return request. Please try again.");
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Handle Review Media Selection (Photos or Videos)
  const handleReviewMediaSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newMedia = files.map((file) => ({
      file,
      type: file.type,
      previewUrl: URL.createObjectURL(file),
    }));

    setReviewMedia((prev) => [...prev, ...newMedia].slice(0, 5));
    if (reviewMediaInputRef.current) reviewMediaInputRef.current.value = "";
  };

  const handleRemoveReviewMedia = (index) => {
    setReviewMedia((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Review Submit
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductForReview) return;

    if (!reviewComment || reviewComment.trim().length < 30) {
      showErrorToast("Please write at least 30 characters in your review.");
      return;
    }

    try {
      setSubmittingReview(true);
      const storedUser = localStorage.getItem("user");
      let userName = "Verified Customer";
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.name) userName = parsed.name;
          else if (parsed.fullName) userName = parsed.fullName;
          else if (parsed.email) userName = parsed.email.split("@")[0];
        } catch (err) {}
      }

      // Upload photos / videos if any
      let uploadedUrls = [];
      if (reviewMedia.length > 0) {
        for (const m of reviewMedia) {
          if (m.file) {
            const formData = new FormData();
            formData.append("file", m.file);
            try {
              const upRes = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
              if (upRes.data?.results?.[0]?.url) {
                uploadedUrls.push(upRes.data.results[0].url);
              } else if (upRes.data?.url) {
                uploadedUrls.push(upRes.data.url);
              }
            } catch (upErr) {
              console.warn("Media upload error:", upErr);
            }
          }
        }
      }

      await axios.post(`${API_BASE_URL}/api/reviews`, {
        productId: selectedProductForReview.productId,
        orderId: selectedProductForReview.orderId,
        userId: userId,
        userName: isAnonymous ? "Anonymous" : userName,
        rating: ratingValue,
        comment: reviewComment.trim(),
        images: uploadedUrls,
        isAnonymous: isAnonymous,
      });

      showSuccessToast("Thank you! Your product review has been submitted. ⭐");
      if (selectedProductForReview?.orderId) {
        const oId = selectedProductForReview.orderId;
        markOrderAsReviewed(oId, userId);
        // Sync status to Completed in backend so order permanently moves to All
        axios.put(`${API_BASE_URL}/api/orders/${oId}/status`, {
          status: "Completed",
        }).catch(() => {});

        setAllOrders((prev) =>
          prev.map((o) =>
            o._id === oId || o.id === oId || String(o._id) === String(oId)
              ? { ...o, status: "Completed", isReviewed: true }
              : o
          )
        );

        try {
          const cached = localStorage.getItem("cached_customer_orders");
          if (cached) {
            const parsed = JSON.parse(cached);
            const updated = parsed.map((o) =>
              o._id === oId || o.id === oId || String(o._id) === String(oId)
                ? { ...o, status: "Completed", isReviewed: true }
                : o
            );
            localStorage.setItem("cached_customer_orders", JSON.stringify(updated));
          }
        } catch (e) {}
      }
      setSelectedProductForReview(null);
      setReviewComment("");
      setReviewMedia([]);
      setIsAnonymous(false);
      setRatingValue(5);
      window.dispatchEvent(new Event("ordersUpdated"));
      setActiveTab("All");
      fetchOrders();
    } catch (error) {
      console.error("Error submitting review:", error);
      showErrorToast(error.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Helper to format date range (Arriving Aug 28 - Aug 30 style)
  const getEstimatedArrival = (order) => {
    if (!order) return "Arriving soon";
    if (order.estimatedDelivery?.formattedRange) {
      return `Arriving ${order.estimatedDelivery.formattedRange}`;
    }
    const base = order.createdAt ? new Date(order.createdAt) : new Date();
    const d1 = new Date(base);
    d1.setDate(d1.getDate() + 3);
    const d2 = new Date(base);
    d2.setDate(d2.getDate() + 5);

    const m1 = d1.toLocaleDateString("en-US", { month: "short" });
    const day1 = d1.getDate();
    const m2 = d2.toLocaleDateString("en-US", { month: "short" });
    const day2 = d2.getDate();

    if (m1 === m2) {
      return `Arriving ${m1} ${day1} - ${day2}`;
    }
    return `Arriving ${m1} ${day1} - ${m2} ${day2}`;
  };

  // Helper to get order count per tab
  const getTabCount = (tab) => {
    const tabName = typeof tab === "object" && tab !== null ? tab.id : tab;
    if (!Array.isArray(allOrders)) return 0;
    return allOrders.filter((order) => isOrderInTab(order, tabName)).length;
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* BREADCRUMB & PAGE TITLE (MATCHES ALL PRODUCTS & FAVORITES DESIGN) */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-[#243746] font-medium capitalize">My Orders</span>
          </nav>

          <div className="flex items-center justify-between border-b border-[#E1E9EF] pb-4">
            <h1 className="text-xl sm:text-2xl font-normal text-[#243746] tracking-tight capitalize">
              My Orders {allOrders.length > 0 && `(${allOrders.length})`}
            </h1>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
          {/* ================= LEFT SIDEBAR (CLEAN TABS CONTAINER) ================= */}
          <aside className="w-full md:w-60 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                <span>Order Status</span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  {allOrders.length} Total
                </span>
              </div>
              <nav className="flex md:flex-col overflow-x-auto scrollbar-none gap-1 pt-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count = getTabCount(tab.id);
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 md:w-full text-left gap-2 ${
                        isActive
                          ? "bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {Icon && (
                          <Icon
                            size={14}
                            className={isActive ? "text-blue-700" : "text-slate-400"}
                          />
                        )}
                        <span className="truncate">{tab.label}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isActive
                            ? "bg-blue-200/80 text-blue-900"
                            : count > 0
                            ? (tab.id === "Cancel" ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-600")
                            : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ================= RIGHT MAIN CONTENT AREA ================= */}
          <section className="flex-1 w-full min-w-0 space-y-6">
          {loading && allOrders.length === 0 ? (
            <div className="py-24 text-center text-xs text-slate-400 bg-white rounded-2xl border border-gray-100 p-8 shadow-2xs">
              <Clock className="w-8 h-8 mx-auto mb-3 animate-spin text-slate-300" />
              Loading your orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center bg-white rounded-2xl border border-gray-100 p-8 shadow-2xs">
              <Package className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-semibold text-sm mb-1">
                No orders found in {activeTab}
              </p>
              <p className="text-slate-400 text-xs mb-4">
                Items you purchase will appear here.
              </p>
              <Link
                to="/collection"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold transition-all shadow-md active:scale-98"
              >
                <ShoppingBag size={14} /> Start Shopping
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const statusStr = (order.status || "Order Placed").trim();
              const sLower = statusStr.toLowerCase();
              const isReviewed = isOrderReviewed(order, userId);
              const isCancelled = sLower === "cancelled" || sLower === "cancel";
              const isReturned = sLower === "returns" || sLower === "return" || sLower === "return refund" || sLower === "returned";
              const isDelivered = (sLower === "delivered" || sLower === "to review" || sLower === "completed") && !isReviewed && !isCancelled && !isReturned;
              const isCompleted = (sLower === "completed" || sLower === "delivered" || sLower === "to review") && isReviewed;
              const isToReceive = (sLower === "in transit" || sLower === "to receive" || sLower === "shipped" || sLower === "out for delivery") && !isDelivered && !isCompleted && !isCancelled;
              const isToShip = (sLower === "waiting for courier" || sLower === "waiting-courier" || sLower === "to ship" || sLower === "processing" || sLower === "preparing") && !isCancelled && !isCompleted && !isToReceive && !isDelivered;
              const isToPay = !isCancelled && !isReturned && !isCompleted && !isDelivered && !isToShip && !isToReceive;

              const orderIdDisplay = order._id ? String(order._id).slice(-12).toUpperCase() : "ORD-0000";
              const rawOrderId = order._id ? String(order._id) : "";

              /* ==========================================================
                 UNIFIED ORDER CARD (Matches CustomerProductDetail & Our Collection UI)
                 ========================================================== */
              const statusConfig = (isCompleted || isDelivered)
                ? { label: isCompleted ? "Delivered / Completed" : "Delivered", bg: "bg-blue-50 text-blue-700 border-blue-200" }
                : isCancelled
                ? { label: "Cancelled", bg: "bg-red-50 text-red-700 border-red-200" }
                : isReturned
                ? { label: "Return Requested", bg: "bg-red-50 text-red-700 border-red-200" }
                : isToReceive
                ? { label: "In Transit", bg: "bg-blue-50 text-blue-700 border-blue-200" }
                : isToShip
                ? { label: "Waiting for Courier", bg: "bg-yellow-50 text-yellow-800 border-yellow-300" }
                : { label: "Order Placed", bg: "bg-yellow-50 text-yellow-800 border-yellow-300" };

              const orderDateStr = order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "";

              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl border border-[#E1E9EF] shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                >
                  {/* CARD HEADER: STATUS PILL, ORDER #, AND ESTIMATED ARRIVAL */}
                  <div className="p-4 sm:p-5 border-b border-[#E1E9EF] flex flex-wrap items-center justify-between gap-3 bg-white">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.bg}`}>
                        {statusConfig.label}
                      </span>
                      {order.cancellationRequest?.status === "Pending" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1 animate-pulse">
                          <Clock size={10} className="text-red-600" />
                          Cancellation Pending Review
                        </span>
                      )}
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <span>Order #{orderIdDisplay}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyOrderId(rawOrderId || orderIdDisplay)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Copy Order ID"
                        >
                          {copiedOrderId === (rawOrderId || orderIdDisplay) ? (
                            <Check size={12} className="text-blue-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                      {orderDateStr && (
                        <>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <span className="text-xs text-slate-400 hidden sm:inline">
                            {orderDateStr}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-xs font-medium">
                      {(isCompleted || isDelivered) ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[10px] font-bold">
                          <CheckCircle2 size={11} className="text-blue-600" />
                          <span>Delivered</span>
                        </span>
                      ) : isCancelled ? (
                        <span className="inline-flex items-center gap-1.5 text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 text-[10px] font-bold">
                          <span>Cancelled</span>
                        </span>
                      ) : isToReceive ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[10px] font-bold">
                          <Truck size={11} className="text-blue-600" />
                          <span>In Transit (Handed over to Rider)</span>
                        </span>
                      ) : isToShip ? (
                        <span className="inline-flex items-center gap-1.5 text-yellow-800 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-300 text-[10px] font-bold">
                          <Package size={11} className="text-yellow-600" />
                          <span>Packing / Waiting for Courier</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-yellow-800 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-300 text-[10px] font-bold">
                          <Clock size={11} className="text-yellow-600" />
                          <span>{getEstimatedArrival(order)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* WEATHER / DELAY ADVISORY (SHOWN ONLY IF DELAYED) */}
                  {order.estimatedDelivery?.isDelayed && (
                    <div className="mx-4 sm:mx-6 mt-4 bg-yellow-50/90 border border-yellow-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-yellow-950">
                      <AlertTriangle size={15} className="text-yellow-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold block text-yellow-900">Delivery Schedule Advisory</span>
                        <span className="text-[11px] text-yellow-800/90 leading-tight block">
                          {order.estimatedDelivery?.delayReason || 'Your parcel might experience a slight delay due to inclement weather conditions / typhoon.'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* COURIER & SHIPPING DETAILS STRIP */}
                  <div className="px-4 sm:px-6 py-2.5 bg-slate-50/70 border-t border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        <strong className="text-slate-800 font-semibold">{order.customerName || "Customer"}</strong>
                        {order.phone && <span className="text-slate-500"> ({order.phone})</span>}
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span className="text-slate-500">{formatShippingAddress(order.shippingAddress) || "Default Delivery Address"}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                      {order.courier && (
                        <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {order.courier}
                        </span>
                      )}
                      {order.trackingNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(order.trackingNumber);
                            setCopiedTrackingId(order._id);
                            showSuccessToast("Tracking number copied!");
                            setTimeout(() => setCopiedTrackingId(null), 2000);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer flex items-center gap-1 transition-colors"
                          title="Click to copy tracking number"
                        >
                          {copiedTrackingId === order._id ? <Check size={11} className="text-blue-600" /> : <Copy size={11} />}
                          <span>{order.trackingNumber}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ITEMS LIST (INITIAL 1 ITEM DISPLAY + VIEW MORE EXPANDER) */}
                  {(() => {
                    const isExpanded = Boolean(expandedOrders[order._id]);
                    const displayedItems = isExpanded
                      ? order.items || []
                      : (order.items || []).slice(0, 1);

                    return (
                      <div className="p-4 sm:p-6 divide-y divide-[#E1E9EF]">
                        {displayedItems.map((item, idx) => {
                          const itemTitle = item.name || item.itemDescription || "Mhira Natural Product";
                          const itemPrice = Number(item.price || 0);
                          const itemQty = Number(item.quantity || 1);
                          const itemImg = getImageUrl(item.image);

                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-4 ${idx > 0 ? "pt-4" : ""} ${
                                idx < (displayedItems.length - 1) ? "pb-4" : ""
                              }`}
                            >
                              {/* THUMBNAIL */}
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 border border-[#E1E9EF] rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                                {itemImg ? (
                                  <img
                                    src={itemImg}
                                    alt=""
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const fb = e.currentTarget.parentElement?.querySelector(".img-fallback");
                                      if (fb) fb.style.display = "flex";
                                    }}
                                    className="w-full h-full object-cover"
                                  />
                                ) : null}
                                <div className={`img-fallback w-full h-full items-center justify-center bg-slate-50 text-slate-300 ${itemImg ? "hidden" : "flex"}`}>
                                  <Package className="w-6 h-6" />
                                </div>
                              </div>

                              {/* ITEM DETAILS */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs sm:text-sm font-medium text-[#243746] line-clamp-2 leading-snug">
                                  {itemTitle}
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {item.category || "Botanical Care"}
                                </p>
                                <div className="flex items-center gap-3 mt-1 sm:hidden">
                                  <span className="text-xs font-bold text-[#243746]">
                                    ₱{itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    Qty: {itemQty}
                                  </span>
                                </div>
                              </div>

                              {/* DESKTOP PRICE & QTY */}
                              <div className="text-right shrink-0 hidden sm:block">
                                <p className="text-sm font-bold text-[#243746]">
                                  ₱{itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Qty: {itemQty}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                        {/* VIEW MORE / VIEW LESS TOGGLE */}
                        {order.items && order.items.length > 1 && (
                          <div className="pt-3 flex justify-center">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrders((prev) => ({
                                  ...prev,
                                  [order._id]: !prev[order._id],
                                }))
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer shadow-2xs"
                            >
                              <span>
                                {isExpanded
                                  ? "View less"
                                  : `View all ${order.items.length} items`}
                              </span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TOTAL AMOUNT & PAYMENT BAR */}
                  <div className="px-4 sm:px-6 py-3.5 bg-slate-50/40 border-t border-[#E1E9EF] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                        {order.paymentMethod || "Cash on Delivery"}
                      </span>
                      {(() => {
                        const isCod = (order.paymentMethod || "").toLowerCase().includes("cod") || (order.paymentMethod || "").toLowerCase().includes("cash on delivery");
                        const isPaid = (order.paymentStatus || "").toLowerCase() === "paid" || isCompleted || isDelivered;
                        const payRef = order.paymentDetails?.referenceNumber;
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isPaid
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-yellow-50 text-yellow-800 border-yellow-300"
                              }`}
                            >
                              {isPaid
                                ? (isCod ? "COD Collected • Paid" : "Online Paid")
                                : (isCod ? "COD • To Collect" : "Payment Pending")}
                            </span>
                            {isPaid && payRef && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                                Ref: {payRef}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {/* Warehouse Inventory Stock Status Pill */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        order.inventoryDeducted || isToReceive || isDelivered || isCompleted
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-yellow-50 text-yellow-800 border-yellow-300"
                      }`}>
                        {order.inventoryDeducted || isToReceive || isDelivered || isCompleted
                          ? "✓ Finished Goods Deducted"
                          : "⏳ Stock Reserved"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Total:</span>
                      <span className="text-base sm:text-lg font-bold text-[#243746]">
                        ₱{(order.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* CONSOLIDATED ACTION FOOTER (SINGLE CLEAN ACTION BAR) */}
                  <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    {/* LEFT: CONTEXTUAL GUIDANCE / STAR RATING */}
                    <div className="text-slate-500 flex items-center gap-2 flex-wrap">
                      {isToPay && (
                        <span className="text-yellow-800 font-medium inline-flex items-center gap-1.5">
                          <Clock size={13} className="text-yellow-600" />
                          <span>Awaiting online payment (GCash, Maya, Card) via PayMongo.</span>
                        </span>
                      )}
                      {isToShip && !isToPay && (
                        <span className="text-blue-700 font-medium inline-flex items-center gap-1.5">
                          <Package size={13} className="text-blue-600" />
                          <span>Fulfillment team is preparing package for courier dispatch.</span>
                        </span>
                      )}
                      {isToReceive && (
                        <span className="text-blue-700 font-medium inline-flex items-center gap-1.5">
                          <Truck size={13} className="text-blue-600" />
                          <span>Parcel is in transit with courier rider. Out for delivery.</span>
                        </span>
                      )}
                      {(isDelivered || isCompleted) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {!isOrderReviewed(order, userId) ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                <Star size={13} className="text-yellow-500 fill-yellow-400" /> Rate:
                              </span>
                              <StarRatingWidget
                                value={0}
                                size={16}
                                onCommit={(star) => {
                                  const firstItem = (order.items && order.items[0]) || {};
                                  handleQuickStarClick(order, firstItem, star);
                                }}
                              />
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200">
                              <CheckCircle2 size={11} className="text-blue-600" />
                              <span>Reviewed ⭐</span>
                            </span>
                          )}
                        </div>
                      )}
                      {isCancelled && (
                        <span className="text-red-700 font-medium inline-flex items-center gap-1.5">
                          <XCircle size={13} className="text-red-600" />
                          <span>Order was cancelled.</span>
                        </span>
                      )}
                      {isReturned && (
                        <span className="text-red-700 font-medium inline-flex items-center gap-1.5">
                          <RotateCcw size={13} className="text-red-600" />
                          <span>Return / replacement request registered.</span>
                        </span>
                      )}
                    </div>

                    {/* RIGHT: CONSOLIDATED ACTION BUTTONS (EXACTLY ONCE EACH) */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Contextual Action 1: Pay Now */}
                      {isToPay && (
                        <button
                          type="button"
                          disabled={payingOrderId === order._id}
                          onClick={() => handlePayNow(order)}
                          className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#01390f] hover:bg-[#0a5219] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {payingOrderId === order._id ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Connecting...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={13} />
                              <span>Pay Now</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Contextual Action 2: Cancel Order */}
                      {isToPay && !isCancelled && (
                        order.cancellationRequest?.status === "Pending" ? (
                          <span className="px-2.5 py-1.5 rounded-full text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 flex items-center gap-1.5 select-none animate-pulse">
                            <Clock size={11} className="text-red-600" />
                            <span>Cancellation Pending Review</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForCancel(order);
                              setCancelReason("Changed mind");
                            }}
                            className="px-3.5 py-2 rounded-full text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                            title="Request order cancellation"
                          >
                            <X size={13} className="text-red-600" />
                            <span>Cancel Order</span>
                          </button>
                        )
                      )}

                      {/* Contextual Action 3: Delivered buttons */}
                      {(isDelivered || isCompleted) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenReceiptModal(order)}
                            className="px-3.5 py-2 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            title="View Official Sales Receipt"
                          >
                            <FileText size={13} className="text-slate-500" />
                            <span>Receipt PDF</span>
                          </button>

                          {order.status !== "Completed" && (
                            <button
                              type="button"
                              onClick={() => handleConfirmOrderReceived(order._id)}
                              className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#01390f] hover:bg-[#0a5219] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={13} />
                              <span>Order Received</span>
                            </button>
                          )}

                          {!isReturned ? (
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForReturn(order)}
                              className="px-3.5 py-2 rounded-full text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                            >
                              <RotateCcw size={13} className="text-red-600" />
                              <span>Return Item</span>
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-red-700 bg-red-50 border border-red-200">
                              Return Requested
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleBuyAgain(order)}
                            className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#01390f] hover:bg-[#0a5219] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                          >
                            <ShoppingBag size={13} />
                            <span>Buy Again</span>
                          </button>
                        </>
                      )}

                      {/* Universal Action 1: Waybill PDF (Single Occurrence) */}
                      <button
                        type="button"
                        onClick={() => handleDownloadWaybillPdf(order)}
                        className="px-3.5 py-2 rounded-full text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        title="Download 100x150mm Courier Shipping Label"
                      >
                        <Printer size={13} className="text-blue-600" />
                        <span>Waybill PDF</span>
                      </button>

                      {/* Universal Action 2: Process Records (Single Occurrence) */}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForTimeline(order)}
                        className="px-3.5 py-2 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        title="View Process Records, Payments & Audit Trail"
                      >
                        <Clock size={13} className="text-slate-500" />
                        <span>Process Records</span>
                      </button>

                      {/* Details View */}
                      <button
                        type="button"
                        onClick={() => handleOpenOrderModal(order)}
                        className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="View Full Order Summary"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>

                  {/* SUBTLE SUPPORT BAR */}
                  <button
                    type="button"
                    onClick={() => handleContactSupportForOrder(order)}
                    className="w-full py-2 px-4 bg-slate-50/50 hover:bg-slate-100/60 border-t border-[#E1E9EF] text-slate-500 hover:text-slate-800 flex items-center justify-between transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-medium">
                      <HelpCircle size={13} className="text-slate-400" />
                      <span>Need help with this order? Contact Support</span>
                    </div>
                    <ChevronRight size={13} className="text-slate-300" />
                  </button>
                </div>
              );
            })
          )}
          </section>
        </div>
      </main>

      {/* ================= PURE RETURN REQUEST MODAL ================= */}
      {selectedOrderForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Request Item Return
                  </h3>
                  <p className="text-[11px] text-red-700 font-medium">
                    Free returns at your convenience • 7-Day Guarantee
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForReturn(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleReturnSubmit} className="p-6 flex flex-col gap-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Reason for Return *
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E1E9EF] text-[#243746] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#79A94B] transition-all"
                >
                  <option value="Damaged / Broken Item">Damaged / Broken Item</option>
                  <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                  <option value="Missing Items in Parcel">Missing Items in Parcel</option>
                  <option value="Expired Product">Expired Product</option>
                  <option value="Defective / Leakage">Defective / Leakage</option>
                  <option value="Change of Mind">Change of Mind</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Additional Details & Return Comments
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe why you wish to return these items in detail..."
                  value={returnComments}
                  onChange={(e) => setReturnComments(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E1E9EF] text-[#243746] rounded-xl p-3.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#79A94B] transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForReturn(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-6 py-2.5 rounded-full transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingReturn ? "Submitting..." : "Submit Return Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= WRITE REVIEW MODAL ================= */}
      {selectedProductForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/80 flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            {/* HEADER (ICON REMOVED, TITLE IS 'Write a review') */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Write a review
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedProductForReview(null);
                  setReviewComment("");
                  setReviewMedia([]);
                  setIsAnonymous(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleReviewSubmit} className="p-6 flex flex-col gap-4 text-xs sm:text-sm overflow-y-auto">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center relative shrink-0">
                  {getImageUrl(selectedProductForReview.image) ? (
                    <img
                      src={getImageUrl(selectedProductForReview.image)}
                      alt={selectedProductForReview.name}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallbackEl = e.currentTarget.parentElement?.querySelector(".no-img-label");
                        if (fallbackEl) fallbackEl.style.display = "flex";
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  <div
                    className={`no-img-label w-full h-full flex flex-col items-center justify-center p-1 text-center bg-slate-50 select-none ${
                      getImageUrl(selectedProductForReview.image) ? "hidden" : "flex"
                    }`}
                  >
                    <Package className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
                <p className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-2">
                  {selectedProductForReview.name}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Rating (Select Stars)
                </label>
                <StarRatingWidget
                  value={ratingValue}
                  onChange={(star) => setRatingValue(star)}
                  size={28}
                  showLabel={true}
                />
              </div>

              {/* REVIEW TEXTAREA (WRITE 30+ CHARACTERS) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Your Review / Feedback *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write 30+ characters..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E1E9EF] text-[#243746] rounded-xl p-3.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#79A94B] transition-all resize-none placeholder:text-slate-400"
                />
                <div className="flex items-center justify-between text-[11px] mt-1">
                  <span className="text-slate-500 font-medium">Write 30+ characters</span>
                  <span className={`font-semibold ${reviewComment.trim().length >= 30 ? "text-blue-700" : "text-slate-400"}`}>
                    {reviewComment.trim().length >= 30 ? `✓ ${reviewComment.trim().length} chars` : `${reviewComment.trim().length} / 30`}
                  </span>
                </div>
              </div>

              {/* ADD A PHOTO OR VIDEO */}
              <div>
                <input
                  type="file"
                  ref={reviewMediaInputRef}
                  onChange={handleReviewMediaSelect}
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => reviewMediaInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/80 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Camera size={15} className="text-slate-500" />
                  <span>Add a photo or video</span>
                </button>

                {/* MEDIA PREVIEWS */}
                {reviewMedia.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-2.5">
                    {reviewMedia.map((m, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden group">
                        {m.type?.startsWith("video") ? (
                          <video src={m.previewUrl} className="w-full h-full object-cover" />
                        ) : (
                          <img src={m.previewUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveReviewMedia(idx)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-[10px] hover:bg-slate-900 cursor-pointer shadow-xs"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* POST ANONYMOUSLY CHECKBOX */}
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#79A94B] focus:ring-[#79A94B] accent-[#79A94B] cursor-pointer"
                />
                <span className="font-medium">Post anonymously</span>
              </label>

              {/* CANCEL AND SUBMIT BUTTONS */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductForReview(null);
                    setReviewComment("");
                    setReviewMedia([]);
                    setIsAnonymous(false);
                  }}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-[#246C94] hover:bg-[#1D5777] text-white font-semibold text-xs px-6 py-2.5 rounded-full transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingReview ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= OFFICIAL SALES RECEIPT / ORDER DETAILS MODAL ================= */}
      {selectedOrderForReceipt && (() => {
        const order = selectedOrderForReceipt;
        const isReceiptMode = receiptModalMode === "receipt";
        const fullOrderId = String(order.orderNumber || order._id || "51ACE3DD").toUpperCase();
        const orderIdShort = fullOrderId.slice(-8);
        const receiptNumber = `20261009-${String(order._id || fullOrderId).replace(/[^a-zA-Z0-9]/g, "").slice(-18).toUpperCase()}`;

        const customerName =
          order.customerName ||
          order.userId?.name ||
          order.user?.name ||
          (() => {
            try {
              const u = JSON.parse(localStorage.getItem("user") || "{}");
              return u.name || u.fullName || "Kent Bundalian";
            } catch {
              return "Kent Bundalian";
            }
          })();

        const customerPhone =
          order.phone ||
          order.shippingPhone ||
          order.contactNumber ||
          (() => {
            try {
              const u = JSON.parse(localStorage.getItem("user") || "{}");
              return u.phone || u.contactNumber || "+63 9154673941";
            } catch {
              return "+63 9154673941";
            }
          })();

        const customerAddress =
          formatShippingAddress(order.shippingAddress) || "ccc, Brgy. Uwisan, Calamba City, Laguna, 4027, Philippines";

        const orderCreated = order.createdAt ? new Date(order.createdAt) : new Date();
        const orderDateFormatted = orderCreated.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const orderTimeFormatted = orderCreated.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const receiptDateTime = `${orderDateFormatted} ${orderTimeFormatted}`;

        const itemsList = Array.isArray(order.items) && order.items.length > 0 ? order.items : [
          { name: "FACE SERUM COLLAGEN", price: order.totalAmount || 300, quantity: 1 }
        ];

        const subtotal = Number(order.totalAmount || 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto font-['Poppins',sans-serif]">
            {isReceiptMode ? (
              /* REAL PAPER DOCUMENT RECEIPT (TIKTOK SHOP STYLE) */
              <div className="bg-slate-100 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/90 flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
                {/* TOP NAVIGATION BAR */}
                <div className="bg-white px-4 sm:px-6 py-3.5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForReceipt(null)}
                    className="p-1.5 -ml-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  >
                    <ArrowLeft size={18} />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                  <h3 className="text-base font-bold text-slate-800 tracking-tight">
                    Receipt
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForReceipt(null)}
                    className="p-1.5 -mr-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* SCROLLABLE DOCUMENT CONTAINER */}
                <div className="p-3 sm:p-6 max-h-[72vh] overflow-y-auto custom-scrollbar">
                  {/* WHITE PAPER SHEET */}
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/90 p-5 sm:p-8 space-y-5 text-slate-800">
                    {/* DOCUMENT TOP HEADER */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src="/mhira_removebg.png"
                          alt="Mhira Natural Botanicals"
                          className="h-9 sm:h-11 w-auto object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                            Mhira Natural Botanicals
                          </h2>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Pure Natural Botanicals & Skin Care
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                          Order Receipt
                        </h1>
                      </div>
                    </div>

                    {/* SHADED RECEIPT NUMBER & DATE BAR */}
                    <div className="bg-[#F8F9FA] rounded-md px-3.5 py-3 border border-slate-100 text-[11px] sm:text-xs text-slate-600 space-y-1 font-normal">
                      <p>
                        <span className="text-slate-500">Receipt Number :</span>{" "}
                        <span className="font-mono text-slate-700 font-medium">{receiptNumber}</span>
                      </p>
                      <p>
                        <span className="text-slate-500">Receipt Date :</span>{" "}
                        <span className="text-slate-700 font-medium">{receiptDateTime}</span>
                      </p>
                    </div>

                    {/* 3-COLUMN METADATA GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700 pt-1 pb-2">
                      {/* COLUMN 1: DELIVERY DETAILS */}
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1.5 text-xs sm:text-[13px]">
                          Delivery Details
                        </h4>
                        <p className="font-semibold text-slate-800">{customerName}</p>
                        <p className="text-slate-600 leading-relaxed text-[11px] sm:text-xs mt-1">
                          {customerAddress}
                        </p>
                        {customerPhone && (
                          <p className="text-slate-500 text-[11px] mt-1">{customerPhone}</p>
                        )}
                      </div>

                      {/* COLUMN 2: SOLD BY */}
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1.5 text-xs sm:text-[13px]">
                          Sold By
                        </h4>
                        <p className="font-semibold text-slate-800">MHIRA NATURAL BOTANICALS</p>
                        <p className="text-slate-600 leading-relaxed text-[11px] sm:text-xs mt-1">
                          Calamba City, Laguna, Philippines
                        </p>
                      </div>

                      {/* COLUMN 3: ORDER DETAILS */}
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1.5 text-xs sm:text-[13px]">
                          Order Details
                        </h4>
                        <div className="space-y-1 text-[11px] sm:text-xs">
                          <div>
                            <span className="text-slate-500">Order Number :</span>{" "}
                            <span className="font-medium text-slate-800 font-mono ml-1">
                              {fullOrderId}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Order Date :</span>{" "}
                            <span className="font-medium text-slate-800 ml-1">
                              {orderDateFormatted}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Payment :</span>{" "}
                            <span className="font-medium text-slate-800 ml-1">
                              {order.paymentMethod || "Cash on Delivery"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ITEMS TABLE */}
                    <div>
                      {/* TABLE HEADER */}
                      <div className="bg-[#F8F9FA] rounded-xs px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 border border-slate-100">
                        <span>Item Description</span>
                        <span>Quantity</span>
                      </div>

                      {/* TABLE ROWS */}
                      <div className="divide-y divide-slate-100">
                        {itemsList.map((item, idx) => {
                          const itemTitle = item.name || item.itemDescription || "Botanical Product";
                          const itemPrice = Number(item.price || 0);
                          const itemQty = Number(item.quantity || 1);
                          return (
                            <div
                              key={idx}
                              className="py-3 px-3.5 flex items-start justify-between gap-4 text-xs text-slate-800"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-medium text-slate-900 leading-snug">
                                  {itemTitle}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  ₱{itemPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} × {itemQty}
                                </p>
                              </div>
                              <span className="font-medium text-slate-800 shrink-0">
                                {itemQty}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* FINANCIAL BREAKDOWN */}
                    <div className="ml-auto w-full max-w-xs pt-2 space-y-2 text-xs text-slate-700">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-medium text-slate-800">
                          ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Handling fee</span>
                        <span className="font-medium text-slate-800">₱0.00</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping</span>
                        <span className="font-medium text-blue-700">FREE</span>
                      </div>

                      {/* SHADED GRAND TOTAL BAR */}
                      <div className="bg-[#F8F9FA] rounded-xs px-3.5 py-2.5 flex items-center justify-between font-bold text-slate-900 border border-slate-100 mt-2 text-xs sm:text-sm">
                        <span>Grand total (includes VAT)</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* FOOTER DISCLAIMER */}
                    <div className="pt-8 pb-1 text-center space-y-1 text-[11px] text-slate-500 border-t border-slate-100">
                      <p className="font-normal flex items-center justify-center gap-1">
                        <span>ⓘ</span> This receipt serves as proof of purchase and does not qualify as a tax invoice.
                      </p>
                      <p className="font-medium text-slate-700">
                        Thank you for your purchase.
                      </p>
                    </div>
                  </div>
                </div>

                {/* STICKY BOTTOM DOWNLOAD BUTTON (USING SIDEBAR BACKGROUND) */}
                <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-200 flex items-center justify-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadReceiptPdf(order)}
                    style={{
                      background: "linear-gradient(135deg, #012b0b 0%, #01390f 50%, #0a5219 100%)",
                    }}
                    className="w-full py-3.5 px-6 rounded-full text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-[#01390f]/20 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <Download size={18} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW ORDER DETAILS & SUMMARY MODAL */
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
                {/* BRANDED HEADER */}
                <div className="bg-[#01390f] text-white p-6 relative flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-blue-200" />
                      <span className="text-xs font-black tracking-widest uppercase text-blue-100">
                        Order Details & Summary
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Mhira Natural Botanicals
                    </h3>
                    <p className="text-[11px] text-blue-100 opacity-90">
                      Order #{orderIdShort} • {orderDateFormatted}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedOrderForReceipt(null)}
                    className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* ORDER BODY */}
                <div className="p-6 space-y-5 text-xs sm:text-sm max-h-[65vh] overflow-y-auto custom-scrollbar">
                  {/* STATUS & PAYMENT SUMMARY */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Payment Method
                      </span>
                      <p className="font-bold text-slate-800 text-xs">
                        {order.paymentMethod || "Cash on Delivery (COD)"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Payment Status
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        getEffectivePaymentStatus(order) === "Paid"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-yellow-50 text-yellow-800 border border-yellow-300"
                      }`}>
                        <CheckCircle2 size={11} /> {getEffectivePaymentStatus(order)}
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Shipping Address
                      </span>
                      <p className="text-slate-700 text-xs leading-relaxed">
                        {customerAddress}
                      </p>
                    </div>
                  </div>

                  {/* ITEM LIST */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Purchased Items ({itemsList.length})
                    </h4>
                    <div className="divide-y divide-slate-100 border-y border-slate-100">
                      {itemsList.map((item, idx) => {
                        const itemTitle = item.name || item.itemDescription || "Botanical Product";
                        const itemPrice = Number(item.price || 0);
                        const itemQty = Number(item.quantity || 1);
                        return (
                          <div key={idx} className="py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                                {getImageUrl(item.image) ? (
                                  <img
                                    src={getImageUrl(item.image)}
                                    alt={itemTitle}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package size={16} className="text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-xs truncate max-w-[200px] sm:max-w-xs">
                                  {itemTitle}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  ₱{itemPrice.toFixed(2)} × {itemQty}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-slate-900 text-xs shrink-0">
                              ₱{(itemPrice * itemQty).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PRICE BREAKDOWN */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>
                        ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Shipping Fee</span>
                      <span className="text-blue-700 font-semibold">FREE</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-3 border-t border-slate-200">
                      <span>Grand Total Paid</span>
                      <span className="text-base text-[#01390f]">
                        ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTION FOOTER */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForReceipt(null)}
                    className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadReceiptPdf(order)}
                    className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Download size={14} />
                    <span>Download PDF Receipt</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* CUSTOMER PROOF OF DELIVERY (POD) MODAL */}
      {selectedOrderForPod && (
        <div
          onClick={() => setSelectedOrderForPod(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Proof of Delivery (POD)</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Order #{String(selectedOrderForPod._id).slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForPod(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedOrderForPod.proofOfDelivery?.image ? (
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden border border-gray-200 bg-slate-100 shadow-2xs">
                  <img
                    src={selectedOrderForPod.proofOfDelivery.image}
                    alt="Proof of Delivery Photo"
                    className="w-full max-h-72 object-cover"
                  />
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-100 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Received By:</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrderForPod.proofOfDelivery.recipientName || 'Customer'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Delivered On:</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {new Date(
                        selectedOrderForPod.proofOfDelivery.deliveredAt ||
                        selectedOrderForPod.updatedAt ||
                        Date.now()
                      ).toLocaleString()}
                    </span>
                  </div>
                  {selectedOrderForPod.proofOfDelivery.notes && (
                    <div className="pt-1 text-[11px] text-slate-600 italic border-t border-slate-200/60 mt-1">
                      "{selectedOrderForPod.proofOfDelivery.notes}"
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No delivery photo uploaded for this order.
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrderForPod(null)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER PARCEL TRACKING & PROCESS RECORDS MODAL */}
      {selectedOrderForTimeline && (
        <div
          onClick={() => setSelectedOrderForTimeline(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shadow-xs">
                  <Truck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Process Records & Audit Trail</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Order #{String(selectedOrderForTimeline._id).slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForTimeline(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 3 Status KPI Cards in Modal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {/* Payment Card */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Payment Audit</span>
                {(() => {
                  const isCod = (selectedOrderForTimeline.paymentMethod || "").toLowerCase().includes("cod") || (selectedOrderForTimeline.paymentMethod || "").toLowerCase().includes("cash on delivery");
                  const s = (selectedOrderForTimeline.status || "").toLowerCase();
                  const isPaid = (selectedOrderForTimeline.paymentStatus || "").toLowerCase() === "paid" || s === "delivered" || s === "completed";
                  const payRef = selectedOrderForTimeline.paymentDetails?.referenceNumber;
                  return (
                    <div className="space-y-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${isPaid ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-yellow-50 text-yellow-800 border border-yellow-300"}`}>
                        {isPaid ? (isCod ? "COD Collected" : "Online Paid") : (isCod ? "COD To Collect" : "Payment Pending")}
                      </span>
                      {payRef && (
                        <p className="text-[10px] font-mono font-bold text-blue-800 truncate" title={payRef}>
                          Ref: {payRef}
                        </p>
                      )}
                    </div>
                  );
                })()}
                <p className="text-[10px] text-slate-500 truncate">{selectedOrderForTimeline.paymentMethod || "COD"}</p>
              </div>

              {/* Warehouse Inventory Sync Card */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Warehouse Stock</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                  selectedOrderForTimeline.inventoryDeducted || (selectedOrderForTimeline.status || '').toLowerCase().includes('transit') || (selectedOrderForTimeline.status || '').toLowerCase() === 'delivered' || (selectedOrderForTimeline.status || '').toLowerCase() === 'completed'
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-yellow-50 text-yellow-800 border border-yellow-300"
                }`}>
                  {selectedOrderForTimeline.inventoryDeducted || (selectedOrderForTimeline.status || '').toLowerCase().includes('transit') || (selectedOrderForTimeline.status || '').toLowerCase() === 'delivered' || (selectedOrderForTimeline.status || '').toLowerCase() === 'completed'
                    ? "Stock Deducted"
                    : "Stock Reserved"}
                </span>
                <p className="text-[10px] text-slate-500 truncate">Finished Goods</p>
              </div>

              {/* Waybill Status Card */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Waybill Label</span>
                <button
                  type="button"
                  onClick={() => handleDownloadWaybillPdf(selectedOrderForTimeline)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Printer size={9} className="text-blue-600" />
                  <span>Waybill PDF</span>
                </button>
                <p className="text-[10px] font-mono text-slate-500 truncate">{selectedOrderForTimeline.trackingNumber || "Assigned"}</p>
              </div>
            </div>

            {/* Chronological Timeline */}
            <div className="max-h-80 overflow-y-auto pr-1 space-y-4 border-l-2 border-blue-200 ml-2 pl-4 py-1">
              {(selectedOrderForTimeline.trackingTimeline || []).map((step, sIdx) => {
                const titleLower = (step.title || "").toLowerCase();
                const isCancellation = titleLower.includes("cancel") || titleLower.includes("declined");
                const isWarning = titleLower.includes("waiting") || titleLower.includes("pending") || titleLower.includes("delay");

                return (
                  <div key={sIdx} className="relative space-y-1">
                    <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full ring-4 ring-white ${
                      isCancellation
                        ? "bg-red-500"
                        : isWarning
                        ? "bg-yellow-500"
                        : "bg-blue-600"
                    }`} />
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-slate-900">{step.title}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {step.actor || "Logistics Team"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{step.description}</p>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {new Date(step.timestamp).toLocaleString()}
                    </span>
                  </div>
                );
              })}

              {/* Proof of Delivery Photo embedded directly under Delivered Milestone */}
              {selectedOrderForTimeline.proofOfDelivery?.image && (
                <div className="mt-3 p-3 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Camera size={13} className="text-blue-700" /> Proof of Delivery (Photo)
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Received by: <strong className="text-slate-800 font-semibold">{selectedOrderForTimeline.proofOfDelivery.recipientName || 'Customer'}</strong>
                    </span>
                  </div>
                  <div
                    className="rounded-xl overflow-hidden border border-blue-200/60 bg-white shadow-2xs group relative cursor-pointer"
                    onClick={() => window.open(selectedOrderForTimeline.proofOfDelivery.image, '_blank')}
                    title="Click to view full photo"
                  >
                    <img
                      src={selectedOrderForTimeline.proofOfDelivery.image}
                      alt="Proof of Delivery Photo"
                      className="w-full max-h-56 object-cover transition-transform group-hover:scale-[1.02] duration-200"
                    />
                  </div>
                  {selectedOrderForTimeline.proofOfDelivery.notes && (
                    <p className="text-[11px] text-slate-600 italic">
                      Courier note: "{selectedOrderForTimeline.proofOfDelivery.notes}"
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDownloadWaybillPdf(selectedOrderForTimeline)}
                className="px-4 py-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Printer size={13} className="text-blue-600" />
                <span>Waybill PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderForTimeline(null)}
                className="px-5 py-2 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-xs font-bold transition-all shadow-xs cursor-pointer border border-[#d5ead7]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CANCEL ORDER CONFIRMATION MODAL ================= */}
      {selectedOrderForCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans"
          onClick={() => setSelectedOrderForCancel(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default border border-slate-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center border border-red-200 shadow-2xs">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#243746]">Request Order Cancellation</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Order #{String(selectedOrderForCancel._id).slice(-12).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForCancel(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Are you sure you want to request cancellation for this order? Your request will be sent to our Logistics fulfillment team for review and approval.
              </p>

              <div>
                <label className="block text-slate-700 font-medium mb-1.5">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#01390f] text-slate-700 cursor-pointer"
                >
                  <option value="Changed mind">Changed mind</option>
                  <option value="Duplicate order placed">Duplicate order placed</option>
                  <option value="Incorrect delivery address">Incorrect delivery address</option>
                  <option value="Need to modify item quantity">Need to modify item quantity</option>
                  <option value="Found better pricing elsewhere">Found better pricing elsewhere</option>
                  <option value="Other reasons">Other reasons</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedOrderForCancel(null)}
                disabled={isSubmittingCancel}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancelOrder}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmittingCancel ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <X size={13} />
                    <span>Submit Cancel Request</span>
                  </>
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

export default CustomerOrders;
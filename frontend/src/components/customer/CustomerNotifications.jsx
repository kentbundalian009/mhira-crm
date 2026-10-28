import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Tag,
  Info,
  CheckCheck,
  Package,
  Truck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Copy,
  Sparkles,
  RotateCcw
} from "lucide-react";
import axios, { API } from "../../axios";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast } from "../../utils/toast";
import { getUserId, isUserLoggedIn } from "../../utils/userId";

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

function CustomerNotifications() {
  const navigate = useNavigate();
  const userId = getUserId();
  const loggedIn = isUserLoggedIn();

  const [activeTab, setActiveTab] = useState("All");
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_customer_orders");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);

  // Local storage persisted read status
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem("read_notification_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Base System Notifications
  const baseSystemNotifications = useMemo(
    () => [
      {
        id: "sys-welcome",
        title: "Welcome to Mhira Natural Skincare!",
        message: "Your customer account is active. Explore our 100% natural organic soaps, tea, and handcrafted serums.",
        date: "2026-08-10",
        type: "System",
        badgeText: "Welcome",
        badgeStyle: "bg-[#EAF3E4] text-[#79A94B] border border-[#79A94B]/30",
        link: "/collection",
        linkText: "Explore Collection",
      },
      {
        id: "sys-shipping",
        title: "Logistics Delivery Active",
        message: "Standard nationwide cash-on-delivery and doorstep shipping are fully operational across the Philippines.",
        date: "2026-08-05",
        type: "System",
        badgeText: "Logistics",
        badgeStyle: "bg-sky-50 text-sky-800 border border-sky-200",
      },
    ],
    []
  );

  // 1. Fetch Orders from Backend API
  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/api/orders/user/${encodeURIComponent(userId)}`);
        if (Array.isArray(res.data)) {
          setOrders(res.data);
          try {
            localStorage.setItem("cached_customer_orders", JSON.stringify(res.data));
          } catch (e) {}
        }
      } catch (error) {
        console.error("Error fetching orders for notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId]);

  // 2. Fetch Active Coupons from Backend
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/coupons`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCoupons(res.data.filter((c) => c.status === "Active"));
        }
      })
      .catch(() => {});
  }, []);

  // 3. Combine Order Milestones, Promos, and System Notifications
  const combinedNotifications = useMemo(() => {
    // Dynamic Order Notifications
    const orderNotifs = orders.map((order) => {
      const orderShortId = order._id?.slice(-8).toUpperCase();
      let notifTitle = `Order #${orderShortId} Update`;
      let notifMessage = `Your order of ${order.items?.length || 1} item(s) is currently: ${order.status}.`;
      let notifDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "Recent";
      let IconComponent = Package;
      let badgeStyle = "bg-slate-100 text-slate-700 border border-slate-200";
      let badgeText = order.status || "Processing";

      if (order.status === "To Ship") {
        notifTitle = `Order #${orderShortId} is Being Prepared`;
        notifMessage = "Our packaging team is inspecting and packing your natural products for courier pickup.";
        IconComponent = Package;
        badgeStyle = "bg-sky-50 text-sky-800 border border-sky-200";
        badgeText = "Preparing";
      } else if (order.status === "To Receive") {
        notifTitle = `Parcel #${orderShortId} is On The Way!`;
        notifMessage = "Your parcel has been dispatched with our delivery courier. Please prepare payment if paying COD.";
        IconComponent = Truck;
        badgeStyle = "bg-indigo-50 text-indigo-800 border border-indigo-200";
        badgeText = "In Transit";
      } else if (order.status === "Completed") {
        notifTitle = `Parcel #${orderShortId} Delivered`;
        notifMessage = "Your parcel was safely delivered! We hope you love your natural skincare essentials.";
        IconComponent = CheckCircle2;
        badgeStyle = "bg-[#EAF3E4] text-[#79A94B] border border-[#79A94B]/40";
        badgeText = "Delivered";
      } else if (order.status === "Return Refund") {
        notifTitle = `Return Ticket for Order #${orderShortId}`;
        notifMessage = "Your return/refund request is currently undergoing review by our logistics care team.";
        IconComponent = RotateCcw;
        badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
        badgeText = "Return/Refund";
      } else if (order.status === "Cancelled") {
        notifTitle = `Order #${orderShortId} Cancelled`;
        notifMessage = "This order has been cancelled. Reach out to support if you have any questions.";
        IconComponent = Info;
        badgeStyle = "bg-slate-100 text-slate-700 border border-slate-200";
        badgeText = "Cancelled";
      }

      const notifId = `order-${order._id}-${order.status}`;
      const isRead = order.status === "Completed" || readNotifIds.includes(notifId);

      return {
        id: notifId,
        title: notifTitle,
        message: notifMessage,
        date: notifDate,
        rawDate: order.updatedAt ? new Date(order.updatedAt) : order.createdAt ? new Date(order.createdAt) : new Date(0),
        read: isRead,
        type: "Orders",
        icon: IconComponent,
        badgeStyle,
        badgeText,
        orderId: order._id,
        orderTotal: order.totalAmount,
        itemCount: order.items?.length || 1,
        link: "/orders",
        linkText: "View Order",
      };
    });

    // Dynamic Promo Notifications
    const promoNotifs = (coupons.length > 0
      ? coupons
      : [
          {
            code: "ORGANIC10",
            discount: "10% OFF",
            description: "Special Member Voucher: Enjoy 10% off storewide on your natural skincare haul.",
            createdAt: new Date("2026-08-15"),
          },
        ]
    ).map((coupon, idx) => {
      const code = coupon.code || "MHIRAVOUCHER";
      const notifId = `promo-${code}-${idx}`;
      return {
        id: notifId,
        title: `Special Promo: ${code}`,
        message: coupon.description || `Enjoy ${coupon.discount || "discount"} with voucher code ${code}.`,
        date: coupon.createdAt
          ? new Date(coupon.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Active",
        rawDate: coupon.createdAt ? new Date(coupon.createdAt) : new Date("2026-08-10"),
        read: readNotifIds.includes(notifId),
        type: "Promotions",
        icon: Tag,
        badgeStyle: "bg-amber-50 text-amber-800 border border-amber-200",
        badgeText: coupon.discount || "Promo",
        couponCode: code,
        link: "/collection",
        linkText: "Shop & Apply",
      };
    });

    // System Notifications
    const systemNotifs = baseSystemNotifications.map((sys) => ({
      ...sys,
      rawDate: new Date(sys.date),
      read: readNotifIds.includes(sys.id),
      icon: sys.id === "sys-welcome" ? Sparkles : Info,
    }));

    const all = [...orderNotifs, ...promoNotifs, ...systemNotifs];
    all.sort((a, b) => b.rawDate - a.rawDate);
    return all;
  }, [orders, coupons, baseSystemNotifications, readNotifIds]);

  const tabs = ["All", "Orders", "Promotions", "System"];

  // Filtered List
  const filteredList = useMemo(() => {
    if (activeTab === "All") return combinedNotifications;
    return combinedNotifications.filter((item) => item.type === activeTab);
  }, [combinedNotifications, activeTab]);

  const unreadCount = combinedNotifications.filter((n) => !n.read).length;

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    const allIds = combinedNotifications.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem("read_notification_ids", JSON.stringify(allIds));
    } catch {}
    showSuccessToast("All notifications marked as read.");
  };

  // Mark single notification as read
  const handleMarkSingleAsRead = (id, e) => {
    if (e) e.stopPropagation();
    setReadNotifIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem("read_notification_ids", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Copy coupon code
  const handleCopyCode = (code, e) => {
    if (e) e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      showSuccessToast(`Voucher code "${code}" copied to clipboard!`);
    } else {
      showSuccessToast(`Voucher Code: ${code}`);
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* BREADCRUMB & HEADER (STANDARD BLK / NIKE MINIMALIST DESIGN) */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-[#243746] font-medium">Notifications</span>
          </nav>

          <div className="flex items-center justify-between border-b border-[#E1E9EF] pb-4">
            <h1 className="text-xl sm:text-2xl font-normal text-[#243746] tracking-tight">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h1>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1.5 text-xs text-[#01390f] hover:text-[#01250a] font-medium cursor-pointer py-1 px-3 rounded-full hover:bg-emerald-50 transition-colors"
              >
                <CheckCheck size={14} />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* ================= LEFT SIDEBAR (CLEAN TEXT-ONLY CATEGORIES MATCHING COLLECTION) ================= */}
          <aside className="w-full md:w-56 flex-shrink-0">
            <nav className="flex md:flex-col overflow-x-auto scrollbar-none gap-5 sm:gap-6 md:gap-0 pb-2 md:pb-0 md:space-y-0.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`py-1 text-xs sm:text-sm leading-snug transition-colors text-left cursor-pointer shrink-0 md:w-full whitespace-nowrap ${
                      isActive
                        ? "text-[#01390f] font-bold"
                        : "text-[#26332E] hover:text-[#01390f] font-normal"
                    }`}
                  >
                    <span>{tab}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ================= RIGHT MAIN CONTENT AREA ================= */}
          <section className="flex-1 w-full min-w-0">
            {/* NOTIFICATIONS LIST (MATCHING ORDER & CART LIST DESIGN) */}
            <div>
              {loading && combinedNotifications.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">Loading notifications...</div>
              ) : filteredList.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <p className="text-slate-400 italic text-sm mb-4">
                    No notifications found in {activeTab}.
                  </p>
                  <Link
                    to="/collection"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#01390f] text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[#01250a] transition-all cursor-pointer shadow-sm"
                  >
                    <span>Browse Products</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#E1E9EF] border-t border-[#E1E9EF]">
                  {filteredList.map((item) => {
                    const ItemIcon = item.icon || Bell;
                    const isUnread = !item.read;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          handleMarkSingleAsRead(item.id);
                          if (item.link) navigate(item.link);
                        }}
                        className={`py-6 space-y-3 cursor-pointer transition-colors ${
                          isUnread ? "bg-[#EAF3E4]/60 -mx-3 px-3 rounded-lg sm:-mx-4 sm:px-4" : ""
                        }`}
                      >
                        {/* NOTIFICATION HEADER */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-[#01390f] shrink-0" title="Unread" />
                            )}
                            <span className={`font-medium ${isUnread ? "text-[#243746] font-bold" : "text-slate-800"}`}>
                              {item.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-400">{item.date}</span>
                            {item.badgeText && (
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${item.badgeStyle}`}>
                                {item.badgeText}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* NOTIFICATION BODY */}
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs ${
                              item.badgeStyle || "bg-slate-50 border-gray-100 text-slate-700"
                            }`}
                          >
                            <ItemIcon className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                              {item.message}
                            </p>
                            {item.orderTotal !== undefined && (
                              <p className="text-xs font-medium text-slate-900">
                                Total: ₱{Number(item.orderTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* NOTIFICATION FOOTER & ACTIONS */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-[#E1E9EF]">
                          <div>
                            {item.couponCode && (
                              <button
                                type="button"
                                onClick={(e) => handleCopyCode(item.couponCode, e)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-semibold font-mono transition-colors cursor-pointer"
                              >
                                <Copy size={12} />
                                <span>Copy: {item.couponCode}</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            {isUnread && (
                              <button
                                type="button"
                                onClick={(e) => handleMarkSingleAsRead(item.id, e)}
                                className="text-xs text-slate-400 hover:text-slate-700 underline cursor-pointer"
                              >
                                Mark read
                              </button>
                            )}

                            {item.link && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#01390f] hover:text-[#01250a] transition-colors">
                                <span>{item.linkText || "View Details"}</span>
                                <ArrowRight size={13} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CustomerNotifications;

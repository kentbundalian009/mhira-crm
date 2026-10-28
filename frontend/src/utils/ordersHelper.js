import axios from "../axios";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_BASE_URL =
  !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

/**
 * Checks if an order has been marked as reviewed by the customer.
 */
export const isOrderReviewed = (order, userId) => {
  if (!order) return false;
  if (order.isReviewed === true) return true;
  if (typeof window === "undefined") return false;
  try {
    const key = `mhira_reviewed_orders_${userId || "default"}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed[order._id] || parsed[order.id])) return true;
    }
  } catch (e) {}
  return false;
};

/**
 * Marks an order as reviewed in local storage and dispatches sync event.
 */
export const markOrderAsReviewed = (orderId, userId) => {
  if (!orderId || typeof window === "undefined") return;
  try {
    const key = `mhira_reviewed_orders_${userId || "default"}`;
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[orderId] = true;
    localStorage.setItem(key, JSON.stringify(parsed));
    window.dispatchEvent(new Event("ordersUpdated"));
  } catch (e) {}
};

/**
 * Determines whether a specific order belongs to a given tab.
 */
export const isOrderInTab = (order, tabName, userId) => {
  if (!order) return false;
  const s = String(order.status || "").toLowerCase().trim();
  const ps = String(order.paymentStatus || "").toLowerCase().trim();
  const pm = String(order.paymentMethod || "").toLowerCase().trim();

  // 1. Order Placed = To Pay
  if (tabName === "To Pay") {
    if (
      s === "cancelled" ||
      s === "completed" ||
      s === "delivered" ||
      s === "to review" ||
      s === "in transit" ||
      s === "to receive" ||
      s === "out for delivery" ||
      s === "waiting for courier" ||
      s === "waiting-courier" ||
      s === "to ship"
    ) {
      return false;
    }
    return (
      s === "order placed" ||
      s === "to pay" ||
      s === "pending" ||
      ps === "pending payment" ||
      ps === "unpaid"
    );
  }

  // 2. Waiting for Courier = To Ship
  if (tabName === "To Ship") {
    if (
      s === "cancelled" ||
      s === "completed" ||
      s === "delivered" ||
      s === "to review" ||
      s === "in transit" ||
      s === "to receive" ||
      s === "out for delivery"
    ) {
      return false;
    }
    return (
      s === "waiting for courier" ||
      s === "waiting-courier" ||
      s === "to ship" ||
      s === "processing" ||
      s === "preparing"
    );
  }

  // 3. In Transit = To Receive
  if (tabName === "To Receive") {
    if (s === "cancelled" || s === "completed" || s === "delivered" || s === "to review") {
      return false;
    }
    return (
      s === "in transit" ||
      s === "to receive" ||
      s === "shipped" ||
      s === "out for delivery"
    );
  }

  // 4. Delivered = To Review (until customer reviews it!)
  // After customer reviews it, it moves to All!
  if (tabName === "To Review") {
    const reviewed = isOrderReviewed(order, userId);
    if (reviewed) return false;
    return s === "delivered" || s === "to review" || s === "completed";
  }

  if (tabName === "Returns") {
    return (
      s === "returns" ||
      s === "return" ||
      s === "return refund" ||
      s === "returned"
    );
  }

  // 6. All: shows all orders
  if (tabName === "All") {
    return true;
  }

  return s === tabName.toLowerCase();
};

/**
 * Checks if the user has any active/pending orders in:
 * To Pay, To Ship, To Receive, To Review, or Returns.
 * If all orders are completed/reviewed (i.e. only in "All") or there are 0 orders, returns false.
 */
export const hasActiveOrders = (orders, userId) => {
  if (!Array.isArray(orders) || orders.length === 0) return false;
  return orders.some((order) => {
    return (
      isOrderInTab(order, "To Pay", userId) ||
      isOrderInTab(order, "To Ship", userId) ||
      isOrderInTab(order, "To Receive", userId) ||
      isOrderInTab(order, "Returns", userId)
    );
  });
};

/**
 * Safely loads cached customer orders from localStorage.
 */
export const getCachedOrders = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("cached_customer_orders");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

/**
 * Fetches latest orders from the backend API, updates cache and emits sync event.
 */
export const syncCustomerOrders = async (userId) => {
  if (!userId || typeof window === "undefined") return [];
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/orders/user/${encodeURIComponent(userId)}?status=All`
    );
    if (Array.isArray(res.data)) {
      localStorage.setItem("cached_customer_orders", JSON.stringify(res.data));
      window.dispatchEvent(new Event("ordersUpdated"));
      return res.data;
    }
  } catch (err) {
    console.warn("Failed to sync customer orders:", err);
  }
  return getCachedOrders();
};

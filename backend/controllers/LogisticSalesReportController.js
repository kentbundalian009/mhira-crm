import SalesReport from '../models/LogisticSalesReport.js';
import { User } from '../models/AdminUser.js';
import Order from '../models/LogisticOrder.js';
import mongoose from 'mongoose';

// Helper: Calculate Mhira Shoppers Tier
// Bronze Tier: New customer with 0 orders / 0 spend
// Silver Tier: Customers with 1+ orders or >= ₱1,000 spend
// Gold Tier: Customers with 3+ orders or >= ₱5,000 spend
export const calculateMhiraTier = (totalSpent, orderCount = 0) => {
  const spent = Number(totalSpent || 0);
  const count = Number(orderCount || 0);
  if (spent >= 5000 || count >= 3) return "Gold";
  if (count >= 1 || spent >= 1000) return "Silver";
  return "Bronze";
};

export const getMhiraBadgeLabel = (tier) => {
  const t = (tier || "Bronze").toLowerCase();
  if (t === "gold" || t === "loyal" || t === "platinum") return "Gold Tier";
  if (t === "silver") return "Silver Tier";
  return "Bronze Tier";
};

// Map Order fulfillment status to standard Analytics status
export const mapFulfillmentStatus = (status) => {
  const s = String(status || "").toLowerCase().trim();
  if (s === "delivered" || s === "completed") return "Delivered";
  if (s === "in transit" || s === "in-transit" || s === "to receive" || s === "to-receive") return "In Transit";
  if (s === "cancelled" || s === "return refund" || s === "return" || s === "returned") return "Cancelled";
  return "Processing";
};

// Helper: Format primary address for customer quick info
export const formatCustomerAddress = (user, fallbackOrder) => {
  // 1. Check user.addresses
  if (Array.isArray(user?.addresses) && user.addresses.length > 0) {
    const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
    const parts = [
      defaultAddr.streetAddress,
      defaultAddr.barangay ? `Brgy. ${String(defaultAddr.barangay).replace(/^Brgy\.?\s*/i, "")}` : "",
      defaultAddr.city,
      defaultAddr.province || defaultAddr.region,
      defaultAddr.postalCode,
      defaultAddr.country || "Philippines",
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }

  // 2. Check fallbackOrder.shippingAddress
  if (fallbackOrder?.shippingAddress) {
    if (typeof fallbackOrder.shippingAddress === "string" && fallbackOrder.shippingAddress.trim()) {
      return fallbackOrder.shippingAddress.trim();
    }
    if (typeof fallbackOrder.shippingAddress === "object") {
      const parts = [
        fallbackOrder.shippingAddress.streetAddress || fallbackOrder.shippingAddress.street,
        fallbackOrder.shippingAddress.barangay ? `Brgy. ${String(fallbackOrder.shippingAddress.barangay).replace(/^Brgy\.?\s*/i, "")}` : "",
        fallbackOrder.shippingAddress.city,
        fallbackOrder.shippingAddress.province || fallbackOrder.shippingAddress.region,
        fallbackOrder.shippingAddress.postalCode,
        fallbackOrder.shippingAddress.country || "Philippines",
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
  }

  // 3. Check user.shippingAddress
  if (user?.shippingAddress) {
    if (typeof user.shippingAddress === "string" && user.shippingAddress.trim()) {
      return user.shippingAddress.trim();
    }
    if (typeof user.shippingAddress === "object") {
      const parts = [
        user.shippingAddress.street,
        user.shippingAddress.city,
        user.shippingAddress.province,
        user.shippingAddress.postalCode,
        user.shippingAddress.country || "Philippines",
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
  }

  // 4. Check user.billingAddress
  if (user?.billingAddress) {
    if (typeof user.billingAddress === "string" && user.billingAddress.trim()) {
      return user.billingAddress.trim();
    }
    if (typeof user.billingAddress === "object") {
      const parts = [
        user.billingAddress.street,
        user.billingAddress.city,
        user.billingAddress.province,
        user.billingAddress.postalCode,
        user.billingAddress.country || "Philippines",
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
  }

  return "No address on file";
};

// Helper: Extract contact phone number
export const getCustomerPhone = (user, fallbackOrder) => {
  if (user?.phoneNumber && String(user.phoneNumber).trim()) return String(user.phoneNumber).trim();
  if (Array.isArray(user?.addresses) && user.addresses.length > 0) {
    const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
    if (defaultAddr?.phoneNumber && String(defaultAddr.phoneNumber).trim()) {
      return String(defaultAddr.phoneNumber).trim();
    }
  }
  if (fallbackOrder?.shippingAddress && typeof fallbackOrder.shippingAddress === "object" && fallbackOrder.shippingAddress.phoneNumber) {
    return String(fallbackOrder.shippingAddress.phoneNumber).trim();
  }
  return "";
};

export const getSalesReport = async (req, res) => {
  try {
    // 1. Fetch real customer accounts
    const customerUsers = await User.find({ role: { $in: ["Customer", "customer"] } })
      .select("fullName username email phoneNumber gender billingAddress shippingAddress addresses totalSpent tier rewardPoints profileImage customerNo customerCode empNo accountType createdAt updatedAt")
      .lean()
      .catch(() => []);

    // 2. Fetch all real orders from the database
    const allOrders = await Order.find()
      .sort({ createdAt: -1 })
      .lean()
      .catch(() => []);

    // Also fetch any manual sales reports (excluding legacy mock/sample entries)
    const manualSales = await SalesReport.find({
      orderId: { $nin: ["ORD-9081", "ORD-9082", "ORD-9083", "ORD-9084", "ORD-9085", "ORD-9086", "ORD-9087", "ORD-9088"] },
      username: { $nin: ["mariasantos", "juandc", "elenareyes", "marktan99", "sarahg", "beaalonzo"] },
    })
      .sort({ createdAt: -1 })
      .lean()
      .catch(() => []);

    // Build user mapping dictionary for fast matching
    const userMap = new Map();
    customerUsers.forEach((u) => {
      const keys = [
        u._id ? String(u._id).toLowerCase() : null,
        u.username ? u.username.toLowerCase().trim() : null,
        u.email ? u.email.toLowerCase().trim() : null,
        u.customerNo ? u.customerNo.toLowerCase().trim() : null,
        u.customerCode ? u.customerCode.toLowerCase().trim() : null,
        u.empNo ? u.empNo.toLowerCase().trim() : null,
      ].filter(Boolean);
      keys.forEach((k) => userMap.set(k, u));
    });

    // Check if any order belongs to a user not in customerUsers list (e.g. registered under other roles or new ID)
    const distinctUserIds = [...new Set(allOrders.map((o) => String(o.userId || "").trim()).filter(Boolean))];
    const missingIds = distinctUserIds.filter((id) => !userMap.has(id.toLowerCase()));
    if (missingIds.length > 0) {
      const validObjectIds = missingIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      const extraUsers = await User.find({
        $or: [
          ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : []),
          { username: { $in: missingIds } },
          { email: { $in: missingIds } },
        ],
      })
        .select("fullName username email phoneNumber gender billingAddress shippingAddress addresses totalSpent tier rewardPoints profileImage customerNo customerCode empNo accountType createdAt updatedAt")
        .lean()
        .catch(() => []);

      extraUsers.forEach((u) => {
        const keys = [
          u._id ? String(u._id).toLowerCase() : null,
          u.username ? u.username.toLowerCase().trim() : null,
          u.email ? u.email.toLowerCase().trim() : null,
        ].filter(Boolean);
        keys.forEach((k) => userMap.set(k, u));
        if (!customerUsers.some((cu) => String(cu._id) === String(u._id))) {
          customerUsers.push(u);
        }
      });
    }

    // Index non-cancelled orders by customer user key for accurate aggregate metrics
    const userOrdersMap = new Map();
    allOrders.forEach((o) => {
      if (String(o.status || "").toLowerCase() === "cancelled") return;
      const uid = String(o.userId || "").trim().toLowerCase();
      if (uid) {
        if (!userOrdersMap.has(uid)) userOrdersMap.set(uid, []);
        userOrdersMap.get(uid).push(o);
      }
    });

    // 3. Format Real Orders into Sales Transactions list
    const orderSales = allOrders.map((order) => {
      const uid = String(order.userId || "").trim().toLowerCase();
      const matchedUser = userMap.get(uid) || null;

      const customerName =
        matchedUser?.fullName ||
        (order.shippingAddress && typeof order.shippingAddress === "object"
          ? order.shippingAddress.fullName
          : null) ||
        order.customerNotes?.name ||
        "Customer";

      const username = matchedUser?.username || "customer";
      const userTier = matchedUser?.tier || calculateMhiraTier(order.totalAmount || 0, 1);

      const dateStr = order.createdAt
        ? new Date(order.createdAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      const itemsStr =
        Array.isArray(order.items) && order.items.length > 0
          ? order.items
              .map((item) => `${item.name || "Product"} (x${item.quantity || 1})`)
              .join(", ")
          : "Standard Order Items";

      const displayOrderId =
        order.orderNumber ||
        (order._id ? `ORD-${String(order._id).slice(-8).toUpperCase()}` : "ORD-0000");

      const resolvedAddress = formatCustomerAddress(matchedUser, order);
      const resolvedPhone = getCustomerPhone(matchedUser, order);

      return {
        _id: order._id,
        orderId: displayOrderId,
        customer: customerName,
        username,
        userId: order.userId,
        tier: userTier,
        date: dateStr,
        items: itemsStr,
        amount: Number(order.totalAmount || 0),
        status: mapFulfillmentStatus(order.status),
        rawStatus: order.status || "Order Placed",
        voucherCode: order.voucherCode || "",
        voucherDiscount: Number(order.voucherDiscount || 0),
        pointsRedeemed: Number(order.pointsRedeemed || 0),
        shippingFee: Number(order.shippingFee || 0),
        paymentMethod: order.paymentMethod || "Cash on Delivery",
        paymentStatus: order.paymentStatus || "Paid",
        shippingAddress: order.shippingAddress || null,
        address: resolvedAddress,
        phoneNumber: resolvedPhone,
        email: matchedUser?.email || "",
        profileImage: matchedUser?.profileImage || "",
        customerCode: matchedUser?.customerCode || matchedUser?.customerNo || "",
        createdAt: order.createdAt || new Date(),
        updatedAt: order.updatedAt || new Date(),
      };
    });

    // Combine order sales with any manual sales (if existing)
    const combinedSales = [...orderSales];
    manualSales.forEach((ms) => {
      // Avoid duplicate order IDs
      if (!combinedSales.some((s) => s.orderId === ms.orderId || String(s._id) === String(ms._id))) {
        combinedSales.push({
          _id: ms._id,
          orderId: ms.orderId,
          customer: ms.customer,
          username: ms.username || (ms.customer ? ms.customer.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer"),
          userId: ms.userId || "",
          tier: ms.tier || "Bronze",
          date: ms.date || (ms.createdAt ? new Date(ms.createdAt).toISOString().split("T")[0] : ""),
          items: ms.items || "Order Items",
          amount: Number(ms.amount || 0),
          status: ms.status || "Delivered",
          shippingAddress: ms.shippingAddress || null,
          address: ms.address || "No address on file",
          phoneNumber: ms.phoneNumber || "",
          email: ms.email || "",
          createdAt: ms.createdAt || new Date(),
        });
      }
    });

    // Sort transactions by date descending
    combinedSales.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // 4. Build Customer Rankings (Leaderboard) for all registered customer accounts
    const uniqueCustomers = [];
    customerUsers.forEach((u) => {
      const uidKeys = [
        u._id ? String(u._id).toLowerCase() : null,
        u.username ? u.username.toLowerCase().trim() : null,
        u.email ? u.email.toLowerCase().trim() : null,
        u.customerNo ? u.customerNo.toLowerCase().trim() : null,
        u.customerCode ? u.customerCode.toLowerCase().trim() : null,
        u.empNo ? u.empNo.toLowerCase().trim() : null,
      ].filter(Boolean);

      const seenOrderIds = new Set();
      const customerOrders = [];
      uidKeys.forEach((k) => {
        const ords = userOrdersMap.get(k);
        if (ords) {
          ords.forEach((o) => {
            const ordKey = String(o._id || o.createdAt);
            if (!seenOrderIds.has(ordKey)) {
              seenOrderIds.add(ordKey);
              customerOrders.push(o);
            }
          });
        }
      });

      const orderCount = customerOrders.length;
      const orderSpendSum = customerOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const totalSpent = orderCount > 0 ? Math.max(Number(u.totalSpent || 0), orderSpendSum) : Number(u.totalSpent || 0);
      const totalDiscounts = customerOrders.reduce((sum, o) => sum + Number(o.voucherDiscount || 0), 0);
      const discountCount = customerOrders.filter((o) => Number(o.voucherDiscount || 0) > 0).length;

      let lastOrderDate = "";
      customerOrders.forEach((o) => {
        const dStr = o.createdAt ? new Date(o.createdAt).toISOString().split("T")[0] : "";
        if (dStr && (!lastOrderDate || dStr > lastOrderDate)) {
          lastOrderDate = dStr;
        }
      });

      const tier = calculateMhiraTier(totalSpent, orderCount);
      const formattedAddress = formatCustomerAddress(u, customerOrders[0]);
      const phone = getCustomerPhone(u, customerOrders[0]);

      const recentOrders = customerOrders.slice(0, 5).map((o) => ({
        _id: o._id,
        orderId: o.orderNumber || (o._id ? `ORD-${String(o._id).slice(-8).toUpperCase()}` : "ORD-0000"),
        date: o.createdAt ? new Date(o.createdAt).toISOString().split("T")[0] : "",
        amount: Number(o.totalAmount || 0),
        status: mapFulfillmentStatus(o.status),
        items: Array.isArray(o.items) && o.items.length > 0
          ? o.items.map((i) => `${i.name || "Item"} (x${i.quantity || 1})`).join(", ")
          : "Order Items",
      }));

      uniqueCustomers.push({
        _id: u._id,
        name: u.fullName || u.username,
        username: u.username || (u.fullName ? u.fullName.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer"),
        email: u.email || "",
        phoneNumber: phone,
        address: formattedAddress,
        addresses: u.addresses || [],
        shippingAddress: u.shippingAddress || null,
        billingAddress: u.billingAddress || null,
        customerCode: u.customerCode || u.customerNo || u.empNo || "",
        accountType: u.accountType || "Shopper",
        gender: u.gender || "",
        totalSpent,
        orderCount,
        totalDiscounts,
        discountCount,
        rewardPoints: u.rewardPoints != null ? u.rewardPoints : Math.floor(totalSpent / 50),
        tier,
        badgeLabel: getMhiraBadgeLabel(tier),
        profileImage: u.profileImage || "",
        lastOrderDate: lastOrderDate || (orderCount > 0 ? "Recent" : "No orders yet"),
        createdAt: u.createdAt,
        recentOrders,
      });
    });

    // 5. Generate Ranked List
    const customerRankings = uniqueCustomers
      .sort((a, b) => {
        if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
        if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      })
      .map((c, index) => ({
        rank: index + 1,
        _id: c._id,
        name: c.name,
        username: c.username,
        email: c.email,
        phoneNumber: c.phoneNumber,
        address: c.address,
        addresses: c.addresses,
        shippingAddress: c.shippingAddress,
        billingAddress: c.billingAddress,
        customerCode: c.customerCode,
        accountType: c.accountType,
        gender: c.gender,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        totalDiscounts: c.totalDiscounts || 0,
        discountCount: c.discountCount || 0,
        rewardPoints: c.rewardPoints,
        tier: c.tier,
        badgeLabel: c.badgeLabel,
        lastOrderDate: c.lastOrderDate,
        profileImage: c.profileImage,
        createdAt: c.createdAt,
        recentOrders: c.recentOrders || [],
      }));

    // 6. Calculate Aggregated Metrics & Stats
    const totalRevenue = combinedSales
      .filter((s) => s.status !== "Cancelled")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const completedDispatches = combinedSales.filter(
      (item) => (item.status || "").toLowerCase() === "delivered"
    ).length;

    const fulfillmentRate =
      combinedSales.length > 0
        ? ((completedDispatches / combinedSales.length) * 100).toFixed(1)
        : "100";

    return res.status(200).json({
      sales: combinedSales,
      customerRankings,
      stats: {
        totalRevenue,
        completedDispatches,
        fulfillmentRate: `${fulfillmentRate}%`,
        totalCustomers: customerRankings.length,
        topCustomer: customerRankings[0] || null,
      },
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    return res.status(200).json({
      sales: [],
      customerRankings: [],
      stats: {
        totalRevenue: 0,
        completedDispatches: 0,
        fulfillmentRate: "100%",
        totalCustomers: 0,
        topCustomer: null,
      },
    });
  }
};

export const createSalesTransaction = async (req, res) => {
  try {
    const newTransaction = new SalesReport(req.body);
    const saved = await newTransaction.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: 'Error creating sales transaction', error: error.message });
  }
};

export const deleteSalesTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = await SalesReport.findByIdAndDelete(id).catch(() => null);
    if (!deleted && mongoose.Types.ObjectId.isValid(id)) {
      deleted = await Order.findByIdAndDelete(id).catch(() => null);
    }
    res.status(200).json({ message: 'Sales transaction deleted', deleted });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting transaction', error: error.message });
  }
};

// Customer-facing / Public Leaderboard & Hall of Fame endpoint
export const getPublicCustomerLeaderboard = async (req, res) => {
  try {
    const customerUsers = await User.find({ role: { $in: ["Customer", "customer"] } })
      .select("fullName username tier totalSpent rewardPoints profileImage customerNo customerCode createdAt")
      .lean()
      .catch(() => []);

    const realOrders = await Order.find({ status: { $ne: "Cancelled" } })
      .select("userId totalAmount voucherDiscount createdAt")
      .lean()
      .catch(() => []);

    const userOrdersMap = new Map();
    realOrders.forEach((o) => {
      const uid = String(o.userId || "").trim().toLowerCase();
      if (uid) {
        if (!userOrdersMap.has(uid)) userOrdersMap.set(uid, []);
        userOrdersMap.get(uid).push(o);
      }
    });

    const uniqueCustomers = [];

    customerUsers.forEach((u) => {
      const uidKeys = [
        u._id ? String(u._id).toLowerCase() : null,
        u.username ? u.username.toLowerCase().trim() : null,
        u.email ? u.email.toLowerCase().trim() : null,
        u.customerNo ? u.customerNo.toLowerCase().trim() : null,
      ].filter(Boolean);

      const seenOrderIds = new Set();
      const customerOrders = [];
      uidKeys.forEach((k) => {
        const ords = userOrdersMap.get(k);
        if (ords) {
          ords.forEach((o) => {
            const ordKey = String(o._id || o.createdAt);
            if (!seenOrderIds.has(ordKey)) {
              seenOrderIds.add(ordKey);
              customerOrders.push(o);
            }
          });
        }
      });

      const orderCount = customerOrders.length;
      const orderSpendSum = customerOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const totalSpent = orderCount > 0 ? Math.max(Number(u.totalSpent || 0), orderSpendSum) : Number(u.totalSpent || 0);
      const tier = calculateMhiraTier(totalSpent, orderCount);

      uniqueCustomers.push({
        name: u.fullName || u.username,
        username: u.username || (u.fullName ? u.fullName.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer"),
        totalSpent,
        orderCount,
        rewardPoints: u.rewardPoints != null ? u.rewardPoints : Math.floor(totalSpent / 50 || orderCount * 25),
        tier,
        badgeLabel: getMhiraBadgeLabel(tier),
        profileImage: u.profileImage || "",
        createdAt: u.createdAt,
      });
    });

    const rankings = uniqueCustomers
      .sort((a, b) => {
        if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
        if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      })
      .map((c, index) => ({
        rank: index + 1,
        name: c.name,
        username: c.username,
        orderCount: c.orderCount,
        rewardPoints: c.rewardPoints,
        tier: c.tier,
        badgeLabel: c.badgeLabel,
        profileImage: c.profileImage,
      }));

    return res.status(200).json({
      leaderboard: rankings,
      topThree: rankings.slice(0, 3),
      totalRanked: rankings.length,
    });
  } catch (error) {
    console.error("Error fetching public customer leaderboard:", error);
    return res.status(200).json({
      leaderboard: [],
      topThree: [],
      totalRanked: 0,
    });
  }
};

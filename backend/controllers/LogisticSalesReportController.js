import SalesReport from '../models/LogisticSalesReport.js';
import { User } from '../models/AdminUser.js';
import Order from '../models/LogisticOrder.js';

const sampleSalesData = [
  { orderId: "ORD-9081", customer: "Maria Santos", username: "mariasantos", date: "2026-08-07", items: "Gluta Soap (x3), Face Serum (x1)", amount: 1250, status: "Delivered", tier: "Silver" },
  { orderId: "ORD-9082", customer: "Juan Dela Cruz", username: "juandc", date: "2026-08-07", items: "Kojic Papaya Bar (x5)", amount: 750, status: "Delivered", tier: "Bronze" },
  { orderId: "ORD-9083", customer: "Elena Reyes", username: "elenareyes", date: "2026-08-06", items: "Organic Body Lotion (x2)", amount: 980, status: "In Transit", tier: "Bronze" },
  { orderId: "ORD-9084", customer: "Mark Tan", username: "marktan99", date: "2026-08-06", items: "Herbal Shampoo (x2)", amount: 640, status: "Delivered", tier: "Bronze" },
  { orderId: "ORD-9085", customer: "Sarah Geronimo", username: "sarahg", date: "2026-08-05", items: "Glow Set Supreme (x2)", amount: 5400, status: "Delivered", tier: "Gold" },
  { orderId: "ORD-9086", customer: "Kent Bundalian", username: "kentbundalian009", date: "2026-08-05", items: "Face Serum Collagen (x4), Gluta Soap (x2)", amount: 11200, status: "Delivered", tier: "Gold" },
  { orderId: "ORD-9087", customer: "Bea Alonzo", username: "beaalonzo", date: "2026-08-04", items: "Complete Skin Care Package (x3)", amount: 15800, status: "Delivered", tier: "Gold" },
  { orderId: "ORD-9088", customer: "Maria Santos", username: "mariasantos", date: "2026-08-03", items: "Face Serum (x2)", amount: 2400, status: "Delivered", tier: "Silver" },
];

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

export const getSalesReport = async (req, res) => {
  try {
    let sales = await SalesReport.find().sort({ createdAt: -1 }).lean();
    if (!sales || sales.length === 0) {
      sales = await SalesReport.insertMany(sampleSalesData);
      sales = sales.map((s) => (s.toObject ? s.toObject() : s));
    }

    // 1. Fetch ALL registered customer accounts
    const customerUsers = await User.find({ role: { $in: ["Customer", "customer"] } })
      .select("fullName username email totalSpent tier rewardPoints profileImage customerNo customerCode empNo createdAt updatedAt")
      .lean()
      .catch(() => []);

    // 2. Fetch all non-cancelled orders to get real-time order counts & discounts availed
    const realOrders = await Order.find({ status: { $ne: "Cancelled" } })
      .select("userId totalAmount voucherDiscount voucherCode createdAt status")
      .lean()
      .catch(() => []);

    // Build user order map indexed by various user identifiers
    const userOrdersMap = new Map();
    realOrders.forEach((o) => {
      const uid = String(o.userId || "").trim().toLowerCase();
      if (uid) {
        if (!userOrdersMap.has(uid)) userOrdersMap.set(uid, []);
        userOrdersMap.get(uid).push(o);
      }
    });

    const userMapByName = new Map();
    const userMapByUsername = new Map();
    customerUsers.forEach((u) => {
      if (u.fullName) userMapByName.set(u.fullName.toLowerCase().trim(), u);
      if (u.username) userMapByUsername.set(u.username.toLowerCase().trim(), u);
    });

    // Enrich sales entries with username & tier
    const enrichedSales = (sales || []).map((sale) => {
      let username = sale.username;
      let matchedUser = null;

      if (sale.customer) {
        matchedUser = userMapByName.get(sale.customer.toLowerCase().trim());
      }
      if (!matchedUser && username) {
        matchedUser = userMapByUsername.get(username.toLowerCase().trim());
      }

      if (matchedUser) {
        username = matchedUser.username;
      } else if (!username) {
        username = (sale.customer || "customer").toLowerCase().replace(/[^a-z0-9]/g, "");
      }

      let tier = sale.tier;
      if (!tier || tier === "Gold" || tier === "Platinum") {
        tier = matchedUser ? matchedUser.tier : calculateMhiraTier(sale.amount || 0, 1);
      }
      if (tier === "Platinum" || tier === "Loyal") tier = "Gold";

      return {
        ...sale,
        customer: sale.customer || (matchedUser ? matchedUser.fullName : "Customer"),
        username: username || "customer",
        tier: tier || "Bronze",
      };
    });

    // 3. Customer Leaderboard / Rankings aggregation - INCLUDE ALL CUSTOMERS
    const customerMap = new Map();
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

      // Collect orders belonging to this customer
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
      const totalSpent = Math.max(Number(u.totalSpent || 0), orderSpendSum);
      const totalDiscounts = customerOrders.reduce((sum, o) => sum + Number(o.voucherDiscount || 0), 0);
      const discountCount = customerOrders.filter((o) => Number(o.voucherDiscount || 0) > 0).length;

      // Find latest order date
      let lastOrderDate = "";
      customerOrders.forEach((o) => {
        const dStr = o.createdAt ? new Date(o.createdAt).toISOString().split("T")[0] : "";
        if (dStr && (!lastOrderDate || dStr > lastOrderDate)) {
          lastOrderDate = dStr;
        }
      });

      const tier = calculateMhiraTier(totalSpent, orderCount);

      const profileData = {
        name: u.fullName || u.username,
        username: u.username || (u.fullName ? u.fullName.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer"),
        email: u.email || "",
        totalSpent,
        orderCount,
        totalDiscounts,
        discountCount,
        rewardPoints: u.rewardPoints != null ? u.rewardPoints : Math.floor(totalSpent / 50 || orderCount * 25),
        tier,
        badgeLabel: getMhiraBadgeLabel(tier),
        profileImage: u.profileImage || "",
        lastOrderDate: lastOrderDate || (orderCount > 0 ? "Recent" : "No orders yet"),
        createdAt: u.createdAt,
      };

      uniqueCustomers.push(profileData);
      if (u.username) customerMap.set(u.username.toLowerCase().trim(), profileData);
      if (u.fullName) customerMap.set(u.fullName.toLowerCase().trim(), profileData);
    });

    // 4. Also incorporate any sales report entries that belong to unregistered shoppers or guests
    enrichedSales.forEach((s) => {
      const unameKey = (s.username || "").toLowerCase().trim();
      const nameKey = (s.customer || "").toLowerCase().trim();
      let existing = (unameKey && customerMap.get(unameKey)) || (nameKey && customerMap.get(nameKey));

      if (!existing) {
        const spent = Number(s.amount || 0);
        const tier = calculateMhiraTier(spent, 1);
        existing = {
          name: s.customer || s.username || "Customer",
          username: s.username || (s.customer ? s.customer.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer"),
          email: "",
          totalSpent: spent,
          orderCount: 1,
          totalDiscounts: 0,
          discountCount: 0,
          rewardPoints: Math.floor(spent / 50),
          tier,
          badgeLabel: getMhiraBadgeLabel(tier),
          profileImage: "",
          lastOrderDate: s.date || "Recent",
          createdAt: new Date(),
        };
        uniqueCustomers.push(existing);
        if (unameKey) customerMap.set(unameKey, existing);
        if (nameKey) customerMap.set(nameKey, existing);
      }
    });

    // 5. Generate ranked list (DO NOT FILTER OUT 0 ORDERS - ALL ACCOUNTS ARE DISPLAYED!)
    const customerRankings = uniqueCustomers
      .sort((a, b) => {
        if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
        if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      })
      .map((c, index) => ({
        rank: index + 1,
        name: c.name,
        username: c.username,
        email: c.email,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        totalDiscounts: c.totalDiscounts || 0,
        discountCount: c.discountCount || 0,
        rewardPoints: c.rewardPoints,
        tier: c.tier,
        badgeLabel: getMhiraBadgeLabel(c.tier),
        lastOrderDate: c.lastOrderDate,
        profileImage: c.profileImage,
        createdAt: c.createdAt,
      }));

    // Calculate aggregated metrics
    const totalRevenue = enrichedSales.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const completedDispatches = enrichedSales.filter((item) => (item.status || "").toLowerCase() === "delivered").length;
    const fulfillmentRate = enrichedSales.length > 0 ? ((completedDispatches / enrichedSales.length) * 100).toFixed(1) : 100;

    return res.status(200).json({
      sales: enrichedSales,
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
    await SalesReport.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Sales transaction deleted' });
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
      const totalSpent = Math.max(Number(u.totalSpent || 0), orderSpendSum);
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

import SalesReport from '../models/LogisticSalesReport.js';
import { User } from '../models/AdminUser.js';

const sampleSalesData = [
  { orderId: "ORD-9081", customer: "Maria Santos", username: "mariasantos", date: "2026-08-07", items: "Gluta Soap (x3), Face Serum (x1)", amount: 1250, status: "Delivered", tier: "Silver" },
  { orderId: "ORD-9082", customer: "Juan Dela Cruz", username: "juandc", date: "2026-08-07", items: "Kojic Papaya Bar (x5)", amount: 750, status: "Delivered", tier: "Bronze" },
  { orderId: "ORD-9083", customer: "Elena Reyes", username: "elenareyes", date: "2026-08-06", items: "Organic Body Lotion (x2)", amount: 980, status: "In Transit", tier: "Bronze" },
  { orderId: "ORD-9084", customer: "Mark Tan", username: "marktan99", date: "2026-08-06", items: "Herbal Shampoo (x2)", amount: 640, status: "Delivered", tier: "Bronze" },
  { orderId: "ORD-9085", customer: "Sarah Geronimo", username: "sarahg", date: "2026-08-05", items: "Glow Set Supreme (x2)", amount: 5400, status: "Delivered", tier: "Gold" },
  { orderId: "ORD-9086", customer: "Kent Bundalian", username: "kentbundalian009", date: "2026-08-05", items: "Face Serum Collagen (x4), Gluta Soap (x2)", amount: 11200, status: "Delivered", tier: "Platinum" },
  { orderId: "ORD-9087", customer: "Bea Alonzo", username: "beaalonzo", date: "2026-08-04", items: "Complete Skin Care Package (x3)", amount: 15800, status: "Delivered", tier: "Platinum" },
  { orderId: "ORD-9088", customer: "Maria Santos", username: "mariasantos", date: "2026-08-03", items: "Face Serum (x2)", amount: 2400, status: "Delivered", tier: "Silver" },
];

export const getSalesReport = async (req, res) => {
  try {
    let sales = await SalesReport.find().sort({ createdAt: -1 }).lean();
    if (!sales || sales.length === 0) {
      sales = await SalesReport.insertMany(sampleSalesData);
      sales = sales.map((s) => (s.toObject ? s.toObject() : s));
    }

    // Fetch registered customer accounts to map real usernames & tiers
    const customerUsers = await User.find({ role: "Customer" })
      .select("fullName username email totalSpent tier rewardPoints profileImage customerNo")
      .lean()
      .catch(() => []);

    const userMapByName = new Map();
    const userMapByUsername = new Map();
    customerUsers.forEach((u) => {
      if (u.fullName) userMapByName.set(u.fullName.toLowerCase().trim(), u);
      if (u.username) userMapByUsername.set(u.username.toLowerCase().trim(), u);
    });

    const getTier = (total) => {
      const num = Number(total || 0);
      if (num >= 10000) return "Platinum";
      if (num >= 5000) return "Gold";
      if (num >= 1000) return "Silver";
      return "Bronze";
    };

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

      const tier = sale.tier || (matchedUser ? matchedUser.tier : getTier(sale.amount || 0));

      return {
        ...sale,
        customer: sale.customer || (matchedUser ? matchedUser.fullName : "Customer"),
        username: username || "customer",
        tier: tier || "Bronze",
      };
    });

    // Customer Leaderboard / Rankings aggregation
    const customerMap = new Map();

    // 1. Registered customer accounts with activity
    const uniqueCustomers = new Set();
    customerUsers.forEach((u) => {
      const profileData = {
        name: u.fullName || u.username,
        username: u.username || (u.fullName ? u.fullName.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer"),
        totalSpent: Number(u.totalSpent || 0),
        orderCount: 0,
        tier: u.tier || getTier(u.totalSpent || 0),
        profileImage: u.profileImage || "",
        lastOrderDate: u.updatedAt ? new Date(u.updatedAt).toISOString().split("T")[0] : "",
      };
      uniqueCustomers.add(profileData);
      if (u.username) customerMap.set(u.username.toLowerCase().trim(), profileData);
      if (u.fullName) customerMap.set(u.fullName.toLowerCase().trim(), profileData);
    });

    // 2. Aggregate sales report entries
    enrichedSales.forEach((s) => {
      const unameKey = (s.username || "").toLowerCase().trim();
      const nameKey = (s.customer || "").toLowerCase().trim();
      let existing = (unameKey && customerMap.get(unameKey)) || (nameKey && customerMap.get(nameKey));

      if (!existing) {
        existing = {
          name: s.customer || s.username || "Customer",
          username: s.username || (s.customer ? s.customer.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer"),
          totalSpent: 0,
          orderCount: 0,
          tier: "Bronze",
          profileImage: "",
          lastOrderDate: s.date || "",
        };
        uniqueCustomers.add(existing);
        if (unameKey) customerMap.set(unameKey, existing);
        if (nameKey) customerMap.set(nameKey, existing);
      }

      existing.totalSpent += Number(s.amount || 0);
      existing.orderCount += 1;
      if (!existing.lastOrderDate || (s.date && s.date > existing.lastOrderDate)) {
        existing.lastOrderDate = s.date;
      }
      existing.tier = getTier(existing.totalSpent);
    });

    // Generate ranked list
    const customerRankings = Array.from(uniqueCustomers)
      .filter((c) => c.totalSpent > 0 || c.orderCount > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .map((c, index) => {
        const rank = index + 1;
        const badgeLabel = "Mhira Badge";

        return {
          rank,
          name: c.name,
          username: c.username,
          totalSpent: c.totalSpent,
          rewardPoints: c.rewardPoints != null ? c.rewardPoints : Math.floor(c.totalSpent / 50 || c.orderCount * 25),
          orderCount: c.orderCount,
          tier: c.tier,
          badgeLabel,
          lastOrderDate: c.lastOrderDate,
          profileImage: c.profileImage,
        };
      });

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
    let sales = await SalesReport.find().sort({ createdAt: -1 }).lean().catch(() => []);
    if (!sales || sales.length === 0) {
      sales = sampleSalesData;
    }

    const customerUsers = await User.find({ role: { $in: ["Customer", "customer"] } })
      .select("fullName username tier totalSpent rewardPoints profileImage")
      .lean()
      .catch(() => []);

    const getTier = (total) => {
      const num = Number(total || 0);
      if (num >= 10000) return "Platinum";
      if (num >= 5000) return "Gold";
      if (num >= 1000) return "Silver";
      return "Bronze";
    };

    const customerMap = new Map();
    const uniqueCustomers = new Set();

    customerUsers.forEach((u) => {
      const profileData = {
        name: u.fullName || u.username,
        username: u.username || (u.fullName ? u.fullName.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer"),
        totalSpent: Number(u.totalSpent || 0),
        rewardPoints: u.rewardPoints != null ? u.rewardPoints : Math.floor(Number(u.totalSpent || 0) / 50),
        orderCount: 0,
        tier: u.tier || getTier(u.totalSpent || 0),
        profileImage: u.profileImage || "",
      };
      uniqueCustomers.add(profileData);
      if (u.username) customerMap.set(u.username.toLowerCase().trim(), profileData);
      if (u.fullName) customerMap.set(u.fullName.toLowerCase().trim(), profileData);
    });

    sales.forEach((s) => {
      const unameKey = (s.username || "").toLowerCase().trim();
      const nameKey = (s.customer || "").toLowerCase().trim();
      let existing = (unameKey && customerMap.get(unameKey)) || (nameKey && customerMap.get(nameKey));

      if (!existing) {
        existing = {
          name: s.customer || s.username || "Customer",
          username: s.username || (s.customer ? s.customer.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer"),
          totalSpent: 0,
          rewardPoints: 0,
          orderCount: 0,
          tier: "Bronze",
          profileImage: "",
        };
        uniqueCustomers.add(existing);
        if (unameKey) customerMap.set(unameKey, existing);
        if (nameKey) customerMap.set(nameKey, existing);
      }

      existing.totalSpent += Number(s.amount || 0);
      existing.orderCount += 1;
      if (!existing.rewardPoints) {
        existing.rewardPoints = Math.floor(existing.totalSpent / 50);
      }
      existing.tier = getTier(existing.totalSpent);
    });

    const rankings = Array.from(uniqueCustomers)
      .filter((c) => c.totalSpent > 0 || c.orderCount > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .map((c, index) => {
        const badgeLabel = "Mhira Badge";

        return {
          rank: index + 1,
          name: c.name,
          username: c.username,
          orderCount: c.orderCount,
          rewardPoints: c.rewardPoints != null ? c.rewardPoints : Math.floor(c.totalSpent / 50 || c.orderCount * 25),
          tier: c.tier,
          badgeLabel,
          profileImage: c.profileImage,
        };
      });

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

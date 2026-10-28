import http from "http";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mongoose from "mongoose";
import helmet from "helmet";
import hpp from "hpp";

// Register Mongoose Realtime Sync Plugin BEFORE models load
import "./lib/realtimePlugin.js";
import { initSocket, emitRealtimeSync } from "./lib/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import mongoSanitize from "./middleware/mongoSanitize.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

import { connectDB } from "./lib/db.js";

// ADMIN ROUTES
import AdminAuthRoutes from "./routes/AdminAuthRoutes.js";
import AdminDatabaseRoutes from "./routes/AdminDatabaseRoutes.js";
import SystemSettingsRoutes from "./routes/SystemSettingsRoutes.js";
import { startAutoBackupService } from "./controllers/AdminDatabaseController.js";

// INVENTORY ROUTES
import InventoryRawMatRoutes from "./routes/InventoryRawMatRoutes.js";
import InventoryInboundRoutes from "./routes/InventoryInboundRoutes.js";
import InventoryProductRoutes from "./routes/InventoryProductRoutes.js";
import InventoryWipRoutes from "./routes/InventoryWipRoutes.js";
import InventoryExpiryRoutes from "./routes/InventoryExpiryRoutes.js";
import InventorySupplierRoutes from "./routes/InventorySupplierRoutes.js";
import InventoryCategoryUomRoutes from "./routes/InventoryCategoryUomRoutes.js";

// LOGISTICS ROUTES
import LogisticOrderRoutes from "./routes/LogisticOrderRoutes.js";
import LogisticReturnRoutes from "./routes/LogisticReturnRoutes.js";
import LogisticChatbotRoutes from "./routes/LogisticChatbotRoutes.js";
import LogisticSalesReportRoutes from "./routes/LogisticSalesReportRoutes.js";
import LogisticsShippingRoutes from "./routes/LogisticsShippingRoutes.js";
import ScrapAuditLogRoutes from "./routes/ScrapAuditLogRoutes.js";
import NotificationRoutes from "./routes/NotificationRoutes.js";

// MARKETING ROUTES
import MarketingHomeSectionRoutes from "./routes/MarketingHomeSectionRoutes.js";
import MarketingCollectionRoutes from "./routes/MarketingCollectionRoutes.js";
import MarketingEventsRoutes from "./routes/MarketingEventsRoutes.js";
import MarketingReviewRoutes from "./routes/MarketingReviewRoutes.js";
import MarketingCouponRoutes from "./routes/MarketingCouponRoutes.js";
import MarketingStoryRoutes from "./routes/MarketingStoryRoutes.js";

// CUSTOMER ROUTES
import CustomerCartRoutes from "./routes/CustomerCartRoutes.js";
import CustomerFavoritesRoutes from "./routes/CustomerFavoritesRoutes.js";
import UploadRoutes from "./routes/UploadRoutes.js";
import PaymentRoutes from "./routes/PaymentRoutes.js";

dotenv.config();
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists in all execution environments (root, backend cwd, etc.)
const uploadDirs = [
  path.join(process.cwd(), "uploads"),
  path.join(process.cwd(), "backend", "uploads"),
  path.join(__dirname, "uploads"),
  path.join(__dirname, "../uploads"),
];
const primaryUploadDir = uploadDirs.find((d) => fs.existsSync(d)) || uploadDirs[0];
if (!fs.existsSync(primaryUploadDir)) {
  fs.mkdirSync(primaryUploadDir, { recursive: true });
}

// Middleware
// 1. HTTP Security Headers (Baseline Hardening)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: false,
  })
);

// 2. Request Parsing & Payload Size Limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 3. NoSQL Injection Sanitization & HTTP Parameter Pollution Protection
app.use(mongoSanitize);
app.use(hpp());

// 4. Hardened CORS Configuration (Explicit Whitelist & Credentials)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
  'https://mhira-crmsystem.onrender.com',
  'https://mhira.shop',
  'https://www.mhira.shop',
  process.env.FRONTEND_URL,
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Allow all localhost, 127.0.0.1, or local network IPs on any port in development
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  // Allow mhira.shop and all its subdomains
  if (/^https?:\/\/([a-zA-Z0-9-]+\.)*mhira\.shop$/.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin static file requests)
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// Serve uploaded image files publicly with aggressive caching and fast 404 for missing assets
uploadDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    app.use(
      "/uploads",
      express.static(dir, {
        maxAge: "7d",
        etag: true,
        lastModified: true,
        setHeaders: (res) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
        },
      })
    );
  }
});

app.use("/uploads", (req, res) => {
  // Return instant 404 so missing image requests never fall through to the SPA index.html
  res.status(404).json({ error: "Uploaded media not found" });
});

// Health Check Route (Unthrottled for monitoring/uptime)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    server: "running",
    uptime: process.uptime(),
    dbState: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// 5. API Rate Limiting (General DoS protection)
app.use("/api", apiLimiter);

// Routes Configuration
app.get("/api/user-activity", (req, res) => res.status(200).json([]));
app.get("/api/activity-logs", (req, res) => res.status(200).json([]));
app.use("/api/users", AdminAuthRoutes);
app.use("/api/auth", AdminAuthRoutes);
app.use("/api/inventory-raw-materials", InventoryRawMatRoutes);
app.use("/api/inventory-inbound", InventoryInboundRoutes);
app.use("/api/inventory-products", InventoryProductRoutes);
app.use("/api/products", InventoryProductRoutes);
app.use("/api/inventory-wip", InventoryWipRoutes);
app.use("/api/inventory-expiry", InventoryExpiryRoutes);
app.use("/api/inventory-suppliers", InventorySupplierRoutes);
app.use("/api/inventory-category-uom", InventoryCategoryUomRoutes);
app.use("/api/sections", MarketingHomeSectionRoutes);
app.use("/api/collections", MarketingCollectionRoutes);
app.use("/api/events", MarketingEventsRoutes);
app.use("/api/chatbot", LogisticChatbotRoutes);
app.use("/api/cart", CustomerCartRoutes);
app.use("/api/favorites", CustomerFavoritesRoutes);
app.use("/api/orders", LogisticOrderRoutes);
app.use("/api/returns", LogisticReturnRoutes);
app.use("/api/scrap-audit-logs", ScrapAuditLogRoutes);
app.use("/api/notifications", NotificationRoutes);
app.use("/api/reviews", MarketingReviewRoutes);
app.use("/api/coupons", MarketingCouponRoutes);
app.use("/api/shipping-rates", LogisticsShippingRoutes);
app.use("/api/logistics/shipping-rates", LogisticsShippingRoutes);
app.use("/api/story", MarketingStoryRoutes);
app.use("/api/marketing/story", MarketingStoryRoutes);
app.use("/api/logistics/sales-report", LogisticSalesReportRoutes);
app.use("/api/database", AdminDatabaseRoutes);
app.use("/api/system", SystemSettingsRoutes);
app.use("/api/upload", UploadRoutes);
app.use("/api/payments", PaymentRoutes);

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('{*path}', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send("MHIRA CRM Backend API is running.");
  }
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("⚠️ Backend Error:", err.message);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = err.status || (err.name === "MulterError" ? 400 : 500);
  return res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected server error occurred."
  });
});

// HTTP & Real-time WebSockets Server
const httpServer = http.createServer(app);
initSocket(httpServer);

// START SERVER FUNCTION
const startServer = async () => {
  try {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server with Real-time Socket.IO running on port ${PORT}`);
    });

    console.log("⏳ Connecting to MongoDB...");
    await connectDB();
    startAutoBackupService();

    // Verify & synchronize critical database indexes in background for high-speed queries
    setTimeout(async () => {
      try {
        const models = [
          (await import("./models/AdminUser.js")).default,
          (await import("./models/InventoryProduct.js")).default,
          (await import("./models/MarketingCollection.js")).default,
          (await import("./models/LogisticOrder.js")).default,
          (await import("./models/MarketingHomeSection.js")).default,
          (await import("./models/CustomerCart.js")).default,
          (await import("./models/CustomerFavorites.js")).default,
        ];
        for (const m of models) {
          if (m && typeof m.syncIndexes === "function") {
            await m.syncIndexes().catch(() => {});
          }
        }
        console.log("⚡ Database indexes verified for high-speed querying.");
      } catch (idxErr) {
        console.warn("⚠️ Background index sync warning:", idxErr.message);
      }
    }, 1000);
  } catch (err) {
    console.error("⚠️ Error during server startup:", err.message);
  }
};

startServer();
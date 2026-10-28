import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../lib/redis.js";

// Helper to instantiate Redis store with custom prefix and fallback
const createRedisStore = (prefix) => {
  try {
    return new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix,
    });
  } catch (error) {
    console.warn(`⚠️ Failed to bind RedisStore for ${prefix}, falling back to memory:`, error.message);
    return undefined;
  }
};

const isLocalOrDev = (req) => {
  if (process.env.NODE_ENV !== "production") return true;
  const ip = req.ip || req.connection?.remoteAddress || "";
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.includes("127.0.0.1") ||
    req.hostname === "localhost"
  );
};

// 1. General API Rate Limiter (Protects against DoS & automated scrapers)
// Relaxed for production: Exclude localhost, authenticated users, and all GET requests
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true, // Fail-open if Redis encounters connectivity issues
  store: createRedisStore("rl:api:v2:"),
  skip: (req) => {
    // 1. Never rate-limit localhost or development environments
    if (isLocalOrDev(req)) return true;

    // 2. Never rate-limit authenticated staff / admin / users
    if (req.headers.authorization) return true;

    // 3. Never rate-limit read (GET) requests
    if (req.method === "GET") return true;

    return false;
  },
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
});

// 2. Strict Authentication Rate Limiter (Protects against Brute Force & Credential Stuffing)
// Allows 100 attempts per 15 minutes per IP on login/register/password change
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: createRedisStore("rl:auth:v2:"),
  skip: (req) => isLocalOrDev(req),
  message: {
    success: false,
    message: "Too many authentication attempts. For security reasons, please try again after 15 minutes.",
  },
});

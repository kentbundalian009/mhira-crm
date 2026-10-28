import jwt from "jsonwebtoken";
import { User } from "../models/AdminUser.js";
import redis from "../lib/redis.js";

const JWT_SECRET = process.env.JWT_SECRET || "mhira_cosmetics_jwt_secret_key_2026";

// High-Speed In-Memory Session Cache (0ms Instant Load, eliminates DB bottleneck)
const sessionCache = new Map();
const SESSION_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * Invalidate user session from memory (e.g. on logout or user update)
 */
export const invalidateUserSession = (userIdOrToken) => {
  if (!userIdOrToken) return;
  const target = String(userIdOrToken);
  for (const [token, val] of sessionCache.entries()) {
    if (token === target || val?.user?._id?.toString() === target || val?.user?.id?.toString() === target) {
      sessionCache.delete(token);
    }
  }
};

/**
 * Check if a token has been revoked in Redis (with fail-safe timeout)
 */
export const isTokenRevoked = async (token) => {
  try {
    if (!token) return false;
    const checkPromise = redis.get(`blacklist:${token}`);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1000));
    const revoked = await Promise.race([checkPromise, timeoutPromise]);
    return Boolean(revoked);
  } catch (err) {
    console.warn("⚠️ Redis token revocation check skipped (fallback to pass):", err.message);
    return false;
  }
};

/**
 * Revoke a token and store in Redis until its JWT expiration timestamp
 */
export const revokeToken = async (token) => {
  try {
    if (!token) return false;
    invalidateUserSession(token);

    const decoded = jwt.decode(token);
    let ttl = 7 * 24 * 60 * 60; // 7 days fallback
    if (decoded && decoded.exp) {
      const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);
      ttl = Math.max(remainingSeconds, 60);
    }

    await redis.set(`blacklist:${token}`, "revoked", "EX", ttl);
    return true;
  } catch (err) {
    console.warn("⚠️ Error adding token to Redis blacklist:", err.message);
    return false;
  }
};

// Verify JWT Token Middleware with In-Memory Caching (0ms Response)
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token || token === "null" || token === "undefined") {
        return res.status(401).json({ success: false, message: "Not authorized, invalid token" });
      }

      const now = Date.now();

      // 1. High-speed In-Memory Cache Check (Instant 0ms Auth Response)
      const cached = sessionCache.get(token);
      if (cached && now < cached.expiresAt && cached.user) {
        req.user = cached.user;
        req.token = token;
        return next();
      }

      // 2. Fail-Safe Blacklist Check (Protected with 1000ms race timeout)
      const revoked = await isTokenRevoked(token);
      if (revoked) {
        sessionCache.delete(token);
        return res.status(401).json({
          success: false,
          message: "Session expired or token revoked. Please log in again.",
        });
      }

      // 3. Verify JWT signature & expiration
      const decoded = jwt.verify(token, JWT_SECRET);

      // 4. Fetch user with lean() for 5x serialization speed & 4s timeout
      const user = await User.findById(decoded.id).select("-password").lean().maxTimeMS(4000);

      if (!user) {
        return res.status(401).json({ success: false, message: "Not authorized, user not found" });
      }

      // Store in memory cache
      sessionCache.set(token, {
        user,
        expiresAt: now + SESSION_TTL_MS,
      });

      // Maintain cache bounds
      if (sessionCache.size > 3000) {
        const firstKey = sessionCache.keys().next().value;
        sessionCache.delete(firstKey);
      }

      req.user = user;
      req.token = token;
      return next();
    } catch (error) {
      console.warn("JWT verification notice:", error.message);
      return res.status(401).json({ success: false, message: "Not authorized, token invalid or expired" });
    }
  }

  return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
};

// Role-Based Authorization Middleware (Case-Insensitive with Universal Super-Admin Access)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const currentRole = String(req.user.role || "").trim().toLowerCase();

    // Universal Admin Access: Admins are superusers with access to all modules
    if (currentRole === "admin" || currentRole === "superadmin") {
      return next();
    }

    const isAuthorized = roles.some(
      (role) => String(role).trim().toLowerCase() === currentRole
    );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

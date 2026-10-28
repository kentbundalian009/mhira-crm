import crypto from "crypto";
import redis from "./redis.js";

// In-memory fallback cache in case Redis is momentarily slow, rate-limited, or reconnecting
const localOtpStore = new Map();
const localPermStore = new Map();

/**
 * Clean up expired memory items periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of localOtpStore.entries()) {
    if (value.expiresAt <= now) localOtpStore.delete(key);
  }
  for (const [key, expiresAt] of localPermStore.entries()) {
    if (expiresAt <= now) localPermStore.delete(key);
  }
}, 60000);

/**
 * Generate a cryptographically secure numeric OTP of specified length (default 6 digits)
 */
export const generateOTP = (length = 6) => {
  const digits = "0123456789";
  let otp = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  return otp;
};

/**
 * Store an OTP in Redis and local memory with an expiration time in seconds (default 900s = 15 minutes)
 */
export const storeOTP = async (key, code, ttlSeconds = 900) => {
  const normalizedKey = String(key).trim().toLowerCase();
  const cleanCode = String(code).trim();
  const expiresAt = Date.now() + ttlSeconds * 1000;

  // 1. Always store in high-speed memory fallback
  localOtpStore.set(normalizedKey, { code: cleanCode, expiresAt });

  // 2. Persist to Redis
  try {
    if (redis) {
      await redis.set(`otp:${normalizedKey}`, cleanCode, "EX", ttlSeconds);
    }
    return true;
  } catch (error) {
    console.warn("⚠️ Redis storeOTP notice (local memory active):", error.message);
    return true;
  }
};

/**
 * Verify an input OTP against Redis or memory fallback.
 * If valid and deleteOnVerify is true, removes OTP to prevent replay attacks.
 */
export const verifyOTP = async (key, inputCode, deleteOnVerify = true) => {
  const normalizedKey = String(key).trim().toLowerCase();
  const cleanInput = String(inputCode || "").trim();

  let storedCode = null;

  // 1. Try Redis lookup
  try {
    if (redis) {
      storedCode = await redis.get(`otp:${normalizedKey}`);
    }
  } catch (error) {
    console.warn("⚠️ Redis get OTP notice (checking memory):", error.message);
  }

  // 2. Fallback to memory store if Redis returned null or errored
  if (!storedCode && localOtpStore.has(normalizedKey)) {
    const record = localOtpStore.get(normalizedKey);
    if (record && record.expiresAt > Date.now()) {
      storedCode = record.code;
    } else {
      localOtpStore.delete(normalizedKey);
    }
  }

  if (!storedCode) {
    return { valid: false, message: "Verification code expired or not found. Please request a new one." };
  }

  if (String(storedCode).trim() !== cleanInput) {
    return { valid: false, message: "Invalid verification code. Please check and try again." };
  }

  // Single-use: Consume and remove OTP
  if (deleteOnVerify) {
    localOtpStore.delete(normalizedKey);
    try {
      if (redis) {
        await redis.del(`otp:${normalizedKey}`);
      }
    } catch (e) {}
  }

  return { valid: true };
};

/**
 * Grant a temporary password reset permission token for an email address (valid 10 minutes)
 */
export const grantResetPermission = async (email, ttlSeconds = 600) => {
  const cleanEmail = String(email).trim().toLowerCase();
  localPermStore.set(cleanEmail, Date.now() + ttlSeconds * 1000);
  try {
    if (redis) {
      await redis.set(`reset_perm:${cleanEmail}`, "1", "EX", ttlSeconds);
    }
    return true;
  } catch (e) {
    return true;
  }
};

/**
 * Check and consume the temporary reset permission token
 */
export const consumeResetPermission = async (email) => {
  const cleanEmail = String(email).trim().toLowerCase();
  let hasPerm = false;

  try {
    if (redis) {
      const redisVal = await redis.get(`reset_perm:${cleanEmail}`);
      if (redisVal === "1") {
        hasPerm = true;
        await redis.del(`reset_perm:${cleanEmail}`);
      }
    }
  } catch (e) {}

  if (!hasPerm && localPermStore.has(cleanEmail)) {
    const expiresAt = localPermStore.get(cleanEmail);
    if (expiresAt > Date.now()) {
      hasPerm = true;
    }
    localPermStore.delete(cleanEmail);
  }

  return hasPerm;
};

export default {
  generateOTP,
  storeOTP,
  verifyOTP,
  grantResetPermission,
  consumeResetPermission,
};

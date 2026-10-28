import Redis from "ioredis";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const REDIS_URL =
  process.env.REDIS_URI ||
  process.env.UPSTASH_REDIS_URL ||
  "rediss://default:gQAAAAAAAdC7AAIgcDFiYTk2YWY1MjA0NTk0ZmY4ODIwNmNhNDg2YTk2NGM2NQ@patient-piglet-118971.upstash.io:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  commandTimeout: 3000,
  enableReadyCheck: false,
  lazyConnect: false,
  retryStrategy: (times) => {
    if (times > 3) return null; // Stop retrying after 3 failed attempts to prevent infinite loop
    return Math.min(times * 500, 2000);
  },
});

redis.on("connect", () => {
  console.log("✅ Upstash Redis Connected");
});

redis.on("error", (err) => {
  console.warn("⚠️ Redis Connection Notice (Fallback Active):", err.message);
});

// Non-blocking self-test during startup (does not stall server boot)
setTimeout(async () => {
  try {
    await redis.set("mhira:ping", "pong", "EX", 10);
  } catch (e) {
    console.warn("⚠️ Redis initial test ping skipped (running with memory fallback):", e.message);
  }
}, 500);

export const client = redis;
export default redis;

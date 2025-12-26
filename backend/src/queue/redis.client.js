import Redis from "ioredis";

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL) // ✅ Upstash / Cloud
  : new Redis({
      host: process.env.REDIS_HOST || "localhost", // ✅ Local
      port: Number(process.env.REDIS_PORT) || 6379,
      db: 0,
    });

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("ready", () => {
  console.log("🚀 Redis ready");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

export { redis };

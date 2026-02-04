import Redis from "ioredis"

const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379
})

redis.on("connect", () => {
  console.log("🟢 MCP Redis connected")
})

redis.on("error", (err) => {
  console.error("🔴 MCP Redis error:", err)
})

export { redis }

import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

redis.on("connect", async () => {
  console.log("✅ Connected to Redis");

  // Test write
  await redis.xadd(
    "chat_stream",
    "*",
    "conversationId", "local-test",
    "userId", "1",
    "prompt", "Hello Redis without Docker"
  );

  console.log("✅ XADD successful");

  process.exit(0);
});

redis.on("error", (err) => {
  console.error("❌ Redis connection failed");
  console.error(err.message);
  process.exit(1);
});

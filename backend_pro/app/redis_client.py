import os
import redis

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "dhanada-redis-cache"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)
import json
import redis
import os
import time
import sys

# Fix Python path so worker can see /app folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from langchain_core.messages import HumanMessage, AIMessage
from app.schemas.state import InvoiceState
from app.graph.graph import invoice_graph


# ------------------------------------------------
# Redis Connection
# ------------------------------------------------

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "dhanada-redis-cache"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)

print("🚀 LangGraph Worker Started")
print("Waiting for jobs...\n")


# ------------------------------------------------
# Worker Loop
# ------------------------------------------------

while True:

    try:

        # Wait for job
        job = redis_client.blpop("chat:queue", timeout=0)

        if not job:
            continue

        data = json.loads(job[1])

        conversation_id = data["conversationId"]
        prompt = data["prompt"]
        user_id = data["userId"]

        print(" New Job:", conversation_id)

        # ------------------------------------------------
        # Create LangGraph State
        # ------------------------------------------------

        state = InvoiceState(
            session_id=conversation_id,
            user_id=user_id
        )

        state.messages = [
            HumanMessage(content=prompt)
        ]

        # ------------------------------------------------
        # Run LangGraph
        # ------------------------------------------------

        result = invoice_graph.invoke(
            state,
            {"recursion_limit": 25}
        )

        reply = ""

        for msg in reversed(result.messages):
            if isinstance(msg, AIMessage):
                reply = msg.content
                break

        print(" Reply:", reply)

        # ------------------------------------------------
        # Stream Response via Redis
        # ------------------------------------------------

        channel = f"chat:stream:{conversation_id}"

        for word in reply.split():
            redis_client.publish(channel, word + " ")
            time.sleep(0.02)

        redis_client.publish(channel, "[DONE]")


    except Exception as e:
        print(" Worker Error:", str(e))
        time.sleep(2)
import json
import asyncio
import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.dependencies import authenticate_token
from app.redis_client import redis_client
from app.db.database import get_db

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversationId: str | None = None


# ---------------------------
# SEND MESSAGE
# ---------------------------
@router.post("/send")
def send_message(data: ChatRequest, user=Depends(authenticate_token)):

    conversation_id = data.conversationId or str(uuid.uuid4())

    job = {
        "conversationId": conversation_id,
        "prompt": data.message,
        "userId": user["id"]
    }

    redis_client.lpush("chat:queue", json.dumps(job))

    return {
        "status": "queued",
        "conversationId": conversation_id
    }


# ---------------------------
# STREAM RESPONSE
# ---------------------------
@router.get("/stream/{conversation_id}")
async def stream_chat(conversation_id: str):

    pubsub = redis_client.pubsub()
    channel = f"chat:stream:{conversation_id}"

    pubsub.subscribe(channel)

    async def event_stream():

        while True:

            message = pubsub.get_message(ignore_subscribe_messages=True)

            if message:

                data = message["data"]

                if isinstance(data, bytes):
                    data = data.decode()

                yield f"data: {data}\n\n"

                try:
                    parsed = json.loads(data)
                    if parsed.get("done"):
                        break
                except:
                    pass

            await asyncio.sleep(0.05)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream"
    )


# ---------------------------
# GET USER CONVERSATIONS
# ---------------------------
@router.get("/conversations")
def get_conversations(user=Depends(authenticate_token)):

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    SELECT
        c.id,
        c.created_at,
        (
            SELECT content
            FROM messages
            WHERE conversation_id = c.id
            AND role='user'
            ORDER BY created_at ASC
            LIMIT 1
        ) as first_message
    FROM conversations c
    WHERE c.user_id = %s
    ORDER BY c.created_at DESC
    """, (user["id"],))

    rows = cur.fetchall()

    conversations = []

    for row in rows:

        conversations.append({
            "id": row[0],
            "title": row[2][:60] if row[2] else "New Chat",
            "first_message": row[2],
            "created_at": row[1]
        })

    cur.close()
    conn.close()

    return conversations


# ---------------------------
# GET CONVERSATION MESSAGES
# ---------------------------
@router.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: str, user=Depends(authenticate_token)):

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT role, content
        FROM messages
        WHERE conversation_id = %s
        ORDER BY id ASC
    """, (conversation_id,))

    rows = cur.fetchall()

    messages = []

    for row in rows:

        messages.append({
            "role": row[0],
            "content": row[1]
        })

    cur.close()
    conn.close()

    return messages


# ---------------------------
# DELETE CONVERSATION
# ---------------------------
@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, user=Depends(authenticate_token)):

    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM messages WHERE conversation_id = %s",
        (conversation_id,)
    )

    cur.execute(
        "DELETE FROM conversations WHERE id = %s",
        (conversation_id,)
    )

    conn.commit()

    cur.close()
    conn.close()

    return {
        "deleted": conversation_id
    }


# ---------------------------
# HEALTH
# ---------------------------
@router.get("/health")
def health():
    return {
        "status": "chat service running"
    }
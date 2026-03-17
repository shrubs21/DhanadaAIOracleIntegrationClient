import time
import json
from redis_client import redis_client


def stream_response(conversation_id, text):

    stream_key = f"stream:{conversation_id}"

    words = text.split(" ")

    for i, word in enumerate(words):

        redis_client.rpush(
            stream_key,
            json.dumps({
                "token": word + " ",
                "done": False
            })
        )

        time.sleep(0.02)

    redis_client.rpush(
        stream_key,
        json.dumps({
            "done": True
        })
    )

    redis_client.expire(stream_key, 120)
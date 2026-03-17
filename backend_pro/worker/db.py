import psycopg2
import os

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)


def store_messages(conversation_id, user_prompt, assistant_reply, user_id):

    cur = conn.cursor()

    # create conversation if not exists
    cur.execute(
        """
        INSERT INTO conversations (id, user_id, title)
        VALUES (%s,%s,%s)
        ON CONFLICT (id) DO NOTHING
        """,
        (
            conversation_id,
            user_id,
            user_prompt[:60]
        )
    )

    # user message
    cur.execute(
        """
        INSERT INTO messages (conversation_id, role, content)
        VALUES (%s,'user',%s)
        """,
        (conversation_id, user_prompt)
    )

    # assistant message
    cur.execute(
        """
        INSERT INTO messages (conversation_id, role, content)
        VALUES (%s,'assistant',%s)
        """,
        (conversation_id, assistant_reply)
    )

    conn.commit()
    cur.close()
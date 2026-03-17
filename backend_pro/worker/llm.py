import requests
import os

OPENAI_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENAI_URL = "https://api.openai.com/v1/chat/completions"


def call_llm(prompt, history=None):

    if not OPENAI_API_KEY:
        print("API KEY missing")
        return "AI service configuration error."

    messages = [
        {"role": "system", "content": "You are an intelligent AI assistant."}
    ]

    if history:
        messages.extend(history)

    messages.append({
        "role": "user",
        "content": prompt
    })

    try:

        res = requests.post(
            OPENAI_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": messages,
                "temperature": 0.2
            },
            timeout=60
        )

        if res.status_code != 200:
            print("OpenAI error:", res.text)
            return "⚠️ AI service unavailable."

        data = res.json()

        return data["choices"][0]["message"]["content"]

    except Exception as e:
        print("LLM ERROR:", e)
        return "AI service unavailable."
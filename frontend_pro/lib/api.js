// 🔥 Backend API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function sendChatMessage(message, conversationId) {
  const token = localStorage.getItem("authToken")

  if (!token) {
    throw new Error("Authentication token missing")
  }

  const res = await fetch(`${API_URL}/api/chat/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      message,              // ✅ FIXED (was `prompt`)
      conversationId        // optional, backend handles null
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || "Failed to send message")
  }

  return res.json()
}

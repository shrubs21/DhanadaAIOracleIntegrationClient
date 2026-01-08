// 🔥 Backend API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL 

export async function sendChatMessage(prompt, conversationId) {
  const token = localStorage.getItem("token")

  const res = await fetch(`${API_URL}/api/chat/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      prompt,
      conversationId
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || "Failed to send message")
  }

  return res.json()
}
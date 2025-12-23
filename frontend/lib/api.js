export async function sendChatMessage(prompt, conversationId) {
  const token = localStorage.getItem("token")

  const res = await fetch("http://localhost:4000/api/chat/send", {
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

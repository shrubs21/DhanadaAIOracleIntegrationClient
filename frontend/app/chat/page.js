'use client'
import { useState } from 'react'

export default function Page() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isConnected, setIsConnected] = useState(false) // Placeholder state

  const send = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input
    setMessages((m) => [...m, { role: 'user', text: userMessage }])
    setInput('')

    if (!isConnected) {
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: 'Sorry, AI agent is not connected. Please check your connection and try again.',
          },
        ])
      }, 500)
      return
    }

    // Typing animation
    setIsTyping(true)

    // Simulated API call
    setTimeout(() => {
      setIsTyping(false)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'This is where the response from your AI agent will appear.',
        },
      ])
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pt-28">
      {/* Header */}
      <div className="border-b border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">AI Chat Assistant</h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <button className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition">
              New Chat
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Start a conversation...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${
                      m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                          : 'bg-gradient-to-br from-zinc-700 to-zinc-800'
                      }`}
                    >
                      <span className="text-xs">
                        {m.role === 'user' ? 'U' : 'AI'}
                      </span>
                    </div>

                    {/* Message */}
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-purple-600 to-blue-600'
                          : 'bg-zinc-800/50 border border-zinc-700'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
             {isTyping && (
  <div className="flex justify-center my-20 overflow-visible">
    <div className="relative flex items-center justify-center">
      
      {/* center glow */}
      <div className="siri-core"></div>

      {/* rings */}
      <div 
        className="siri-ring" 
        style={{ width: 150, height: 150 }}
      ></div>

      <div 
        className="siri-ring" 
        style={{ width: 230, height: 230, animationDelay: "0.5s" }}
      ></div>

      <div 
        className="siri-ring" 
        style={{ width: 330, height: 330, animationDelay: "1s" }}
      ></div>

    </div>
  </div>
)}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 bg-black/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <form onSubmit={send} className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-purple-500 transition placeholder:text-gray-500"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!input.trim()}
            >
              Send
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-2">
            AI can make mistakes. Check important information.
          </p>
        </div>
      </div>
    </div>
  )
}

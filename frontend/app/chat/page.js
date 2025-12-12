'use client'
import { useState, useRef, useEffect } from 'react'

export default function Page() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [lastSender, setLastSender] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    // Only scroll when assistant is typing or sent the last message
    if (isTyping || lastSender === 'assistant') {
      scrollToBottom()
    }
  }, [messages, isTyping, lastSender])

  const send = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input
    setMessages((m) => [...m, { role: 'user', text: userMessage }])
    setInput('')
    setLastSender('user') // Mark user as last sender - no scroll

    if (!isConnected) {
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: 'Sorry, AI agent is not connected. Please check your connection and try again.',
          },
        ])
        setLastSender('assistant') // Mark assistant as last sender - will scroll
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
          text: 'This is where the response from your AI agent will appear. I can help you with Oracle HCM, SCM, ERP, and Financials queries.',
        },
      ])
      setLastSender('assistant') // Mark assistant as last sender - will scroll
    }, 3000)
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900 flex flex-col">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div 
          className="absolute top-20 right-20 w-[400px] h-[400px] rounded-full blur-[120px] animate-pulse-slow opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(139, 92, 246, 0.15) 50%, transparent 100%)'
          }}
        />
        <div 
          className="absolute bottom-20 left-20 w-[400px] h-[400px] rounded-full blur-[120px] animate-pulse-slow opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 100%)',
            animationDelay: '2s'
          }}
        />
      </div>

      {/* Header with Glass Effect */}
      <div 
        className="border-b sticky top-0 z-10"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderColor: 'rgba(0, 0, 0, 0.1)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)',
                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                }}
              >
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">AI Oracle Assistant</h1>
                <p className="text-xs text-gray-600">Your intelligent Oracle companion</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div 
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{
                    boxShadow: isConnected 
                      ? '0 0 8px rgba(34, 197, 94, 0.6)' 
                      : '0 0 8px rgba(239, 68, 68, 0.6)'
                  }}
                />
                <span className="text-xs font-medium text-gray-700">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* New Chat Button */}
              <button 
                onClick={clearChat}
                className="px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  color: '#6b7280'
                }}
              >
                New Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              {/* Welcome Card */}
              <div 
                className="p-8 rounded-3xl mb-6 max-w-md"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(30px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6) inset'
                }}
              >
                <div className="text-5xl mb-4">👋</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
                <p className="text-gray-600 leading-relaxed">
                  I'm your AI Oracle Assistant. Ask me anything about HCM, SCM, ERP, or Financials.
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {[
                  'Show employee attrition trends',
                  'Analyze supplier performance',
                  'Generate financial reports',
                  'Check inventory levels'
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-4 rounded-2xl text-left transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <span className="text-sm font-medium text-gray-700">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[85%] ${
                      m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm`}
                      style={{
                        background: m.role === 'user'
                          ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)'
                          : 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(20px)',
                        border: m.role === 'assistant' ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
                        boxShadow: m.role === 'user' 
                          ? '0 4px 12px rgba(168, 85, 247, 0.3)' 
                          : '0 2px 8px rgba(0, 0, 0, 0.04)',
                        color: m.role === 'user' ? 'white' : '#6b7280'
                      }}
                    >
                      {m.role === 'user' ? 'You' : 'AI'}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`rounded-3xl px-5 py-4 ${
                        m.role === 'user' ? '' : ''
                      }`}
                      style={{
                        background: m.role === 'user'
                          ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)'
                          : 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        border: m.role === 'assistant' ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
                        boxShadow: m.role === 'user'
                          ? '0 4px 16px rgba(168, 85, 247, 0.25)'
                          : '0 4px 16px rgba(0, 0, 0, 0.06)',
                        color: m.role === 'user' ? 'white' : '#374151'
                      }}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Advanced AI Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    {/* AI Avatar */}
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        color: '#6b7280'
                      }}
                    >
                      AI
                    </div>

                    {/* Typing Animation Container */}
                    <div className="flex items-center">
                      <div className="relative flex items-center justify-center py-8 px-12">
                        {/* Center glow core - pulsing */}
                        <div 
                          className="absolute w-16 h-16 rounded-full"
                          style={{
                            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.8) 0%, rgba(59, 130, 246, 0.4) 50%, transparent 100%)',
                            animation: 'pulse-core 2s ease-in-out infinite'
                          }}
                        />

                        {/* Animated rings */}
                        <div 
                          className="absolute rounded-full border-2"
                          style={{
                            width: '100px',
                            height: '100px',
                            borderColor: 'rgba(168, 85, 247, 0.3)',
                            animation: 'expand-ring 2s ease-out infinite'
                          }}
                        />

                        <div 
                          className="absolute rounded-full border-2"
                          style={{
                            width: '100px',
                            height: '100px',
                            borderColor: 'rgba(59, 130, 246, 0.3)',
                            animation: 'expand-ring 2s ease-out infinite 0.6s'
                          }}
                        />

                        <div 
                          className="absolute rounded-full border-2"
                          style={{
                            width: '100px',
                            height: '100px',
                            borderColor: 'rgba(236, 72, 153, 0.3)',
                            animation: 'expand-ring 2s ease-out infinite 1.2s'
                          }}
                        />

                        {/* Rotating particles */}
                        <div className="absolute w-32 h-32" style={{ animation: 'rotate-particles 4s linear infinite' }}>
                          <div 
                            className="absolute w-2 h-2 rounded-full top-0 left-1/2 -translate-x-1/2"
                            style={{ background: 'rgba(168, 85, 247, 0.6)' }}
                          />
                          <div 
                            className="absolute w-2 h-2 rounded-full bottom-0 left-1/2 -translate-x-1/2"
                            style={{ background: 'rgba(59, 130, 246, 0.6)' }}
                          />
                          <div 
                            className="absolute w-2 h-2 rounded-full left-0 top-1/2 -translate-y-1/2"
                            style={{ background: 'rgba(236, 72, 153, 0.6)' }}
                          />
                          <div 
                            className="absolute w-2 h-2 rounded-full right-0 top-1/2 -translate-y-1/2"
                            style={{ background: 'rgba(14, 165, 233, 0.6)' }}
                          />
                        </div>

                        {/* Center dots */}
                        <div className="relative flex gap-1.5 z-10">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: 'rgba(168, 85, 247, 0.8)',
                              animation: 'bounce-dot 1.4s ease-in-out infinite'
                            }}
                          />
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: 'rgba(59, 130, 246, 0.8)',
                              animation: 'bounce-dot 1.4s ease-in-out infinite 0.2s'
                            }}
                          />
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: 'rgba(236, 72, 153, 0.8)',
                              animation: 'bounce-dot 1.4s ease-in-out infinite 0.4s'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area with Glass Effect */}
      <div 
        className="border-t sticky bottom-0"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderColor: 'rgba(0, 0, 0, 0.1)',
          boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4">
          <form onSubmit={send} className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-5 py-3.5 rounded-2xl focus:outline-none transition-all text-gray-900 placeholder:text-gray-500"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
              }}
              placeholder="Ask me anything about Oracle..."
            />
            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!input.trim()}
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
                boxShadow: '0 4px 16px rgba(168, 85, 247, 0.3)'
              }}
            >
              Send
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-3 font-medium">
            AI can make mistakes. Check important information.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { 
            opacity: 0.15; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.25; 
            transform: scale(1.05); 
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }

        @keyframes pulse-core {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes expand-ring {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes rotate-particles {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce-dot {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.8;
          }
          40% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
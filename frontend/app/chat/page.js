'use client'
import { useState, useRef, useEffect } from 'react'

export default function Page() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  // Voice feature states
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  
  // Account dropdown state
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Set to true to show dropdown, false to hide
  
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const accountMenuRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (mounted) {
      scrollToBottom()
    }
  }, [messages, isTyping, mounted])

  // Voice recognition setup - browser only, no SSR
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setVoiceSupported(true)
      
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput((prev) => prev ? prev + ' ' + transcript : transcript)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [mounted])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!mounted) return

    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mounted])

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleLogout = () => {
    // Add your logout logic here
    alert('Logout clicked - add your logout logic here')
    setIsAuthenticated(false)
    setShowAccountMenu(false)
  }

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

    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'This is where the response from your AI agent will appear. I can help you with Oracle HCM, SCM, ERP, and Financials queries.',
        },
      ])
    }, 2000)
  }

  const clearChat = () => {
    setMessages([])
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="h-screen bg-white text-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 z-10 bg-white flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)',
                }}
              >
                <span className="text-white font-bold text-[10px]">Oracle</span>
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Oracle AI Assistant</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs font-medium text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* New Chat Button */}
              <button 
                onClick={clearChat}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors text-gray-700"
              >
                New Chat
              </button>

              {/* Account Dropdown - Only shows when authenticated */}
              {isAuthenticated && (
                <div className="relative" ref={accountMenuRef}>
                  <button
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">JD</span>
                    </div>
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none"
                      className={`text-gray-600 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`}
                    >
                      <path 
                        d="M6 9l6 6 6-6" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showAccountMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                            <span className="text-white font-semibold">JD</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">John Doe</p>
                            <p className="text-xs text-gray-500">john.doe@example.com</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            alert('Navigate to /profile')
                            setShowAccountMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          My Profile
                        </button>

                        <button
                          onClick={() => {
                            alert('Navigate to /settings')
                            setShowAccountMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Settings
                        </button>

                        <button
                          onClick={() => {
                            alert('Navigate to /billing')
                            setShowAccountMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 10h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Billing
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-4 h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              {/* Welcome Section */}
              <div className="mb-8">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)',
                  }}
                >
                  <span className="text-white font-bold text-sm">Oracle</span>
                </div>
                <h2 className="text-3xl font-semibold text-gray-900 mb-3">How can I help you today?</h2>
                <p className="text-gray-600 text-base">
                  Ask me anything about Oracle HCM, SCM, ERP, or Financials
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {[
                  { icon: '📊', text: 'Show employee attrition trends' },
                  { icon: '🔗', text: 'Analyze supplier performance' },
                  { icon: '📈', text: 'Generate financial reports' },
                  { icon: '📦', text: 'Check inventory levels' }
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion.text)}
                    className="p-4 rounded-xl text-left transition-all hover:bg-gray-50 border border-gray-200 hover:border-gray-300 group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{suggestion.icon}</span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{suggestion.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-4 mb-8 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                      style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)',
                      }}
                    >
                      <span className="text-white font-bold text-[8px]">Oracle</span>
                    </div>
                  )}

                  <div className={`max-w-[70%] ${m.role === 'user' ? 'bg-gray-100 rounded-3xl px-5 py-3' : ''}`}>
                    <p className="text-[15px] leading-7 text-gray-800 whitespace-pre-wrap">
                      {m.text}
                    </p>
                  </div>

                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white font-medium text-xs">You</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Professional Typing Indicator */}
              {isTyping && (
                <div className="flex gap-4 mb-8">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)',
                    }}
                  >
                    <span className="text-white font-bold text-[8px]">Oracle</span>
                  </div>

                  <div className="flex items-center gap-1 py-3">
                    <div 
                      className="w-2 h-2 rounded-full bg-gray-400"
                      style={{ animation: 'bounce 1.4s ease-in-out infinite' }}
                    />
                    <div 
                      className="w-2 h-2 rounded-full bg-gray-400"
                      style={{ animation: 'bounce 1.4s ease-in-out 0.2s infinite' }}
                    />
                    <div 
                      className="w-2 h-2 rounded-full bg-gray-400"
                      style={{ animation: 'bounce 1.4s ease-in-out 0.4s infinite' }}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t border-gray-200 bg-white flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4 pb-6">
          <form onSubmit={send} className="relative">
            <div className="relative flex items-center bg-white border border-gray-300 rounded-3xl shadow-sm hover:shadow-md transition-shadow focus-within:shadow-md focus-within:border-gray-400">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-5 py-3.5 bg-transparent rounded-3xl focus:outline-none text-gray-900 placeholder:text-gray-400"
                placeholder="Message Oracle AI Assistant..."
              />
              
              {/* Voice Input Button - Only shown if supported */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`mr-2 p-2 rounded-full transition-all ${
                    isListening 
                      ? 'bg-red-100 hover:bg-red-200' 
                      : 'hover:bg-gray-100'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    className={isListening ? 'text-red-500' : 'text-gray-600'}
                  >
                    <path 
                      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" 
                      fill="currentColor"
                    />
                    <path 
                      d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}

              <button
                type="submit"
                className="mr-2 p-2 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
                disabled={!input.trim()}
                style={{
                  background: input.trim() ? 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)' : 'transparent',
                }}
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className={input.trim() ? 'text-white' : 'text-gray-400'}
                >
                  <path 
                    d="M7 11L12 6L17 11M12 18V7" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </form>

          <p className="text-xs text-gray-500 text-center mt-3">
            Oracle AI can make mistakes. Check important information.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  )
}
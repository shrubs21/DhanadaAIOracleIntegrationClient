'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.replace("/login")
    }
  }, [router])

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const accountMenuRef = useRef(null)

  // ✅ CHECK BACKEND CONNECTION WITH TOKEN
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (!token) {
          setIsConnected(false)
          return
        }

        const response = await fetch('http://localhost:4000/api/chat/health', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          setIsConnected(true)
          toast.success('Backend connected!')
        } else {
          setIsConnected(false)
          toast.error('Unable to connect to backend')
        }
      } catch (error) {
        console.error('Backend connection failed:', error)
        setIsConnected(false)
        toast.error('Unable to connect to backend')
      }
    }

    if (mounted) {
      checkConnection()
    }
  }, [mounted])

  // Fetch user from /me endpoint
  useEffect(() => {
    const token = localStorage.getItem("token")

    if (!token) {
      setLoading(false)
      return
    }

    fetch("http://localhost:4000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        setUser(data)
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem("token")
        setUser(null)
        setLoading(false)
      })
  }, [])

  // Load conversation ID from localStorage
  useEffect(() => {
    const savedConversationId = localStorage.getItem('currentConversationId')
    if (savedConversationId) {
      setConversationId(savedConversationId)
    }
  }, [])

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

  // Voice recognition setup
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
    localStorage.removeItem("token")
    localStorage.removeItem("currentConversationId")
    setUser(null)
    setShowAccountMenu(false)
    toast.success("Logged out successfully")
    router.replace("/login")
  }

  // ✅ CREATE CONVERSATION FUNCTION
  async function createConversation() {
    const token = localStorage.getItem("token")

    const res = await fetch("http://localhost:4000/api/chat/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: "New Conversation" })
    })

    if (!res.ok) {
      throw new Error('Failed to create conversation')
    }

    return await res.json()
  }

  // ✅ COMPLETE FIXED SEND FUNCTION
  const send = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input
    const token = localStorage.getItem('token')
    
    // Add user message to UI
    setMessages((m) => [...m, { role: 'user', text: userMessage }])
    setInput('')

    if (!isConnected) {
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: 'Sorry, backend is not connected. Please check your connection and try again.',
          },
        ])
      }, 500)
      return
    }

    try {
      // ✅ Step 1: Create conversation if needed
      let currentConversationId = conversationId
      
      if (!currentConversationId) {
        console.log('📝 Creating new conversation...')
        const conv = await createConversation()
        currentConversationId = conv.id
        setConversationId(conv.id)
        localStorage.setItem('currentConversationId', conv.id)
        console.log('✅ Conversation created:', conv.id)
      }

      // ✅ Step 2: Send message to backend (enqueue to Redis)
      console.log('📨 Sending message to backend...')
      const sendResponse = await fetch('http://localhost:4000/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: userMessage,
          conversationId: currentConversationId
        })
      })

      if (!sendResponse.ok) {
        throw new Error('Failed to send message')
      }

      console.log('✅ Message sent to queue')

      // ✅ Step 3: Start SSE streaming with token in URL
      console.log('📡 Starting SSE stream...')
      const eventSource = new EventSource(
        `http://localhost:4000/api/chat/stream/${currentConversationId}?token=${token}`
      )

      let assistantMessage = ''
      let messageStarted = false
      
      setIsTyping(true)

      eventSource.onmessage = (event) => {
        const chunk = JSON.parse(event.data)
        
        if (chunk.done) {
          console.log('✅ Stream complete')
          setIsTyping(false)
          eventSource.close()
        } else {
          // Add token to message
          assistantMessage += chunk.token
          
          if (!messageStarted) {
            messageStarted = true
            setMessages((m) => [...m, { role: 'assistant', text: assistantMessage }])
          } else {
            // Update last message in real-time
            setMessages((m) => {
              const newMessages = [...m]
              const lastMsg = newMessages[newMessages.length - 1]
              if (lastMsg?.role === 'assistant') {
                lastMsg.text = assistantMessage
              }
              return newMessages
            })
          }
        }
      }

      eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error)
        eventSource.close()
        setIsTyping(false)
        
        if (!messageStarted) {
          setMessages((m) => [
            ...m,
            {
              role: 'assistant',
              text: 'Sorry, there was an error receiving the response. Please try again.',
            },
          ])
        }
        toast.error('Connection error')
      }

    } catch (error) {
      console.error('❌ Send error:', error)
      setIsTyping(false)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'Sorry, there was an error processing your request. Please try again.',
        },
      ])
      toast.error('Failed to send message')
    }
  }

  const clearChat = () => {
    setMessages([])
    setConversationId(null)
    localStorage.removeItem('currentConversationId')
    toast.success("Chat cleared - new conversation will be created")
  }

  const initials = user?.firstName
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || "U"

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
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200"
              >
                <motion.div
                  animate={{ scale: isConnected ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs font-medium text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </motion.div>

              {/* New Chat Button */}
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={clearChat}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors text-gray-700"
              >
                New Chat
              </motion.button>

              {/* Account Dropdown */}
              {user && (
                <div className="relative" ref={accountMenuRef}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">{initials}</span>
                    </div>
                    <motion.svg 
                      animate={{ rotate: showAccountMenu ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none"
                      className="text-gray-600"
                    >
                      <path 
                        d="M6 9l6 6 6-6" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                  </motion.button>

                  <AnimatePresence>
                    {showAccountMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-br from-purple-50 to-blue-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                              <span className="text-white font-semibold">{initials}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{user.firstName}</p>
                              <p className="text-xs text-gray-600">{user.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="py-1">
                          <motion.button
                            whileHover={{ backgroundColor: 'rgba(249, 250, 251, 1)' }}
                            onClick={() => {
                              toast('Profile page coming soon!')
                              setShowAccountMenu(false)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-purple-600">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium">My Profile</p>
                              <p className="text-xs text-gray-500">View and edit profile</p>
                            </div>
                          </motion.button>

                          <motion.button
                            whileHover={{ backgroundColor: 'rgba(249, 250, 251, 1)' }}
                            onClick={() => {
                              toast('Settings page coming soon!')
                              setShowAccountMenu(false)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium">Settings</p>
                              <p className="text-xs text-gray-500">Preferences & privacy</p>
                            </div>
                          </motion.button>
                        </div>

                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <motion.button
                            whileHover={{ backgroundColor: 'rgba(254, 242, 242, 1)' }}
                            onClick={handleLogout}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-600">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium">Logout</p>
                              <p className="text-xs text-red-400">Sign out of your account</p>
                            </div>
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {[
                  { icon: '📊', text: 'Show employee attrition trends' },
                  { icon: '🔗', text: 'Analyze supplier performance' },
                  { icon: '📈', text: 'Generate financial reports' },
                  { icon: '📦', text: 'Check inventory levels' }
                ].map((suggestion, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02, borderColor: 'rgba(156, 163, 175, 0.5)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setInput(suggestion.text)}
                    className="p-4 rounded-xl text-left transition-all hover:bg-gray-50 border border-gray-200 group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{suggestion.icon}</span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{suggestion.text}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
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
                </motion.div>
              ))}

              {/* Typing Indicator */}
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

      {/* Input Area */}
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
              
              {voiceSupported && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
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
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="submit"
                className="mr-2 p-2 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!input.trim()}
                style={{
                  background: input.trim() ? 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)' : 'rgba(249, 250, 251, 1)',
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
              </motion.button>
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
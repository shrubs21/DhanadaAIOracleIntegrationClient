'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// 🔥 Backend API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

// ✅ CODE BLOCK COMPONENT
const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
        <span className="text-xs text-gray-400 font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-500">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-gray-900 p-4 rounded-b-lg overflow-x-auto">
        <code className="text-sm text-gray-100 font-mono">{code}</code>
      </pre>
    </div>
  )
}

// ✅ MESSAGE COMPONENT WITH ACTIONS (including Voice)
const Message = ({ message, index, onCopy, onRetry, onDelete, onShare, onExport, onReadAloud }) => {
  const [showActions, setShowActions] = useState(false)

  // 🔥 Detect if message contains table data
  const hasTable = (text) => {
    return text.includes('|') && text.split('\n').filter(line => line.includes('|')).length > 2
  }

  // 🔥 Detect export type based on content
  const getExportType = (text) => {
    if (hasTable(text)) return 'excel'
    return 'pdf'
  }

  const exportType = message.role === 'assistant' ? getExportType(message.text) : null

  const renderContent = (text) => {
    const parts = text.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, idx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).split('\n')
        const language = lines[0].trim()
        const code = lines.slice(1).join('\n')
        return <CodeBlock key={idx} code={code} language={language} />
      }
      
      part = part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      part = part.replace(/\*(.*?)\*/g, '<em>$1</em>')
      part = part.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      
      return <span key={idx} dangerouslySetInnerHTML={{ __html: part }} />
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 mb-8 group ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {message.role === 'assistant' && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)',
          }}
        >
          <span className="text-white font-bold text-[8px]">Oracle</span>
        </div>
      )}

      <div className="relative">
        <div className={`max-w-[70vw] ${message.role === 'user' ? 'bg-gray-100 rounded-3xl px-5 py-3' : ''}`}>
          <div className="text-[15px] leading-7 text-gray-800 whitespace-pre-wrap">
            {renderContent(message.text)}
          </div>
        </div>

        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`absolute ${message.role === 'user' ? 'right-0' : 'left-0'} -bottom-8 flex gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1`}
            >
              <button
                onClick={() => onCopy(message.text)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Copy"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                  <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
              
              {/* 🔥 NEW: Read Aloud Button (Voice) */}
              {message.role === 'assistant' && (
                <button
                  onClick={() => onReadAloud(message.text)}
                  className="p-1.5 hover:bg-purple-50 rounded transition-colors"
                  title="Read Aloud"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-purple-600">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              
              {/* Share Button */}
              {message.role === 'assistant' && (
                <button
                  onClick={() => onShare(message.text)}
                  className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                  title="Share"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              
              {/* Export Button (PDF/Excel) */}
              {message.role === 'assistant' && (
                <button
                  onClick={() => onExport(message.text, exportType)}
                  className="p-1.5 hover:bg-green-50 rounded transition-colors"
                  title={`Export as ${exportType === 'excel' ? 'Excel' : 'PDF'}`}
                >
                  {exportType === 'excel' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-600">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-600">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              )}
              
              {message.role === 'assistant' && (
                <button
                  onClick={() => onRetry(index)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Retry"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                    <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              <button
                onClick={() => onDelete(index)}
                className="p-1.5 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-600">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {message.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-white font-medium text-xs">You</span>
        </div>
      )}
    </motion.div>
  )
}

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
  
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  
  // ✅ Chat history state
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  
  // 🔥 NEW: Search and Pin state
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedChats, setPinnedChats] = useState([])
  const [isReading, setIsReading] = useState(false)
  
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const accountMenuRef = useRef(null)
  const speechSynthesisRef = useRef(null)

  async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token')
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (response.status === 401 || response.status === 403) {
      throw new Error(`${response.status}: Authentication failed`)
    }

    return response
  }

  // 🔥 NEW: Text-to-Speech function
  const handleReadAloud = useCallback((text) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported in your browser')
      return
    }

    // Stop any ongoing speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
      setIsReading(false)
      toast.success('Stopped reading')
      return
    }

    // Clean text (remove code blocks and markdown)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/[*_`#]/g, '') // Remove markdown
      .replace(/\|/g, '') // Remove table pipes
      .replace(/\n+/g, '. ') // Replace newlines with periods
      .trim()

    if (!cleanText) {
      toast.error('No text to read')
      return
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    
    // Configure voice settings
    utterance.rate = 0.9 // Slightly slower for clarity
    utterance.pitch = 1.0
    utterance.volume = 1.0
    
    // Get available voices and prefer English ones
    const voices = speechSynthesis.getVoices()
    const englishVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Female')
    ) || voices.find(voice => voice.lang.startsWith('en'))
    
    if (englishVoice) {
      utterance.voice = englishVoice
    }

    utterance.onstart = () => {
      setIsReading(true)
      toast.success('Reading message...', { icon: '🔊' })
    }

    utterance.onend = () => {
      setIsReading(false)
    }

    utterance.onerror = () => {
      setIsReading(false)
      toast.error('Failed to read message')
    }

    speechSynthesis.speak(utterance)
  }, [])

  // 🔥 NEW: Load pinned chats from localStorage
  useEffect(() => {
    const savedPins = localStorage.getItem('pinnedChats')
    if (savedPins) {
      setPinnedChats(JSON.parse(savedPins))
    }
  }, [])

  // 🔥 NEW: Toggle pin chat
  const handleTogglePin = useCallback((conversationId) => {
    setPinnedChats(prev => {
      const newPins = prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
      
      localStorage.setItem('pinnedChats', JSON.stringify(newPins))
      toast.success(newPins.includes(conversationId) ? 'Chat pinned' : 'Chat unpinned')
      return newPins
    })
  }, [])

  // 🔥 NEW: Filter conversations based on search
  const filteredConversations = useCallback(() => {
    if (!searchQuery.trim()) return conversations

    return conversations.filter(conv => {
      const title = conv.title || conv.first_message || 'New Chat'
      return title.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [conversations, searchQuery])

  // ✅ Load chat history
  const loadConversations = useCallback(async () => {
    try {
      setLoadingHistory(true)
      const res = await apiFetch(`${API_URL}/api/chat/conversations`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  // ✅ Load messages for a conversation
  const loadConversation = useCallback(async (conversationId) => {
    try {
      const res = await apiFetch(
        `${API_URL}/api/chat/conversations/${conversationId}/messages`
      )
      if (res.ok) {
        const data = await res.json()
        setMessages(data.map(msg => ({
          role: msg.role,
          text: msg.content
        })))
        setCurrentConversationId(conversationId)
        localStorage.setItem('currentConversationId', conversationId)
        toast.success('Conversation loaded')
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
      toast.error('Failed to load conversation')
    }
  }, [])

  // ✅ Load conversations on mount
  useEffect(() => {
    if (mounted && user) {
      loadConversations()
    }
  }, [mounted, user, loadConversations])

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_URL}/api/chat/health`)
        
        if (response.ok) {
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      } catch (error) {
        console.error('Backend connection failed:', error)
        setIsConnected(false)
      }
    }

    if (mounted) {
      checkConnection()
      const interval = setInterval(checkConnection, 30000)
      return () => clearInterval(interval)
    }
  }, [mounted])

  useEffect(() => {
    const token = localStorage.getItem("token")

    if (!token) {
      setLoading(false)
      return
    }

    apiFetch(`${API_URL}/api/auth/me`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        setUser(data)
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem("token")
        setUser(null)
        setLoading(false)
        router.replace("/login")
      })
  }, [router])

  useEffect(() => {
    setMounted(true)
  }, [])

  const scrollToBottom = useCallback((force = false) => {
    if (force || isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isAtBottom])

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsAtBottom(atBottom)
  }, [])

  useEffect(() => {
    const container = chatContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  useEffect(() => {
    if (mounted) {
      scrollToBottom()
    }
  }, [messages, isTyping, mounted, scrollToBottom])

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

  function addBotMessage(text) {
    setMessages((m) => [...m, { role: 'assistant', text }])
  }

  function updateLastBotMessage(text) {
    setMessages((m) => {
      const newMessages = [...m]
      const lastMsg = newMessages[newMessages.length - 1]
      if (lastMsg?.role === 'assistant') {
        lastMsg.text = text
      } else {
        newMessages.push({ role: 'assistant', text })
      }
      return newMessages
    })
  }

  const handleCopyMessage = useCallback((text) => {
    navigator.clipboard.writeText(text)
    toast.success('Message copied!')
  }, [])

  const handleShareMessage = useCallback(async (text) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Oracle AI Chat',
          text: text
        })
        toast.success('Shared successfully!')
      } else {
        navigator.clipboard.writeText(text)
        toast.success('Content copied to clipboard!')
      }
    } catch (error) {
      console.error('Share failed:', error)
      toast.error('Share failed')
    }
  }, [])

  const handleExportMessage = useCallback(async (text, type) => {
    const loadingToast = toast.loading(`Generating ${type.toUpperCase()}...`)
    
    try {
      const response = await apiFetch(`${API_URL}/api/export/${type}`, {
        method: 'POST',
        body: JSON.stringify({ content: text })
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `oracle-export.${type === 'excel' ? 'xlsx' : 'pdf'}`
      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/.exec(contentDisposition)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`${type.toUpperCase()} downloaded successfully!`, { id: loadingToast })
    } catch (error) {
      console.error('Export error:', error)
      toast.error(`Failed to export ${type.toUpperCase()}`, { id: loadingToast })
    }
  }, [])

  const handleRetryMessage = useCallback((messageIndex) => {
    if (messageIndex > 0) {
      const prevMessages = messages.slice(0, messageIndex)
      const lastUserMessage = [...prevMessages].reverse().find(m => m.role === 'user')
      
      if (lastUserMessage) {
        setMessages(prevMessages)
        sendMessage(lastUserMessage.text)
      }
    }
  }, [messages])

  const handleDeleteMessage = useCallback((messageIndex) => {
    setMessages(messages.filter((_, idx) => idx !== messageIndex))
    toast.success('Message deleted')
  }, [messages])

  function startStream(conversationId) {
    console.log("📡 Starting SSE stream...")

    const token = localStorage.getItem("token")

    const eventSource = new EventSource(
      `${API_URL}/api/chat/stream/${conversationId}?token=${token}`
    )

    let assistantText = ""
    setIsTyping(true)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (!data.done) {
        assistantText += data.token
        updateLastBotMessage(assistantText)
        
        if (assistantText.length > 0 && assistantText.length < 10) {
          loadConversations()
        }
      } else {
        console.log("✅ Stream complete")
        setIsTyping(false)
        eventSource.close()
        setTimeout(() => loadConversations(), 500)
      }
    }

    eventSource.onerror = (err) => {
      console.error("❌ SSE error:", err)
      eventSource.close()
      setIsTyping(false)
      
      if (!assistantText) {
        addBotMessage("Sorry, there was an error receiving the response.")
      }
      toast.error('Connection error')
    }
  }

  async function sendMessage(prompt) {
    if (!prompt.trim()) return

    setMessages((m) => [...m, { role: 'user', text: prompt }])

    if (!isConnected) {
      setTimeout(() => {
        addBotMessage('Sorry, backend is not connected. Please check your connection and try again.')
      }, 500)
      return
    }

    try {
      console.log("📨 Sending message to backend...")
      console.log("🆔 Current conversation ID:", currentConversationId)

      const res = await apiFetch(`${API_URL}/api/chat/send`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          conversationId: currentConversationId
        })
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to send message`)
      }

      const data = await res.json()
      console.log("🆔 Backend returned conversation ID:", data.conversationId)

      setCurrentConversationId(data.conversationId)
      localStorage.setItem("currentConversationId", data.conversationId)

      await loadConversations()

      console.log("✅ Message sent to queue")

      startStream(data.conversationId)

    } catch (err) {
      console.error("❌ Send error:", err)
      
      if (err.message?.includes("401") || err.message?.includes("403")) {
        localStorage.removeItem("token")
        localStorage.removeItem("currentConversationId")
        toast.error("Session expired - please login again")
        router.replace("/login")
        return
      }

      setIsTyping(false)
      addBotMessage("Sorry, there was an error processing your request. Please try again.")
      toast.error('Failed to send message')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    
    const userMessage = input
    setInput('')
    sendMessage(userMessage)
  }

  const handleNewChat = () => {
    setMessages([])
    setCurrentConversationId(null)
    localStorage.removeItem('currentConversationId')
    toast.success("New chat started")
  }

  const initials = user?.firstName
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || "U"

  if (!mounted) {
    return null
  }

  // Separate pinned and regular chats
  const filtered = filteredConversations()
  const pinnedConversations = filtered.filter(conv => pinnedChats.includes(conv.id))
  const regularConversations = filtered.filter(conv => !pinnedChats.includes(conv.id))

  return (
    <div className="h-screen bg-white text-gray-900 flex overflow-hidden">
      {/* ✅ ENHANCED SIDEBAR */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-r border-gray-200 flex flex-col bg-gray-50 overflow-hidden"
          >
            {/* Sidebar Header - NEW CHAT BUTTON */}
            <div className="p-4 border-b border-gray-200">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewChat}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                New Chat
              </motion.button>
            </div>

            {/* 🔥 NEW: SEARCH BAR */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full px-3 py-2 pl-9 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                />
                <svg
                  className="absolute left-3 top-2.5 text-gray-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            {/* Chat History List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* 🔥 PINNED CHATS SECTION */}
              {pinnedConversations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 12V4h1a1 1 0 000-2H7a1 1 0 000 2h1v8l-2 2v2h5.586l-1.293 1.293a1 1 0 101.414 1.414L16 14.414l4.293 4.293a1 1 0 001.414-1.414L20.414 16H22v-2l-2-2h-4zm-2 0H10V4h4v8z"/>
                    </svg>
                    Pinned
                  </div>
                  {pinnedConversations.map((conv) => {
                    const displayTitle = conv.title && conv.title !== "New Chat"
                      ? conv.title
                      : conv.first_message || "New Chat"
                    
                    return (
                      <motion.div
                        key={conv.id}
                        whileHover={{ scale: 1.02 }}
                        className={`group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                          currentConversationId === conv.id
                            ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200'
                            : 'hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between" onClick={() => loadConversation(conv.id)}>
                          <span className={`text-sm truncate flex-1 ${
                            currentConversationId === conv.id ? 'font-semibold text-gray-900' : 'text-gray-700'
                          }`}>
                            {displayTitle}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTogglePin(conv.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-purple-500">
                              <path d="M16 12V4h1a1 1 0 000-2H7a1 1 0 000 2h1v8l-2 2v2h5.586l-1.293 1.293a1 1 0 101.414 1.414L16 14.414l4.293 4.293a1 1 0 001.414-1.414L20.414 16H22v-2l-2-2h-4zm-2 0H10V4h4v8z"/>
                            </svg>
                          </button>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {new Date(conv.created_at).toLocaleDateString()}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* REGULAR CHATS SECTION */}
              {regularConversations.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
                    {pinnedConversations.length > 0 ? 'All Chats' : 'Chat History'}
                  </div>
                  
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                  ) : regularConversations.length === 0 && pinnedConversations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {searchQuery ? 'No chats found' : 'No conversations yet'}
                    </div>
                  ) : (
                    regularConversations.map((conv) => {
                      const displayTitle = conv.title && conv.title !== "New Chat"
                        ? conv.title
                        : conv.first_message || "New Chat"
                      
                      return (
                        <motion.div
                          key={conv.id}
                          whileHover={{ scale: 1.02 }}
                          className={`group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                            currentConversationId === conv.id
                              ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200'
                              : 'hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between" onClick={() => loadConversation(conv.id)}>
                            <span className={`text-sm truncate flex-1 ${
                              currentConversationId === conv.id ? 'font-semibold text-gray-900' : 'text-gray-700'
                            }`}>
                              {displayTitle}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTogglePin(conv.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 hover:text-purple-500">
                                <path d="M16 12V4h1a1 1 0 000-2H7a1 1 0 000 2h1v8l-2 2v2h5.586l-1.293 1.293a1 1 0 101.414 1.414L16 14.414l4.293 4.293a1 1 0 001.414-1.414L20.414 16H22v-2l-2-2h-4zm-2 0H10V4h4v8z" strokeWidth="2"/>
                              </svg>
                            </button>
                          </div>
                          <span className="text-xs text-gray-500 mt-1 block">
                            {new Date(conv.created_at).toLocaleDateString()}
                          </span>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA - Rest of the component remains the same but with updated Message component calls */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 z-10 bg-white flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                
                <div>
                  <h1 className="text-base font-semibold text-gray-900">Oracle AI Assistant</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
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
                                setShowAccountMenu(false)
                                toast.success('Profile update coming soon! ')
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:text-purple-600 flex items-center gap-3 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-purple-600">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium">Profile</p>
                                <p className="text-xs text-gray-500">Update your information</p>
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
        <div 
          ref={chatContainerRef} 
          className="flex-1 overflow-y-auto overflow-x-hidden"
          onScroll={handleScroll}
        >
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
                    <span className="text-white font-bold text-sm">oracle</span>
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
                  <Message
                    key={i}
                    message={m}
                    index={i}
                    onCopy={handleCopyMessage}
                    onShare={handleShareMessage}
                    onExport={handleExportMessage}
                    onRetry={handleRetryMessage}
                    onDelete={handleDeleteMessage}
                    onReadAloud={handleReadAloud}
                  />
                ))}

                {isTyping && (
                  <div className="flex gap-4 mb-8">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                      style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)',
                      }}
                    >
                      <span className="text-white font-bold text-[8px]">oracle</span>
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

        {/* Scroll to Bottom Button */}
        <AnimatePresence>
          {!isAtBottom && messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToBottom(true)}
              className="fixed bottom-32 right-8 p-3 bg-white border-2 border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white flex-shrink-0">
          <div className="max-w-3xl mx-auto px-4 py-4 pb-6">
            <form onSubmit={handleSubmit} className="relative">
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
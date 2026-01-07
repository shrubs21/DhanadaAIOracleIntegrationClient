'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
    <div className="relative my-4 rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#0B132B] shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#03045E] border-b border-[#E5E7EB]/20">
        <span className="text-xs font-semibold text-white uppercase tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto">
        <code className="text-sm text-white font-mono leading-relaxed">{code}</code>
      </pre>
    </div>
  )
}

// 📎 FILE UPLOAD COMPONENT
const FileUploadArea = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB')
      return false
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only images (JPEG, PNG, GIF, WebP) and PDFs are supported')
      return false
    }

    return true
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files[0] && validateFile(files[0])) {
      onFileSelect(files[0])
    }
  }

  const handleFileInput = (e) => {
    const files = e.target.files
    if (files && files[0] && validateFile(files[0])) {
      onFileSelect(files[0])
    }
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
        isDragging
          ? 'border-[#03045E] bg-[#F9FAFB]'
          : 'border-[#E5E7EB] bg-white hover:border-[#03045E]/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
      <div className="text-sm font-medium text-[#0B132B]">
        {isDragging ? '📥 Drop file here' : '📎 Click to upload or drag and drop'}
      </div>
      <div className="text-xs text-[#6B7280] mt-2">
        Images (JPEG, PNG, GIF, WebP) or PDF • Max 10MB
      </div>
    </div>
  )
}

//  MESSAGE COMPONENT WITH COMPACT ACTIONS INCLUDING SHARE AND EXPORT
const Message = ({ message, index, onCopy, onRetry, onShare, onExport, onReadAloud }) => {
  const [showActions, setShowActions] = useState(false)

  const hasTable = (text) => {
    return text.includes('|') && text.split('\n').filter(line => line.includes('|')).length > 2
  }

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

      part = part.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#0B132B]">$1</strong>')
      part = part.replace(/\*(.*?)\*/g, '<em class="italic text-[#475569]">$1</em>')
      part = part.replace(/`(.*?)`/g, '<code class="px-2 py-0.5 bg-[#F9FAFB] rounded-md text-sm font-mono text-[#03045E] border border-[#E5E7EB]">$1</code>')

      return <p key={idx} className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: part }} />
    })
  }

  const messageVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.4
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`flex gap-4 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {message.role === 'assistant' && (
        <motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
  className="w-10 h-10 rounded-full bg-[#03045E] flex items-center justify-center flex-shrink-0 shadow-md"
>
  <span className="text-white font-semibold text-[11px] tracking-wide">
    Oracle
  </span>
</motion.div>

      )}

      <div className="relative max-w-[75%]">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`rounded-2xl px-5 py-4 shadow-sm ${
            message.role === 'assistant'
              ? 'bg-[#F9FAFB] border border-[#E5E7EB]'
              : 'bg-white border border-[#E5E7EB] text-[#0B132B]'
          }`}
        >
          <div className="text-[15px] leading-relaxed text-[#0B132B]">
            {renderContent(message.text)}
          </div>
        </motion.div>

        {/* Compact Action Buttons - Only show on hover, positioned beside message */}
        <AnimatePresence>
          {showActions && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-2 ${message.role === 'assistant' ? '-right-12' : '-left-12'} flex flex-col gap-1`}
            >
              <button
                onClick={() => onCopy(message.text)}
                className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-all border border-[#E5E7EB] bg-white shadow-sm"
                title="Copy"
              >
              <svg viewBox="-0.5 -0.5 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" id="Sidebar-Collapse--Streamline-Iconoir" height="16" width="16">
  <desc>
    Sidebar Collapse Streamline Icon: https://streamlinehq.com
  </desc>
  <path d="M12.7769375 14.284625H2.2230625c-0.8326875 0 -1.5076875 -0.675 -1.5076875 -1.5076875l0 -10.553875c0 -0.8326875 0.675 -1.5076875 1.5076875 -1.5076875h10.553875c0.8326875 0 1.5076875 0.675 1.5076875 1.5076875v10.553875c0 0.8326875 -0.675 1.5076875 -1.5076875 1.5076875Z" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"></path>
  <path d="M3.9192500000000003 5.9923125 2.6 7.5l1.3192499999999998 1.5076875" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"></path>
  <path d="M5.615375 14.284625V0.7153750000000001" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"></path>
</svg>
              </button>

              {message.role === 'assistant' && (
                <>
                  <button
                    onClick={() => onReadAloud(message.text)}
                    className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-all border border-[#E5E7EB] bg-white shadow-sm"
                    title="Read Aloud"
                  >
                    <svg className="w-4 h-4 text-[#03045E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => onShare(message.text)}
                    className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-all border border-[#E5E7EB] bg-white shadow-sm"
                    title="Share"
                  >
                    <svg className="w-4 h-4 text-[#03045E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => onExport(message.text, exportType)}
                    className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-all border border-[#E5E7EB] bg-white shadow-sm"
                    title={`Export as ${exportType === 'excel' ? 'Excel' : 'PDF'}`}
                  >
                    {exportType === 'excel' ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => onRetry(index)}
                    className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-all border border-[#E5E7EB] bg-white shadow-sm"
                    title="Retry"
                  >
                    <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {message.role === 'user' && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="w-10 h-10 rounded-full bg-[#0B132B] flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 shadow-md"
        >
          You
        </motion.div>
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
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedChats, setPinnedChats] = useState([])
  const [isReading, setIsReading] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadedFileData, setUploadedFileData] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [hoveredConversation, setHoveredConversation] = useState(null)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const accountMenuRef = useRef(null)

  async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }

    const response = await fetch(url, { ...options, headers })

    if (response.status === 401 || response.status === 403) {
      throw new Error(`${response.status}: Authentication failed`)
    }

    return response
  }

  const handleFileSelect = useCallback(async (file) => {
    setSelectedFile(file)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setUploadedFileData(data.file)
      toast.success(`${file.name} uploaded successfully!`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
      setSelectedFile(null)
    } finally {
      setUploading(false)
    }
  }, [])

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setUploadedFileData(null)
  }

  const handleReadAloud = useCallback((text) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported in your browser')
      return
    }

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
      setIsReading(false)
      toast.success('Stopped reading')
      return
    }

    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_`#]/g, '')
      .replace(/\|/g, '')
      .replace(/\n+/g, '. ')
      .trim()

    if (!cleanText) {
      toast.error('No text to read')
      return
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voices = speechSynthesis.getVoices()
    const englishVoice = voices.find(voice =>
      voice.lang.startsWith('en') && voice.name.includes('Female')
    ) || voices.find(voice => voice.lang.startsWith('en'))

    if (englishVoice) utterance.voice = englishVoice

    utterance.onstart = () => {
      setIsReading(true)
      toast.success('Reading message...', { icon: '🔊' })
    }

    utterance.onend = () => setIsReading(false)

    utterance.onerror = () => {
      setIsReading(false)
      toast.error('Failed to read message')
    }

    speechSynthesis.speak(utterance)
  }, [])

  useEffect(() => {
    const savedPins = localStorage.getItem('pinnedChats')
    if (savedPins) setPinnedChats(JSON.parse(savedPins))
  }, [])

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

  const handleDeleteConversation = useCallback(async (conversationId, e) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return
    }

    try {
      const res = await apiFetch(`${API_URL}/api/chat/conversations/${conversationId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        if (currentConversationId === conversationId) {
          setMessages([])
          setCurrentConversationId(null)
          localStorage.removeItem('currentConversationId')
        }
        toast.success('Conversation deleted')
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      toast.error('Failed to delete conversation')
    }
  }, [currentConversationId])

  const filteredConversations = useCallback(() => {
    if (!searchQuery.trim()) return conversations

    return conversations.filter(conv => {
      const title = conv.title || conv.first_message || 'New Chat'
      return title.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [conversations, searchQuery])

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

  const loadConversation = useCallback(async (conversationId) => {
    try {
      const res = await apiFetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.map(msg => ({ role: msg.role, text: msg.content })))
        setCurrentConversationId(conversationId)
        localStorage.setItem('currentConversationId', conversationId)
        toast.success('Conversation loaded')
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
      toast.error('Failed to load conversation')
    }
  }, [])

  useEffect(() => {
    if (mounted && user) {
      loadConversations()
    }
  }, [mounted, user, loadConversations])

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_URL}/api/chat/health`)
        setIsConnected(response.ok)
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
    const eventSource = new EventSource(`${API_URL}/api/chat/stream/${conversationId}?token=${token}`)

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
    if (!prompt.trim() && !uploadedFileData) return

    const userMessage = uploadedFileData
      ? `${prompt}\n\n📎 Attached: ${uploadedFileData.filename}`
      : prompt

    setMessages((m) => [...m, { role: 'user', text: userMessage }])

    if (!isConnected) {
      setTimeout(() => {
        addBotMessage('Sorry, backend is not connected. Please check your connection and try again.')
      }, 500)
      return
    }

    try {
      console.log("📨 Sending message to backend...")

      const res = await apiFetch(`${API_URL}/api/chat/send`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          conversationId: currentConversationId,
          fileData: uploadedFileData
        })
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to send message`)
      }

      const data = await res.json()
      setCurrentConversationId(data.conversationId)
      localStorage.setItem("currentConversationId", data.conversationId)

      await loadConversations()

      setUploadedFileData(null)
      setSelectedFile(null)

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
    if (!input.trim() && !uploadedFileData) return

    const userMessage = input
    setInput('')
    sendMessage(userMessage)
  }

  const handleNewChat = () => {
    setMessages([])
    setCurrentConversationId(null)
    localStorage.removeItem('currentConversationId')
    setUploadedFileData(null)
    setSelectedFile(null)
    toast.success("New chat started")
  }

  const initials = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U"

  if (!mounted) {
    return null
  }

  const filtered = filteredConversations()
  const pinnedConversations = filtered.filter(conv => pinnedChats.includes(conv.id))
  const regularConversations = filtered.filter(conv => !pinnedChats.includes(conv.id))

  return (
    <div className="flex h-screen bg-white">
      {/* SIDEBAR */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} bg-[#F9FAFB] border-r border-[#E5E7EB] flex flex-col shadow-sm transition-all duration-300 ease-in-out overflow-hidden`}>
        <div className="p-4 border-b border-[#E5E7EB]">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-3 bg-[#03045E] text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="p-4 border-b border-[#E5E7EB]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full px-3 py-2.5 pl-9 text-sm bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#03045E] transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {pinnedConversations.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-bold text-[#6B7280] px-3 py-2 uppercase tracking-wider">
                📌 Pinned
              </div>
              {pinnedConversations.map((conv) => {
                const displayTitle = conv.title && conv.title !== "New Chat"
                  ? conv.title
                  : conv.first_message || "New Chat"

                return (
                  <div
                    key={conv.id}
                    onMouseEnter={() => setHoveredConversation(conv.id)}
                    onMouseLeave={() => setHoveredConversation(null)}
                    className={`group relative px-3 py-3 rounded-xl cursor-pointer transition-all mb-1.5 ${
                      currentConversationId === conv.id
                        ? 'bg-white border border-[#E5E7EB] shadow-sm'
                        : 'hover:bg-white border border-transparent'
                    }`}
                  >
                    <div onClick={() => loadConversation(conv.id)}>
                      <div className="font-semibold text-sm text-[#0B132B] truncate pr-16">
                        {displayTitle}
                      </div>
                      <div className="text-xs text-[#6B7280] mt-1 font-medium">
                        {new Date(conv.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {hoveredConversation === conv.id && (
                      <div className="absolute right-2 top-3 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(conv.id)
                          }}
                          className="p-1.5 hover:bg-[#F9FAFB] rounded-lg transition-all"
                          title="Unpin"
                        >
                          <svg className="w-4 h-4 text-amber-500 fill-current" viewBox="0 0 24 24">
                            <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {regularConversations.length > 0 && (
            <div className="p-2">
               <div className="text-xs font-bold text-[#6B7280] px-3 py-2 uppercase tracking-wider">
    <div className="flex items-center gap-2">
      <img
        src="/assets/chat.png"
        alt="Chat"
        className="w-4 h-4 object-contain"
      />
      <span>
        {pinnedConversations.length > 0 ? 'All Chats' : 'Chat History'}
      </span>
    </div>
  </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03045E]"></div>
                </div>
              ) : regularConversations.length === 0 && pinnedConversations.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#6B7280] font-medium">
                  {searchQuery ? 'No chats found' : 'No conversations yet'}
                </div>
              ) : (
                regularConversations.map((conv) => {
                  const displayTitle = conv.title && conv.title !== "New Chat"
                    ? conv.title
                    : conv.first_message || "New Chat"

                  return (
                    <div
                      key={conv.id}
                      onMouseEnter={() => setHoveredConversation(conv.id)}
                      onMouseLeave={() => setHoveredConversation(null)}
                      className={`group relative px-3 py-3 rounded-xl cursor-pointer transition-all mb-1.5 ${
                        currentConversationId === conv.id
                          ? 'bg-white border border-[#E5E7EB] shadow-sm'
                          : 'hover:bg-white border border-transparent'
                      }`}
                    >
                      <div onClick={() => loadConversation(conv.id)}>
                        <div className="font-semibold text-sm text-[#0B132B] truncate pr-16">
                          {displayTitle}
                        </div>
                        <div className="text-xs text-[#6B7280] mt-1 font-medium">
                          {new Date(conv.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {hoveredConversation === conv.id && (
                        <div className="absolute right-2 top-3 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(conv.id)
                            }}
                            className="p-1.5 hover:bg-[#F9FAFB] rounded-lg transition-all"
                            title="Pin"
                          >
                            <svg className="w-4 h-4 text-[#6B7280] hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between shadow-sm relative z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2.5 hover:bg-[#F9FAFB] rounded-xl transition-all"
            >
             <svg viewBox="-0.625 -0.625 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" id="Log-Out--Streamline-Iconoir" height="30" width="30">
  <desc>
    Log Out Streamline Icon: https://streamlinehq.com
  </desc>
  <path d="M9.375 9.375h6.596171875m0 0 -2.826953125 2.826953125M15.971171875000001 9.375l-2.826953125 -2.826953125" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.25"></path>
  <path d="M15.971171875000001 3.7211718749999996V2.778828125c0 -1.0408593750000001 -0.84375 -1.8846093750000001 -1.8846093750000001 -1.8846093750000001H4.6634375c-1.04078125 0 -1.8846093750000001 0.84375 -1.8846093750000001 1.8846093750000001v13.19234375c0 1.0408593750000001 0.843828125 1.8846093750000001 1.8846093750000001 1.8846093750000001h9.423125c1.0408593750000001 0 1.8846093750000001 -0.84375 1.8846093750000001 -1.8846093750000001v-0.9423437499999999" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.25"></path>
</svg>
            </button>

            <div>
              <h1 className="text-xl font-bold text-[#0B132B]">
                Oracle AI Assistant
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                <span className="text-xs text-[#475569] font-semibold">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {user && (
            <div className="relative z-[100]" ref={accountMenuRef}>
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-white transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-[#03045E] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {initials}
                </div>
                <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAccountMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#E5E7EB] py-2 z-[9999]"
                >
                  <div className="px-4 py-3 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#03045E] flex items-center justify-center text-white font-bold shadow-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#0B132B] truncate">
                          {user.firstName}
                        </div>
                        <div className="text-sm text-[#475569] truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      toast.success('Profile update coming soon!')
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-[#475569] hover:text-[#03045E] hover:bg-[#F9FAFB] flex items-center gap-3 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      <div className="font-semibold">Profile</div>
                      <div className="text-xs text-[#6B7280]">Update your information</div>
                    </div>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <div>
                      <div className="font-semibold">Logout</div>
                      <div className="text-xs text-[#6B7280]">Sign out of your account</div>
                    </div>
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-6 py-6 bg-white"
        >
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto"
            >
   <motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
  className="
    w-20
    h-13
    
    aspect-square
    rounded-full
    bg-[#03045E]
    flex
    items-center
    justify-center
    shadow-lg
    mt-5
  "
>
  <span className="text-white font-semibold text-lg tracking-wide leading-none">
    oracle
  </span>
</motion.div>



              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold text-[#0B132B] mb-3"
              >
                How can I help you today?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[#475569] font-medium mb-10 text-lg"
              >
                Ask me anything about Oracle HCM, SCM, ERP, or Financials
              </motion.p>

              <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.5 }}
  className="grid grid-cols-2 gap-4 w-full max-w-2xl"
>
  {[
    {
      icon: '/assets/show-employee-attrition-trends.png',
      text: 'Show employee attrition trends'
    },
    {
      icon: '/assets/supply-chain.png',
      text: 'Analyze supplier performance'
    },
    {
      icon: '/assets/generate-financial-reports.png',
      text: 'Generate financial reports'
    },
    {
      icon: '/assets/inventory-management.png',
      text: 'Check inventory levels'
    }
  ].map((suggestion, i) => (
    <motion.button
      key={i}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 + i * 0.1 }}
      onClick={() => setInput(suggestion.text)}
      className="p-5 rounded-2xl text-left transition-all hover:bg-[#F9FAFB] hover:shadow-md border-2 border-[#E5E7EB] hover:border-[#03045E] group"
    >
      {/* ICON IMAGE */}
      <img
        src={suggestion.icon}
        alt={suggestion.text}
        className="w-10 h-10 mb-3 object-contain"
      />

      {/* TEXT */}
      <div className="text-sm font-semibold text-[#475569] group-hover:text-[#03045E] transition-colors">
        {suggestion.text}
      </div>
    </motion.button>
  ))}
</motion.div>

            </motion.div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((m, i) => (
                  <Message
                    key={i}
                    message={m}
                    index={i}
                    onCopy={handleCopyMessage}
                    onRetry={handleRetryMessage}
                    onDelete={handleDeleteMessage}
                    onShare={handleShareMessage}
                    onExport={handleExportMessage}
                    onReadAloud={handleReadAloud}
                  />
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="flex gap-4"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-10 h-10 rounded-full bg-[#03045E] flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 shadow-md"
                  >
                    Oracle
                  </motion.div>
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-5 py-4 shadow-sm">
                    <div className="flex gap-1.5">
                      <motion.div 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                        className="w-2.5 h-2.5 bg-[#03045E] rounded-full"
                      />
                      <motion.div 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="w-2.5 h-2.5 bg-[#03045E] rounded-full"
                      />
                      <motion.div 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        className="w-2.5 h-2.5 bg-[#03045E] rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Scroll to Bottom Button */}
        <AnimatePresence>
          {!isAtBottom && messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={() => scrollToBottom(true)}
              className="fixed bottom-32 right-8 p-3 bg-white border-2 border-[#E5E7EB] rounded-full shadow-lg hover:shadow-xl transition-all z-50 hover:border-[#03045E]"
            >
              <svg className="w-5 h-5 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="bg-white border-t border-[#E5E7EB] px-6 py-4 shadow-sm">
          {showFileUpload && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 max-w-3xl mx-auto"
            >
              <FileUploadArea onFileSelect={handleFileSelect} disabled={uploading || isTyping} />
            </motion.div>
          )}

          {uploadedFileData && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 max-w-3xl mx-auto p-4 bg-[#F9FAFB] border-2 border-[#03045E] rounded-2xl flex items-center gap-3 shadow-sm"
            >
              <div className="flex-shrink-0">
                {uploadedFileData.isImage ? (
                  <svg className="w-10 h-10 text-[#03045E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#0B132B] truncate">
                  {uploadedFileData.filename}
                </div>
                <div className="text-xs text-[#475569] font-medium">
                  {uploadedFileData.isImage ? 'Image' : `PDF • ${uploadedFileData.pages} pages`}
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="flex-shrink-0 p-2 hover:bg-red-100 rounded-xl transition-all"
              >
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}

          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white rounded-full border border-[#E5E7EB] px-4 py-3 shadow-sm hover:shadow-md transition-all">
              <button
                type="button"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className={`p-2 rounded-full transition-all flex-shrink-0 ${showFileUpload ? 'bg-[#03045E] text-white' : 'hover:bg-[#F9FAFB] text-[#6B7280]'}`}
                title="Attach file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                className="flex-1 bg-transparent focus:outline-none text-[#0B132B] placeholder:text-[#6B7280] text-[15px]"
                placeholder={uploadedFileData ? "Add a message..." : "Message Oracle AI Assistant..."}
              />

              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-full transition-all flex-shrink-0 ${
                    isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-[#F9FAFB] text-[#6B7280]'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}

              <button
                type="submit"
                disabled={(!input.trim() && !uploadedFileData) || isTyping}
                className="p-2 rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9FAFB] text-[#6B7280]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </form>

            <div className="text-center text-xs text-[#6B7280] mt-3 font-medium">
              Oracle AI can make mistakes. Check important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
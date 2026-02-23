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
//  MESSAGE COMPONENT WITH SIDE ACTION BUTTONS (COPY + EXPORT) AND 3-DOT MENU
const Message = ({ message, index, onCopy, onRetry, onShare, onExport, onReadAloud }) => {
  const [showActions, setShowActions] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

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

      // Check if this part contains a table (markdown table format)
      if (part.includes('|') && part.split('\n').filter(line => line.trim().includes('|')).length > 2) {
        return renderTable(part, idx)
      }

      // Handle lists
      if (part.includes('\n- ') || part.includes('\n* ')) {
        return renderList(part, idx)
      }

      // Handle headers
      part = part.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-[#0B132B] mt-4 mb-2">$1</h3>')
      part = part.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-[#0B132B] mt-5 mb-3">$1</h2>')
      part = part.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-[#0B132B] mt-6 mb-4">$1</h1>')

      // Handle bold and italic
      part = part.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#0B132B]">$1</strong>')
      part = part.replace(/\*(.*?)\*/g, '<em class="italic text-[#475569]">$1</em>')
      part = part.replace(/`(.*?)`/g, '<code class="px-2 py-0.5 bg-[#F9FAFB] rounded-md text-sm font-mono text-[#03045E] border border-[#E5E7EB]">$1</code>')

      return <p key={idx} className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: part }} />
    })
  }

 const renderTable = (text, key) => {
  // ✅ NEW: Use actual data if available (PRIORITY)
  if (message.actualData && message.actualData.length > 0) {
    const data = message.actualData;
    
    // Define preferred column order
    const defaultColumns = [
      "PersonNumber",
      "DisplayName", 
      "Email",
      "JobTitle",
      "DepartmentName",
      "HireDate",
      "WorkPhoneNumber"
    ];
    
    const columnLabels = {
      "PersonNumber": "Employee ID",
      "DisplayName": "Full Name",
      "Email": "Email Address",
      "JobTitle": "Job Title",
      "DepartmentName": "Department",
      "HireDate": "Hire Date",
      "WorkPhoneNumber": "Phone"
    };
    
    // Get available columns from first row
    const availableColumns = defaultColumns.filter(col => 
      data[0] && data[0].hasOwnProperty(col)
    );
    
    // Fallback to all keys if no default columns found
    const headers = availableColumns.length > 0 
      ? availableColumns 
      : Object.keys(data[0]);
    
    return (
      <div key={key} className="my-4 overflow-x-auto rounded-xl border border-[#E5E7EB] shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-[#03045E] to-[#0B132B] text-white">
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider border-r border-white/20 last:border-r-0">
                  {columnLabels[header] || header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#E5E7EB]">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-[#F9FAFB] transition-colors">
                {headers.map((header, j) => {
                  const value = row[header];
                  const isEmpty = !value || value === "" || value === null;
                  
                  return (
                    <td key={j} className="px-4 py-3 border-r border-[#E5E7EB] last:border-r-0">
                      {isEmpty ? (
                        <span className="text-[#9CA3AF] italic text-xs">N/A</span>
                      ) : (
                        <span className="text-[#0B132B]">{String(value)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {message.actualCount > data.length && (
          <div className="bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280] border-t border-[#E5E7EB] font-medium">
            ✅ Showing {data.length} of {message.actualCount} records. Full table loaded below with pagination.
          </div>
        )}
      </div>
    );
  }
  
  // ✅ FALLBACK: Parse markdown table (for old messages or when no actual data)
  const lines = text.trim().split('\n').filter(line => line.trim().includes('|'))
  
  if (lines.length < 2) return null

  const headers = lines[0].split('|').map(h => h.trim()).filter(h => h)
  const rows = lines.slice(2).map(line => 
    line.split('|').map(cell => cell.trim()).filter(cell => cell)
  )

  return (
    <div key={key} className="my-4 overflow-x-auto rounded-xl border border-[#E5E7EB] shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gradient-to-r from-[#03045E] to-[#0B132B] text-white">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider border-r border-white/20 last:border-r-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-[#E5E7EB]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[#F9FAFB] transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-[#0B132B] border-r border-[#E5E7EB] last:border-r-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

 const renderList = (text, key) => {
    const lines = text.split('\n')
    const listItems = []
    let currentList = []
    let inList = false

    lines.forEach((line, i) => {
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        inList = true
        currentList.push(line.trim().substring(2))
      } else if (line.trim() === '' && inList) {
        if (currentList.length > 0) {
          listItems.push([...currentList])
          currentList = []
        }
        inList = false
      } else if (!inList && line.trim()) {
        listItems.push(line)
      }
    })

    if (currentList.length > 0) {
      listItems.push(currentList)
    }

    return (
      <div key={key}>
        {listItems.map((item, i) => {
          if (Array.isArray(item)) {
            return (
              <ul key={i} className="my-2 space-y-1">
                {item.map((li, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#03045E] text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                      {j + 1}
                    </span>
                    <span className="flex-1 text-[#0B132B] leading-relaxed text-sm">{li}</span>
                  </li>
                ))}
              </ul>
            )
          }
          return <p key={i} className="my-1 text-[#0B132B] leading-relaxed">{item}</p>
        })}
      </div>
    )
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
      className={`flex gap-4 relative ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false)
        setShowMoreMenu(false)
      }}
    >
     {message.role === 'assistant' && (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
    className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden border border-[#E5E7EB]"
  >
    <img 
      src="/assets/dt.png" 
      alt="DT" 
      className="w-8 h-8 object-contain"
    />
  </motion.div>
)}

      <div className="max-w-[75%] relative">
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
          {/* 🔥 FIX: RENDER DOWNLOAD UI USING message.fileUrl */}
          {message.fileUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  {message.fileFormat === 'PDF' && (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                  {message.fileFormat === 'Excel' && (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                  {message.fileFormat === 'CSV' && (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#0B132B] truncate">{message.fileName || 'Document'}</div>
                  <div className="text-sm text-[#6B7280] flex items-center gap-2 mt-1">
                    <span>{message.fileFormat || 'File'}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    window.open(message.fileUrl, '_blank');
                    toast.success('Download started!');
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </motion.div>
          )}

          <div className="text-[15px] leading-relaxed text-[#0B132B]">
            {renderContent(message.text)}
          </div>
        </motion.div>

        {/* ✅ SIDE ACTION BUTTONS - COPY + EXPORT (visible on hover) */}
        <AnimatePresence>
          {showActions && message.role === 'assistant' && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-2 -right-28 flex flex-col gap-2"
            >
              {/* Copy Button */}
              <button
                onClick={() => onCopy(message.text)}
                className="p-2.5 hover:bg-white rounded-lg transition-all border border-[#E5E7EB] bg-[#F9FAFB] shadow-sm group"
                title="Copy"
              >
                <svg className="w-4 h-4 text-[#475569] group-hover:text-[#03045E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Export Button (PDF/Excel) */}
              <button
                onClick={() => onExport(message.text, exportType)}
                className="p-2.5 hover:bg-white rounded-lg transition-all border border-[#E5E7EB] bg-[#F9FAFB] shadow-sm group"
                title={`Export as ${exportType === 'excel' ? 'Excel' : 'PDF'}`}
              >
                {exportType === 'excel' ? (
                  <svg className="w-4 h-4 text-green-600 group-hover:text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600 group-hover:text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </button>

              {/* 3-Dot More Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2.5 hover:bg-white rounded-lg transition-all border border-[#E5E7EB] bg-[#F9FAFB] shadow-sm group"
                  title="More options"
                >
                  <svg className="w-4 h-4 text-[#475569] group-hover:text-[#03045E]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1 z-50"
                    >
                      <button
                        onClick={() => {
                          onReadAloud(message.text)
                          setShowMoreMenu(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#475569] hover:text-[#03045E] hover:bg-[#F9FAFB] flex items-center gap-3 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        Read Aloud
                      </button>

                      <button
                        onClick={() => {
                          onShare(message.text)
                          setShowMoreMenu(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#475569] hover:text-[#03045E] hover:bg-[#F9FAFB] flex items-center gap-3 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                      </button>

                      <button
                        onClick={() => {
                          onRetry(index)
                          setShowMoreMenu(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#475569] hover:text-[#03045E] hover:bg-[#F9FAFB] flex items-center gap-3 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
    const token = localStorage.getItem("authToken")
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
  const [showDTMenu, setShowDTMenu] = useState(false)
  const dtMenuRef = useRef(null)
  // ✅ NEW TABLE STATES
  const [tableData, setTableData] = useState([])
  const [showTable, setShowTable] = useState(false)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")

  const pageSize = 20
  
  // NEW: Sidebar width state
  const [sidebarWidth, setSidebarWidth] = useState(320) // Default 320px (80rem = w-80)
  const [isResizing, setIsResizing] = useState(false)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const accountMenuRef = useRef(null)
  const sidebarRef = useRef(null)

  async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('authToken')
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

  // ✅ LOAD REDIS TABLE FUNCTION
  const loadRedisTable = useCallback(async (conversationId) => {
    try {
      const res = await apiFetch(`${API_URL}/api/data/${conversationId}`)
      const json = await res.json()

      if (json.success && json.data && json.data.length > 30) {
        setTableData(json.data)
        setShowTable(true)
        toast.success(`Loaded ${json.data.length} records ✅`)
      } else {
        setShowTable(false)
        setTableData([])
      }
    } catch (err) {
      console.error("Failed to load Redis table:", err)
    }
  }, [])

  // ✅ SEARCH FILTER LOGIC
  const filteredTable = tableData.filter((row) =>
    Object.values(row)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  // ✅ PAGINATION LOGIC
  const totalPages = Math.ceil(filteredTable.length / pageSize)
  const paginatedData = filteredTable.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  // ✅ RESET PAGE WHEN SEARCHING
  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  // NEW: Handle sidebar resize
  const handleMouseDown = useCallback((e) => {
    setIsResizing(true)
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return
    
    const newWidth = e.clientX
    if (newWidth >= 240 && newWidth <= 500) { // Min 240px, Max 500px
      setSidebarWidth(newWidth)
    }
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleFileSelect = useCallback(async (file) => {
    setSelectedFile(file)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('authToken')
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
          
          // ✅ Reset table when deleting current conversation
          setTableData([])
          setShowTable(false)
          setPage(1)
          setSearchTerm("")
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

    const query = searchQuery.toLowerCase().trim()
    
    return conversations.filter(conv => {
      // Check title first
      if (conv.title && conv.title !== 'New Chat') {
        if (conv.title.toLowerCase().includes(query)) {
          return true
        }
      }
      
      // Check first message
      if (conv.first_message) {
        if (conv.first_message.toLowerCase().includes(query)) {
          return true
        }
      }
      
      // Check if "New Chat" matches
      if ('new chat'.includes(query)) {
        return true
      }
      
      return false
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
        
        //  Try to load table data if available
        loadRedisTable(conversationId)
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
      toast.error('Failed to load conversation')
    }
  }, [loadRedisTable])

  // NEW: Load last conversation on mount
  useEffect(() => {
    if (mounted && user) {
      loadConversations().then(() => {
        const lastConvId = localStorage.getItem('currentConversationId')
        if (lastConvId) {
          loadConversation(lastConvId)
        }
      })
    }
  }, [mounted, user, loadConversations, loadConversation])

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
    const token = localStorage.getItem("authToken")
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
        localStorage.removeItem("authToken")
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
      if (dtMenuRef.current && !dtMenuRef.current.contains(event.target)) {
        setShowDTMenu(false)
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
    localStorage.removeItem("authToken")
    localStorage.removeItem("currentConversationId")
    setUser(null)
    setShowAccountMenu(false)
    toast.success("Logged out successfully")
    router.replace("/login")
  }

 function addBotMessage(text, fileInfo = null, actualData = null, actualCount = 0) {
  setMessages((m) => [...m, { 
    role: 'assistant', 
    text, 
    fileUrl: fileInfo?.fileUrl, 
    fileName: fileInfo?.fileName, 
    fileFormat: fileInfo?.fileFormat,
    actualData: actualData,  // ✅ NEW
    actualCount: actualCount  // ✅ NEW
  }])
}
  function updateLastBotMessage(text, fileInfo = null, actualData = null, actualCount = 0) {
  setMessages((m) => {
    const newMessages = [...m]
    const lastMsg = newMessages[newMessages.length - 1]
    if (lastMsg?.role === 'assistant') {
      lastMsg.text = text
      if (fileInfo) {
        lastMsg.fileUrl = fileInfo.fileUrl
        lastMsg.fileName = fileInfo.fileName
        lastMsg.fileFormat = fileInfo.fileFormat
      }
      // ✅ NEW: Store actual data
      if (actualData) {
        lastMsg.actualData = actualData
        lastMsg.actualCount = actualCount
      }
    } else {
      newMessages.push({ 
        role: 'assistant', 
        text, 
        fileUrl: fileInfo?.fileUrl, 
        fileName: fileInfo?.fileName, 
        fileFormat: fileInfo?.fileFormat,
        actualData: actualData,  // ✅ NEW
        actualCount: actualCount  // ✅ NEW
      })
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

    const token = localStorage.getItem("authToken")
    const eventSource = new EventSource(`${API_URL}/api/chat/stream/${conversationId}?token=${token}`)

    let assistantText = ""
    let fileInfo = null
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
    
    if (data.fileInfo) {
      fileInfo = data.fileInfo
    }
    
    // ✅ NEW: Store actual data in message if provided
    if (data.actualData && data.actualData.length > 0) {
      updateLastBotMessage(assistantText, fileInfo, data.actualData, data.actualCount)
    } else {
      updateLastBotMessage(assistantText, fileInfo)
    }
    
    // ✅ Check if we should load table (for large datasets)
    if (data.shouldLoadTable || data.recordCount > 30) {
      loadRedisTable(conversationId)
    }
    
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

    // ✅ CHECK FOR TABLE NAVIGATION COMMANDS
    const lowerPrompt = prompt.trim().toLowerCase()
    
    if (showTable && (lowerPrompt === 'next page' || lowerPrompt === 'next')) {
      if (page < totalPages) {
        setPage(page + 1)
        setMessages((m) => [
          ...m, 
          { role: 'user', text: prompt },
          { role: 'assistant', text: `📄 Showing page ${page + 1} of ${totalPages}` }
        ])
        scrollToBottom(true)
        return
      } else {
        setMessages((m) => [
          ...m, 
          { role: 'user', text: prompt },
          { role: 'assistant', text: `⚠️ You're already on the last page (${totalPages})` }
        ])
        return
      }
    }
    
    if (showTable && (lowerPrompt === 'previous page' || lowerPrompt === 'prev' || lowerPrompt === 'back')) {
      if (page > 1) {
        setPage(page - 1)
        setMessages((m) => [
          ...m, 
          { role: 'user', text: prompt },
          { role: 'assistant', text: `📄 Showing page ${page - 1} of ${totalPages}` }
        ])
        scrollToBottom(true)
        return
      } else {
        setMessages((m) => [
          ...m, 
          { role: 'user', text: prompt },
          { role: 'assistant', text: `⚠️ You're already on the first page` }
        ])
        return
      }
    }
    
    if (showTable && (lowerPrompt.startsWith('page ') || lowerPrompt.startsWith('go to page '))) {
      const pageNum = parseInt(lowerPrompt.replace(/page |go to page /g, ''))
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        setPage(pageNum)
        setMessages((m) => [
          ...m, 
          { role: 'user', text: prompt },
          { role: 'assistant', text: `📄 Showing page ${pageNum} of ${totalPages}` }
        ])
        scrollToBottom(true)
        return
      } else {
        setMessages((m) => [
          ...m, 
          { role: 'user', text: prompt },
          { role: 'assistant', text: `⚠️ Invalid page number. Please choose between 1 and ${totalPages}` }
        ])
        return
      }
    }

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
          message: prompt,
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
        localStorage.removeItem("authToken")
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
    
    // ✅ Reset table state
    setTableData([])
    setShowTable(false)
    setPage(1)
    setSearchTerm("")
    
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

  const filtered = filteredConversations() // Call the function
  const pinnedConversations = filtered.filter(conv => pinnedChats.includes(conv.id))
  const regularConversations = filtered.filter(conv => !pinnedChats.includes(conv.id))

  return (
    <div className="flex h-screen bg-white">
      {/* SIDEBAR WITH RESIZE */}
      <div 
        ref={sidebarRef}
        className={`${showSidebar ? 'flex' : 'hidden'} bg-[#F9FAFB] border-r border-[#E5E7EB] flex-col shadow-sm transition-all duration-300 ease-in-out relative`}
        style={{ width: showSidebar ? `${sidebarWidth}px` : '0' }}
      >
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

        {/* RESIZE HANDLE */}
        {showSidebar && (
          <div
            onMouseDown={handleMouseDown}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#03045E] transition-colors group"
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-1 h-8 bg-[#03045E] rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between shadow-sm relative z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2.5 hover:bg-[#F9FAFB] rounded-xl transition-all"
            >
              <svg viewBox="-0.625 -0.625 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" id="Log-Out--Streamline-Iconoir" height="30" width="30">
                <desc>Log Out Streamline Icon: https://streamlinehq.com</desc>
                <path d="M9.375 9.375h6.596171875m0 0 -2.826953125 2.826953125M15.971171875000001 9.375l-2.826953125 -2.826953125" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25"></path>
                <path d="M15.971171875000001 3.7211718749999996V2.778828125c0 -1.0408593750000001 -0.84375 -1.8846093750000001 -1.8846093750000001 -1.8846093750000001H4.6634375c-1.04078125 0 -1.8846093750000001 0.84375 -1.8846093750000001 1.8846093750000001v13.19234375c0 1.0408593750000001 0.843828125 1.8846093750000001 1.8846093750000001 1.8846093750000001h9.423125c1.0408593750000001 0 1.8846093750000001 -0.84375 1.8846093750000001 -1.8846093750000001v-0.9423437499999999" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25"></path>
              </svg>
            </button>

            <div>
            <div className="flex items-center gap-3">
  
  <div>
  <div className="flex items-center gap-3">
    {/* ✅ PNG Logo */}
    <img
      src="/assets/logo.png"
      alt="DigiTrans Technology Logo"
      width={110}
      height={40}
      className="object-contain"
    />
  </div>
</div>


  {/* ✅ Connected Status (After Logo) */}
  <div className="flex items-center gap-2">
    <div
      className={`w-2 h-2 rounded-full ${
        isConnected ? "bg-green-500" : "bg-red-500"
      } animate-pulse`}
    ></div>

    <span className="text-xs text-[#475569] font-semibold">
      {isConnected ? "Connected" : "Disconnected"}
    </span>
  </div>
</div>
</div>
</div>

          {user && (
            <div className="flex items-center gap-3">
           

<div className="relative z-[100]" ref={dtMenuRef}>
  <button
    onClick={() => setShowDTMenu(!showDTMenu)}
    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-white transition-all"
  >
    <div className="w-9 h-9 rounded-full bg-[#03045E] flex items-center justify-center text-white font-bold text-sm shadow-sm">
      DT
    </div>
    <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {showDTMenu && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E5E7EB] py-2 z-[9999]"
    >
      <div className="px-4 py-2 border-b border-[#E5E7EB]">
        <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">DT Management</p>
      </div>

      {/* Invoice Management */}
      <button
        onClick={() => { router.push('/invoice-management'); setShowDTMenu(false) }}
        className="w-full px-4 py-3 text-left text-sm text-[#475569] hover:text-[#03045E] hover:bg-[#F9FAFB] flex items-center gap-3 transition-all"
      >
        <svg className="w-5 h-5 text-[#03045E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div>
          <div className="font-semibold">Invoice Management</div>
          <div className="text-xs text-[#6B7280]">Manage and track invoices</div>
        </div>
      </button>

      {/* Supplier Log */}
      <button
        onClick={() => { router.push('/supplier-management'); setShowDTMenu(false) }}
        className="w-full px-4 py-3 text-left text-sm text-[#475569] hover:text-[#03045E] hover:bg-[#F9FAFB] flex items-center gap-3 transition-all"
      >
        <svg className="w-5 h-5 text-[#03045E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <div>
          <div className="font-semibold">Supplier Log</div>
          <div className="text-xs text-[#6B7280]">Manage suppliers &amp; contacts</div>
        </div>
      </button>
    </motion.div>
  )}
</div>
     {/* Profile Button */}
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
                      onClick={() => {
                        setShowAccountMenu(false);
                        router.push('/integrations')
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-[#475569] hover:text-[#03045E] hover:bg-[#F9FAFB] flex items-center gap-3 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                      </svg>
                      <div>
                        <div className="font-semibold">Integrations</div>
                        <div className="text-xs text-[#6B7280]">Manage Oracle Fusion connections</div>
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

            </div>
          )}
        </div>

       
        {/* Chat Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto bg-white"
        >
          <div className="px-6 py-6">
            {messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto"
              >
               <motion.div
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
  className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center shadow-md"
>
  <img src="/assets/dt.png" className="w-14 h-14" />
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
  className="grid grid-cols-4 gap-3 w-full max-w-6xl"
>
  {[
    {
      icon: '/assets/show-employee-attrition-trends.png',
      text: 'Show employee attrition trends',
      badge: 'HCM',
      gradient: 'from-blue-500 to-indigo-600'
    },{
      icon: '/assets/invoice.png',
      text: 'Create invoice',
      badge: 'Finance',
      gradient: 'from-teal-500 to-green-600'
    },
    {
      icon: '/assets/supply-chain.png',
      text: 'Analyze supplier performance',
      badge: 'SCM',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      icon: '/assets/generate-financial-reports.png',
      text: 'Generate financial reports',
      badge: 'Finance',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      icon: '/assets/inventory-management.png',
      text: 'Check inventory levels',
      badge: 'Inventory',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      icon: '/assets/show-employee-attrition-trends.png',
      text: 'List employees on leave',
      badge: 'HCM',
      gradient: 'from-cyan-500 to-blue-300'
    },
    {
      icon: '/assets/supply-chain.png',
      text: 'Show all employees',
      badge: 'HCM',
      gradient: 'from-violet-500 to-purple-300'
    },
    
    {
      icon: '/assets/inventory-management.png',
      text: 'Absence report',
      badge: 'Reports',
      gradient: 'from-amber-500 to-orange-600'
    }
  ].map((suggestion, i) => (
    <motion.button
      key={i}
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: 0.6 + i * 0.08,
        type: "spring",
        stiffness: 200,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.05,
        y: -5,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setInput(suggestion.text)}
      className="relative p-4 rounded-2xl text-left transition-all bg-white hover:shadow-2xl border-2 border-[#E5E7EB] hover:border-transparent group overflow-hidden"
    >
      {/* Animated Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${suggestion.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
      
      {/* Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
      </div>
      
      {/* Badge */}
      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-[#03045E] group-hover:bg-white group-hover:text-[#03045E] text-white text-[10px] font-bold rounded-full uppercase tracking-wide shadow-sm transition-all duration-300">
        {suggestion.badge}
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="w-12 h-12 mb-3 rounded-xl bg-gradient-to-br from-[#F9FAFB] to-white group-hover:from-white/20 group-hover:to-white/10 flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-lg">
          <img
            src={suggestion.icon}
            alt={suggestion.text}
            className="w-7 h-7 object-contain group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        <div className="text-xs font-bold text-[#0B132B] group-hover:text-white transition-colors duration-300 leading-snug pr-2 line-clamp-2">
          {suggestion.text}
        </div>
      </div>
      
      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#03045E] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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

                {/* ✅ FIX 2 & 3: TABLE rendered INLINE in chat flow, with close button */}
                {showTable && tableData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                  >
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xl overflow-hidden">
                      {/* Header with Close (X) Button */}
                      <div className="bg-gradient-to-r from-[#03045E] to-[#0B132B] px-6 py-5 relative">
                        {/* ✅ CLOSE BUTTON */}
                        <button
                          onClick={() => { setShowTable(false); setTableData([]); setPage(1); setSearchTerm(""); }}
                          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 transition-all z-10"
                          title="Close table"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        <div className="flex justify-between items-center pr-10">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-white">Full Dataset View</h2>
                              <p className="text-sm text-white/80 mt-0.5">
                                {tableData.length} total records • Showing 7 key columns • Page {page} of {totalPages}
                              </p>
                            </div>
                          </div>
                          <div className="relative">
                            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                              type="text"
                              placeholder="Search records..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-11 pr-4 py-2.5 bg-white border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all w-72 shadow-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Table Body */}
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gradient-to-r from-[#03045E] to-[#0B132B] z-10">
                            <tr>
                              {(() => {
                                const defaultColumns = ["PersonNumber","DisplayName","Email","JobTitle","DepartmentName","HireDate","WorkPhoneNumber"];
                                const columnLabels = {
                                  "PersonNumber": "Employee ID","DisplayName": "Full Name","Email": "Email Address",
                                  "JobTitle": "Job Title","DepartmentName": "Department","HireDate": "Hire Date","WorkPhoneNumber": "Phone"
                                };
                                const availableColumns = defaultColumns.filter(col => tableData[0] && tableData[0].hasOwnProperty(col));
                                return availableColumns.map((key, i) => (
                                  <th key={i} className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider text-white border-r border-white/20 last:border-r-0 whitespace-nowrap">
                                    {columnLabels[key] || key}
                                  </th>
                                ));
                              })()}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-[#E5E7EB]">
                            {paginatedData.map((row, i) => {
                              const defaultColumns = ["PersonNumber","DisplayName","Email","JobTitle","DepartmentName","HireDate","WorkPhoneNumber"];
                              const availableColumns = defaultColumns.filter(col => tableData[0] && tableData[0].hasOwnProperty(col));
                              return (
                                <tr key={i} className="hover:bg-[#F9FAFB] transition-all">
                                  {availableColumns.map((key, j) => {
                                    const value = row[key];
                                    const isEmpty = !value || value === "" || value === null;
                                    return (
                                      <td key={j} className="px-6 py-4 border-r border-[#E5E7EB] last:border-r-0">
                                        {isEmpty ? (
                                          <span className="text-[#9CA3AF] italic text-xs font-medium">N/A</span>
                                        ) : (
                                          <span className="text-[#0B132B] font-medium">{String(value)}</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="bg-gradient-to-r from-[#F9FAFB] to-[#F3F4F6] px-6 py-4 border-t-2 border-[#E5E7EB]">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <button
                              disabled={page === 1}
                              onClick={() => setPage(page - 1)}
                              className="px-5 py-2.5 rounded-xl bg-white border-2 border-[#E5E7EB] font-semibold text-[#475569] hover:border-[#03045E] hover:text-[#03045E] hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Previous
                            </button>
                            <div className="flex items-center gap-2">
                              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                const pageNum = page <= 3 ? i + 1 : page - 2 + i;
                                if (pageNum > totalPages) return null;
                                return (
                                  <button
                                    key={i}
                                    onClick={() => setPage(pageNum)}
                                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                                      page === pageNum
                                        ? 'bg-[#03045E] text-white shadow-lg scale-110'
                                        : 'bg-white text-[#475569] hover:bg-[#F9FAFB] border-2 border-[#E5E7EB] hover:border-[#03045E]'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                              {totalPages > 5 && page < totalPages - 2 && (
                                <>
                                  <span className="text-[#6B7280] px-2 font-bold">...</span>
                                  <button
                                    onClick={() => setPage(totalPages)}
                                    className="w-10 h-10 rounded-xl bg-white text-[#475569] hover:bg-[#F9FAFB] border-2 border-[#E5E7EB] hover:border-[#03045E] font-bold text-sm transition-all"
                                  >
                                    {totalPages}
                                  </button>
                                </>
                              )}
                            </div>
                            <button
                              disabled={page === totalPages}
                              onClick={() => setPage(page + 1)}
                              className="px-5 py-2.5 rounded-xl bg-[#03045E] text-white font-semibold hover:opacity-90 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                              Next
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-[#475569]">
                              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, filteredTable.length)} of {filteredTable.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Command Helper */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-t-2 border-blue-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#03045E] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#03045E] mb-1">💬 Navigation Commands:</div>
                              <div className="flex items-center gap-2 text-xs text-[#475569]">
                                <code className="px-3 py-1.5 bg-white rounded-lg font-mono border-2 border-[#E5E7EB] font-semibold">next page</code>
                                <code className="px-3 py-1.5 bg-white rounded-lg font-mono border-2 border-[#E5E7EB] font-semibold">previous page</code>
                                <code className="px-3 py-1.5 bg-white rounded-lg font-mono border-2 border-[#E5E7EB] font-semibold">page 5</code>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-[#6B7280] italic">
                            💡 Ask for specific fields to see more columns
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isTyping && (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 20 }}
    className="flex gap-4"
  >
    {/* Logo Avatar */}
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
      className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden border border-[#E5E7EB]"
    >
      <img src="/assets/dt.png" alt="DT" className="w-8 h-8 object-contain" />
    </motion.div>

    {/* Typing Bubble */}
    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-5 py-4 shadow-sm flex items-center gap-3">
      
      {/* Thunder Lightning Animation */}
      <motion.div
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.7, 1, 0.7],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 0.8, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="text-[#03045E]"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 0L0 13h9l-2 11 13-13h-9z"/>
        </svg>
      </motion.div>

      {/* Bouncing Dots */}
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

      {/* Thinking Text */}
      <motion.span
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-xs text-[#6B7280] font-medium"
      >
        Thinking...
      </motion.span>
    </div>
  </motion.div>
)}
              </div>
            )}
          </div>
          {/* ✅ CRITICAL: SCROLL ANCHOR AT THE VERY END */}
          <div ref={messagesEndRef} className="h-1" />
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
        <div className="bg-white border-t border-[#E5E7EB] px-6 py-4 shadow-sm sticky bottom-0 z-50">
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
               AI can make mistakes. Check important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
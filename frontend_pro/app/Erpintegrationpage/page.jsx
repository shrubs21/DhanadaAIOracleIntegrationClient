'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export default function ERPIntegrationPage() {
  const router = useRouter()

  const [user, setUser]                     = useState(null)
  const [loading, setLoading]               = useState(true)
  const [connected, setConnected]           = useState(false)
  const [connectedAt, setConnectedAt]       = useState(null)
  const [savedBaseUrl, setSavedBaseUrl]     = useState('')
  const [savedUsername, setSavedUsername]   = useState('')

  const [showModal, setShowModal]           = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [savingInstance, setSavingInstance] = useState(false)
  const [showPassword, setShowPassword]     = useState(false)

  const [formData, setFormData] = useState({
    base_url: '',
    username: '',
    password: '',
  })

  const token = () => localStorage.getItem('authToken')

  // ── Auth + load ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('authToken')
    if (!t) { router.replace('/login'); return }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setUser(data)
        setLoading(false)
        if (data) loadCredentials()
      })
      .catch(() => {
        localStorage.removeItem('authToken')
        router.replace('/login')
      })
  }, [router])

  const loadCredentials = async () => {
    try {
      const res = await fetch(`${API_URL}/api/oracle/erp`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.connected) {
          setConnected(true)
          setSavedBaseUrl(data.base_url || '')
          setSavedUsername(data.username || '')
          setConnectedAt(data.connected_at || null)
          setFormData(f => ({ ...f, base_url: data.base_url || '', username: data.username || '' }))
        }
      }
    } catch (e) {
      console.error('Failed to load ERP credentials:', e)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleTestConnection = async () => {
    if (!formData.base_url || !formData.username || !formData.password) {
      toast.error('Please fill in all fields to test connection')
      return
    }
    setTestingConnection(true)
    try {
      const res = await fetch(`${API_URL}/api/oracle/erp/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        toast.success('Connection successful!', {
          style: { borderRadius: '12px', background: '#10B981', color: '#fff' },
        })
      } else {
        const err = await res.json()
        toast.error(err.message || 'Connection failed')
      }
    } catch {
      toast.error('Failed to test connection. Please check your URL and network.')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSaveInstance = async () => {
    if (!formData.base_url || !formData.username || !formData.password) {
      toast.error('Please fill in all required fields')
      return
    }
    setSavingInstance(true)
    try {
      const res = await fetch(`${API_URL}/api/oracle/erp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        toast.success('ERP credentials saved successfully!')
        setConnected(true)
        setSavedBaseUrl(formData.base_url)
        setSavedUsername(formData.username)
        setConnectedAt(new Date().toISOString())
        setShowModal(false)
        setFormData(f => ({ ...f, password: '' }))
      } else {
        const err = await res.json()
        toast.error(err.message || 'Failed to save credentials')
      }
    } catch {
      toast.error('Failed to save credentials')
    } finally {
      setSavingInstance(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-blue-400"></div>
          <p className="text-slate-400 font-medium">Loading credentials...</p>
        </div>
      </div>
    )
  }

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">

      {/* ── Header — matches IntegrationsPage exactly ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/chat')}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-all group"
              >
                <svg className="w-6 h-6 text-slate-600 group-hover:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <img
                  src="https://www.oracle.com/a/ocom/img/oracle-logo.svg"
                  alt="Oracle"
                  className="h-8 w-auto"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Agent Validation Credentials</h1>
                  <p className="text-sm text-slate-600 mt-1">Configure Oracle ERP REST API credentials for agent validation</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {connected ? 'Update Credentials' : 'Add Connection'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Empty state — no connection yet */}
        {!connected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-16 text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">No ERP Connection Yet</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">
              Connect your Oracle Fusion ERP REST API to enable agent validation of business units,
              suppliers, GL accounts, and purchase orders.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all inline-flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Connection
            </button>
          </motion.div>

        ) : (

          // Connected card — matches OIC card style exactly
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-0.5">Oracle ERP</h3>
                      <p className="text-blue-100 text-sm">Fusion Cloud REST API</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowModal(true)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-all"
                    title="Edit Credentials"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs font-semibold text-white uppercase tracking-wide">Active</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Base URL</div>
                  <div className="text-sm text-slate-900 font-mono bg-slate-50 px-4 py-3 rounded-lg border border-slate-200 truncate">
                    {savedBaseUrl}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Username</div>
                  <div className="text-sm text-slate-900 font-mono bg-slate-50 px-4 py-3 rounded-lg border border-slate-200 truncate">
                    {savedUsername}
                  </div>
                </div>

                {/* What agent validates */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Agent Validates</div>
                  <div className="flex flex-wrap gap-2">
                    {['Business Units', 'Suppliers', 'GL Accounts', 'PO Matching', 'Currency Codes', 'GL Periods'].map(item => (
                      <span key={item} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {connectedAt && (
                  <div className="text-xs text-slate-500 pt-3 border-t border-slate-200 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Connected on {new Date(connectedAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* ── Modal — matches AddInstance modal style exactly ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {connected ? 'Update ERP Connection' : 'Add Oracle ERP Connection'}
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Oracle Fusion Cloud REST API credentials for agent validation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6">

                {/* Base URL */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Base URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    name="base_url"
                    value={formData.base_url}
                    onChange={handleInputChange}
                    placeholder="https://your-instance.oraclecloud.com"
                    className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm text-slate-900"
                  />
                 
                </div>

                {/* Credentials Section */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900 mb-1">Secure Authentication</div>
                      <div className="text-xs text-slate-600">
                        Credentials are cached in Redis with a 5-minute TTL and used automatically
                        by the agent for all ERP validation calls.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="oracle.user@company.com"
                        className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder={connected ? 'Enter new password to update' : 'Enter your Oracle password'}
                          className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 pr-12"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 rounded-lg p-2 flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900 mb-1">Test Your Connection</div>
                      <div className="text-xs text-slate-600 mb-3">
                        Verify your credentials before saving. Calls
                        <code className="mx-1 px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">GET /businessUnits?limit=1</code>
                        on your instance.
                      </div>
                      <button
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                        className="px-4 py-2.5 bg-white border-2 border-amber-300 text-amber-700 rounded-lg font-semibold hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-sm"
                      >
                        {testingConnection ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-300 border-t-amber-600"></div>
                            Testing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Test Connection
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-8 py-5 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveInstance}
                  disabled={savingInstance || !formData.base_url || !formData.username || !formData.password}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  {savingInstance ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {connected ? 'Update Connection' : 'Save Connection'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
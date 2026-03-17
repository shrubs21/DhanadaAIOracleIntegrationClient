'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function IntegrationsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [instances, setInstances] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [savingInstance, setSavingInstance] = useState(false)

  const [formData, setFormData] = useState({
    oic_url: '',
    username: '',
    password: ''
  })

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (!token) {
      router.replace("/login")
      return
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data)
        setLoading(false)
        if (data) loadInstances()
      })
      .catch(() => {
        localStorage.removeItem("authToken")
        router.replace("/login")
      })
  }, [router])

  const loadInstances = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${API_URL}/api/oracle/credentials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setInstances(data.instances || [])
      }
    } catch (error) {
      console.error('Failed to load instances:', error)
      toast.error('Failed to load Oracle instances')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleTestConnection = async () => {
    if (!formData.oic_url || !formData.username || !formData.password) {
      toast.error('Please enter OIC URL and credentials to test connection')
      return
    }

    setTestingConnection(true)

    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${API_URL}/api/oracle/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oic_url: formData.oic_url,
          username: formData.username,
          password: formData.password
        })
      })

      if (response.ok) {
        toast.success('Connection successful!', {
          style: {
            borderRadius: '12px',
            background: '#10B981',
            color: '#fff',
          },
        })
      } else {
        const error = await response.json()
        toast.error(error.message || 'Connection failed')
      }
    } catch (error) {
      console.error('Test connection error:', error)
      toast.error('Failed to test connection. Please check your URL and network.')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSaveInstance = async () => {
    if (!formData.oic_url || !formData.username || !formData.password) {
      toast.error('Please fill in all required fields')
      return
    }

    setSavingInstance(true)

    try {
      const token = localStorage.getItem("authToken")

      // Save Oracle OIC credentials (multi-tenant endpoint)
      const response = await fetch(`${API_URL}/api/oracle/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oic_url: formData.oic_url,
          username: formData.username,
          password: formData.password
        })
      })

      if (response.ok) {
        toast.success('Oracle OIC connection saved successfully!')
        setShowAddModal(false)
        setFormData({ oic_url: '', username: '', password: '' })
        loadInstances()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save connection')
      }
    } catch (error) {
      console.error('Save instance error:', error)
      toast.error('Failed to save connection')
    } finally {
      setSavingInstance(false)
    }
  }

  const handleDeleteInstance = async (instanceId) => {
    if (!confirm('Are you sure you want to delete this Oracle OIC connection? Your credentials will be removed.')) return

    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${API_URL}/api/oracle/credentials/${instanceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast.success('Connection deleted successfully')
        loadInstances()
      } else {
        toast.error('Failed to delete connection')
      }
    } catch (error) {
      console.error('Delete instance error:', error)
      toast.error('Failed to delete connection')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
          <p className="text-slate-600 font-medium">Loading integrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* Header */}
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
                {/* Oracle logo from web */}
                <img
                  src="https://www.oracle.com/a/ocom/img/oracle-logo.svg"
                  alt="Oracle"
                  className="h-8 w-auto"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Oracle Integrations</h1>
                  <p className="text-sm text-slate-600 mt-1">Manage your Oracle Integration Cloud (OIC) connections</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Connection
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {instances.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-16 text-center"
          >
            {/* Cloud integration illustration */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <img
                src="https://cdn-icons-png.flaticon.com/512/2621/2621303.png"
                alt="Integration"
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentNode.innerHTML = '<svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>'
                }}
              />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">No OIC Connections Yet</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">
              Connect your Oracle Integration Cloud (OIC) instance to enable AI-powered ERP automation
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all inline-flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Connection
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {instances.map((instance, index) => {
              return (
                <motion.div
                  key={instance.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <img
                          src="https://cdn-icons-png.flaticon.com/512/873/873107.png"
                          alt="Oracle OIC"
                          className="w-9 h-9 object-contain brightness-0 invert"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                        <div>
                          <h3 className="text-xl font-bold text-white mb-0.5">Oracle OIC</h3>
                          <p className="text-blue-100 text-sm">Oracle Integration Cloud</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteInstance(instance.id)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-all"
                        title="Delete Connection"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <div className={`w-2 h-2 rounded-full ${instance.status === 'connected' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                      <span className="text-xs font-semibold text-white uppercase tracking-wide">
                        {instance.status === 'connected' ? 'Active' : 'Disconnected'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">OIC URL</div>
                      <div className="text-sm text-slate-900 font-mono bg-slate-50 px-4 py-3 rounded-lg border border-slate-200 truncate">
                        {instance.oic_url || instance.baseUrl}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Username</div>
                      <div className="text-sm text-slate-900 font-mono bg-slate-50 px-4 py-3 rounded-lg border border-slate-200 truncate">
                        {instance.username}
                      </div>
                    </div>

                    {instance.connectedAt && (
                      <div className="text-xs text-slate-500 pt-3 border-t border-slate-200 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Connected on {new Date(instance.connectedAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Instance Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
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
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/873/873107.png"
                    alt="Oracle"
                    className="w-8 h-8 object-contain"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Add Oracle OIC Connection</h2>
                    <p className="text-sm text-slate-600 mt-0.5">Connect to your Oracle Integration Cloud instance</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6">

                {/* OIC URL */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    OIC URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    name="oic_url"
                    value={formData.oic_url}
                    onChange={handleInputChange}
                    placeholder="https://your-instance.integration.ocp.oraclecloud.com"
                    className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm text-slate-900"
                  />
                  <p className="text-xs text-slate-500 mt-2">Your Oracle Integration Cloud base URL</p>
                </div>

                {/* Credentials Section */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-start gap-3 mb-5">
                    {/* Lock / security icon from web */}
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/3064/3064197.png"
                      alt="Secure"
                      className="w-10 h-10 object-contain flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                    {/* Fallback icon */}
                    <div className="bg-blue-100 rounded-lg p-2 hidden">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900 mb-1">Secure Authentication</div>
                      <div className="text-xs text-slate-600">Your credentials are encrypted and stored securely. LangGraph uses them automatically for all Oracle OIC calls.</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Oracle Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Enter your Oracle username"
                        className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Oracle Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter your Oracle password"
                        className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                  <div className="flex items-start gap-4">
                    {/* Lightning / test icon from web */}
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/1828/1828884.png"
                      alt="Test"
                      className="w-10 h-10 object-contain flex-shrink-0"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900 mb-1">Test Your Connection</div>
                      <div className="text-xs text-slate-600 mb-3">
                        Verify your OIC URL and credentials before saving. Calls <code className="bg-amber-100 px-1 rounded">GET /invoices?limit=1</code> on your instance.
                      </div>
                      <button
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                        className="px-4 py-2.5 bg-white border-2 border-amber-300 text-amber-700 rounded-lg font-semibold hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-sm"
                      >
                        {testingConnection ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-300 border-t-amber-600"></div>
                            Testing Connection...
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
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveInstance}
                  disabled={savingInstance || !formData.oic_url || !formData.username || !formData.password}
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
                      Save Connection
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
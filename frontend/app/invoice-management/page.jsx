'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

const StatusBadge = ({ status }) => {
  const config = {
    PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Paid' },
    UNPAID: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Unpaid' },
    'PARTIALLY PAID': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Partial' },
    COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Completed' },
    PENDING: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400', label: 'Pending' },
    APPROVED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', label: 'Approved' },
  }
  const s = status?.toUpperCase()
  const c = config[s] || config.PENDING
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
      {c.label}
    </span>
  )
}

const InvoiceModal = ({ invoice, onClose }) => {
  if (!invoice) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-[#03045E] to-[#0B132B] px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{invoice.invoice_number}</h2>
                <p className="text-white/70 text-sm mt-0.5">Invoice Details</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gradient-to-r from-[#F0F4FF] to-[#E8F0FE] rounded-xl p-4 border border-[#C7D7FD]">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-[#6B7280] font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-[#03045E]">
                    {invoice.currency} {Number(invoice.amount).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#6B7280] font-medium">Amount Paid</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {invoice.currency} {Number(invoice.amount_paid || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              {invoice.remaining_amount > 0 && (
                <div className="mt-3 pt-3 border-t border-[#C7D7FD]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Remaining</span>
                    <span className="font-semibold text-red-600">
                      {invoice.currency} {Number(invoice.remaining_amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (invoice.amount_paid / invoice.amount) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Supplier', value: invoice.supplier_name },
                { label: 'Business Unit', value: invoice.business_unit_name },
                { label: 'Site', value: invoice.site_name || 'N/A' },
                { label: 'Invoice Type', value: invoice.invoice_type || 'Standard' },
                { label: 'Payment Policy', value: invoice.payment_policy || 'N/A' },
                { label: 'Created', value: new Date(invoice.created_at).toLocaleDateString() },
              ].map((item, i) => (
                <div key={i} className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB]">
                  <p className="text-xs text-[#9CA3AF] font-medium mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-[#0B132B] truncate">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB] flex items-center justify-between">
                <span className="text-xs text-[#9CA3AF] font-medium">Approval Status</span>
                <StatusBadge status={invoice.approval_status || invoice.status} />
              </div>
              <div className="flex-1 bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB] flex items-center justify-between">
                <span className="text-xs text-[#9CA3AF] font-medium">Payment Status</span>
                <StatusBadge status={invoice.payment_status || 'UNPAID'} />
              </div>
            </div>

            {invoice.description && (
              <div className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB]">
                <p className="text-xs text-[#9CA3AF] font-medium mb-1">Description</p>
                <p className="text-sm text-[#475569]">{invoice.description}</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function InvoiceManagementPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState({})
  const [trackedRows, setTrackedRows] = useState({})
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 10

  async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('authToken')
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }
    const response = await fetch(url, { ...options, headers })
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('authToken')
      router.replace('/login')
      throw new Error('Authentication failed')
    }
    return response
  }

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiFetch(`${API_URL}/api/invoices`)
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.invoices || data.data || data.rows || []
        setInvoices(list)
      } else {
        toast.error('Failed to load invoices')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) { router.replace('/login'); return }
    loadInvoices()
  }, [loadInvoices, router])

  const handleTrack = async (invoice) => {
    setTracking(prev => ({ ...prev, [invoice.invoice_number]: true }))
    try {
      const res = await apiFetch(`${API_URL}/api/invoice-status`, {
        method: 'POST',
        body: JSON.stringify({ invoiceNumber: invoice.invoice_number }),
      })
      if (res.ok) {
        const data = await res.json()
        const updated = {
          ...invoice,
          approval_status: data.approvalStatus || data.approval_status,
          payment_status: data.paymentStatus || data.payment_status,
          amount_paid: data.amountPaid || data.amount_paid || 0,
          remaining_amount: data.remainingAmount || data.remaining_amount || invoice.amount,
        }
        setInvoices(prev => prev.map(inv =>
          inv.invoice_number === invoice.invoice_number ? updated : inv
        ))
        setTrackedRows(prev => ({ ...prev, [invoice.invoice_number]: true }))
        setSelectedInvoice(updated)
        toast.success(`Tracked ${invoice.invoice_number}`)
      } else {
        toast.error('Failed to track invoice')
      }
    } catch (err) {
      toast.error('Tracking error')
    } finally {
      setTracking(prev => ({ ...prev, [invoice.invoice_number]: false }))
    }
  }

  const filtered = invoices.filter(inv => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !q ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.supplier_name?.toLowerCase().includes(q) ||
      inv.business_unit_name?.toLowerCase().includes(q)
    const matchesStatus =
      statusFilter === 'ALL' ||
      inv.payment_status?.toUpperCase() === statusFilter ||
      inv.status?.toUpperCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [searchQuery, statusFilter])

  const summary = {
    total: invoices.length,
    paid: invoices.filter(i => i.payment_status?.toUpperCase() === 'PAID').length,
    unpaid: invoices.filter(i => !i.payment_status || i.payment_status?.toUpperCase() === 'UNPAID').length,
    partial: invoices.filter(i => i.payment_status?.toUpperCase() === 'PARTIALLY PAID').length,
  }

  const glassCard = {
    background: 'linear-gradient(135deg, rgba(3,4,94,0.92) 0%, rgba(11,19,43,0.96) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 32px rgba(3,4,94,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
  }

  const summaryCards = [
    {
      label: 'Total Invoices', value: summary.total,
      icon: <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
    {
      label: 'Paid', value: summary.paid,
      icon: <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: 'Unpaid', value: summary.unpaid,
      icon: <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: 'Partial', value: summary.partial,
      icon: <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-40">
        {/* ✅ FIXED: router.push → router.back() */}
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-[#F9FAFB] rounded-xl transition-all border border-transparent hover:border-[#E5E7EB]"
        >
          <svg className="w-5 h-5 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#03045E] rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0B132B]">Invoice Management</h1>
            <p className="text-xs text-[#6B7280]">Oracle ERP · Live Tracking</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          {summaryCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative overflow-hidden rounded-2xl p-5"
              style={glassCard}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.05)', filter: 'blur(12px)' }} />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {card.icon}
                </div>
                <p className="text-3xl font-bold text-white mb-1">{card.value}</p>
                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{card.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex items-center gap-4 shadow-sm"
        >
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by invoice, supplier, business unit..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#03045E] transition-all bg-[#F9FAFB]"
            />
          </div>
          <div className="flex items-center gap-2">
            {['ALL', 'PAID', 'UNPAID', 'PARTIALLY PAID', 'COMPLETED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-[#03045E] text-white shadow-sm'
                    : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6] border border-[#E5E7EB]'
                }`}
              >
                {s === 'ALL' ? 'All' : s === 'PARTIALLY PAID' ? 'Partial' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <span className="text-xs text-[#9CA3AF] font-medium whitespace-nowrap">{filtered.length} results</span>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-[#03045E] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-[#6B7280] font-medium">Loading invoices...</p>
              </div>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-[#F3F4F6] rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[#0B132B] font-semibold">No invoices found</p>
              <p className="text-[#9CA3AF] text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#03045E] to-[#0B132B]">
                      {['Invoice No.', 'Business Unit', 'Supplier', 'Amount', 'Type', 'Approval', 'Payment', 'Date', 'Action'].map((h, i) => (
                        <th key={i} className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/10 last:border-r-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    <AnimatePresence>
                      {paginated.map((inv, i) => (
                        <motion.tr
                          key={inv.invoice_number}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-[#F9FAFB] transition-colors"
                        >
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => trackedRows[inv.invoice_number] && setSelectedInvoice(inv)}
                              className={`font-bold ${trackedRows[inv.invoice_number] ? 'text-[#03045E] hover:underline cursor-pointer' : 'text-[#0B132B] cursor-default'}`}
                            >
                              {inv.invoice_number}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-[#475569] font-medium max-w-[140px] truncate">{inv.business_unit_name}</td>
                          <td className="px-4 py-3.5 text-[#475569] max-w-[150px] truncate">{inv.supplier_name}</td>
                          <td className="px-4 py-3.5 font-bold text-[#0B132B] whitespace-nowrap">
                            {inv.currency} {Number(inv.amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-[#6B7280] text-xs">{inv.invoice_type || 'Standard'}</td>
                          <td className="px-4 py-3.5">
                            {trackedRows[inv.invoice_number]
                              ? <StatusBadge status={inv.approval_status || inv.status || 'COMPLETED'} />
                              : <span className="text-xs text-[#9CA3AF]">—</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            {trackedRows[inv.invoice_number]
                              ? <StatusBadge status={inv.payment_status || 'UNPAID'} />
                              : <span className="text-xs text-[#9CA3AF]">—</span>}
                          </td>
                          <td className="px-4 py-3.5 text-[#9CA3AF] text-xs whitespace-nowrap">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => handleTrack(inv)}
                              disabled={tracking[inv.invoice_number]}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#03045E] hover:bg-[#0B132B] text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              {tracking[inv.invoice_number] ? (
                                <>
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                  Tracking...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  Track
                                </>
                              )}
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-[#F3F4F6] flex items-center justify-between bg-[#FAFAFA]">
                  <span className="text-xs text-[#6B7280] font-medium">
                    Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-white text-[#475569] hover:border-[#03045E] hover:text-[#03045E] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const p = page <= 3 ? i + 1 : page - 2 + i
                      if (p > totalPages) return null
                      return (
                        <button
                          key={i}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            page === p ? 'bg-[#03045E] text-white shadow-sm' : 'bg-white border border-[#E5E7EB] text-[#475569] hover:border-[#03045E]'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    })}
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#03045E] text-white hover:bg-[#0B132B] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {selectedInvoice && (
        <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  )
}
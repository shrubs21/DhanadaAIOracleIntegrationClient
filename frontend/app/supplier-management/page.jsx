'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

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

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Active:   { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    Inactive: { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
    Pending:  { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  }
  const s = map[status] || map.Pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status || 'Pending'}
    </span>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function SupplierManagementPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortField, setSortField] = useState('supplier_name')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [viewMode, setViewMode] = useState('table')
  const pageSize = 15

  // ─── FETCH ──────────────────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        search: searchQuery,
        status: statusFilter !== 'All' ? statusFilter : '',
        category: categoryFilter !== 'All' ? categoryFilter : '',
        sortField,
        sortDir
      })
      const res = await apiFetch(`${API_URL}/api/suppliers?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setSuppliers(data)
          setTotalCount(data.length)
        } else {
          setSuppliers(data.suppliers || data.data || [])
          setTotalCount(data.total || data.count || 0)
        }
      }
    } catch (e) {
      console.error('Failed to fetch suppliers:', e)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery, statusFilter, categoryFilter, sortField, sortDir])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])
  useEffect(() => { setPage(1) }, [searchQuery, statusFilter, categoryFilter])

  // ─── SORT ────────────────────────────────────────────────────────────────────
  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }) => (
    <svg
      className={`w-3.5 h-3.5 transition-all ${sortField === field ? 'text-white' : 'text-white/30'}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d={sortField === field && sortDir === 'desc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
    </svg>
  )

  // ─── DERIVED ─────────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const categories = ['All', ...new Set(suppliers.map(s => s.category).filter(Boolean))]

  const columns = [
    { key: 'supplier_name', label: 'Supplier',  sortable: true  },
    { key: 'contact_name',  label: 'Contact',   sortable: true  },
    { key: 'email',         label: 'Email',     sortable: false },
    { key: 'phone',         label: 'Phone',     sortable: false },
    { key: 'category',      label: 'Category',  sortable: true  },
    { key: 'country',       label: 'Country',   sortable: true  },
    { key: 'payment_terms', label: 'Terms',     sortable: false },
    { key: 'status',        label: 'Status',    sortable: true  },
  ]

  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      {/* ── TOP NAV ── */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center gap-3 shadow-sm sticky top-0 z-50">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-[#F9FAFB] rounded-xl transition-all"
          title="Back to chat"
        >
          <svg className="w-5 h-5 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="w-px h-6 bg-[#E5E7EB]" />

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#03045E] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0B132B]">Supplier Management</h1>
            <p className="text-xs text-[#6B7280] font-medium">Oracle SCM · Supplier Log</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-screen-2xl mx-auto space-y-4">

        {/* ── FILTERS BAR ── */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search suppliers, contacts, email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#03045E] transition-all bg-[#F9FAFB]"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5">
            {['All', 'Active', 'Inactive', 'Pending'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-[#03045E] text-white shadow-sm'
                    : 'bg-[#F9FAFB] text-[#475569] hover:bg-white border border-[#E5E7EB]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Category */}
          {categories.length > 1 && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#475569] focus:outline-none focus:border-[#03045E] bg-[#F9FAFB] font-medium transition-all"
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          )}

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-1 ml-auto">
            {[
              { mode: 'table', d: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
              { mode: 'card',  d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
            ].map(({ mode, d }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-[#03045E] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#03045E]'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* ── TABLE VIEW ── */}
        {viewMode === 'table' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-[#03045E] to-[#0B132B]">
                    {columns.map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && toggleSort(col.key)}
                        className={`px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/10 last:border-r-0 ${col.sortable ? 'cursor-pointer hover:bg-white/5 transition-colors select-none' : ''}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.label}
                          {col.sortable && <SortIcon field={col.key} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {columns.map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 bg-[#F3F4F6] rounded-lg" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-5 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-[#F3F4F6] rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                            </svg>
                          </div>
                          <div className="font-semibold text-[#6B7280]">No suppliers found</div>
                          <div className="text-xs text-[#9CA3AF]">Try adjusting your search or filters</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((s, i) => (
                      <motion.tr
                        key={s.id || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-[#F9FAFB] transition-colors"
                      >
                        {/* Supplier */}
                        <td className="px-5 py-3.5 border-r border-[#E5E7EB]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#03045E] to-[#0B132B] flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">
                                {(s.supplier_name || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-[#0B132B] text-sm">{s.supplier_name}</div>
                              {s.website && (
                                <div className="text-xs text-[#6B7280] truncate max-w-[180px]">{s.website}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-3.5 border-r border-[#E5E7EB] text-[#475569]">
                          {s.contact_name || <span className="text-[#9CA3AF] italic text-xs">N/A</span>}
                        </td>

                        {/* Email */}
                        <td className="px-5 py-3.5 border-r border-[#E5E7EB]">
                          {s.email
                            ? <a href={`mailto:${s.email}`} className="text-[#03045E] hover:underline text-sm">{s.email}</a>
                            : <span className="text-[#9CA3AF] italic text-xs">N/A</span>
                          }
                        </td>

                        {/* Phone */}
                        <td className="px-5 py-3.5 border-r border-[#E5E7EB] text-[#475569]">
                          {s.phone || <span className="text-[#9CA3AF] italic text-xs">N/A</span>}
                        </td>

                        {/* Category */}
                        <td className="px-5 py-3.5 border-r border-[#E5E7EB]">
                          {s.category
                            ? <span className="px-2.5 py-1 bg-[#F0F4FF] text-[#03045E] rounded-full text-xs font-semibold">{s.category}</span>
                            : <span className="text-[#9CA3AF] italic text-xs">N/A</span>
                          }
                        </td>

                        {/* Country */}
                        <td className="px-5 py-3.5 border-r border-[#E5E7EB] text-[#475569]">
                          {s.country || <span className="text-[#9CA3AF] italic text-xs">N/A</span>}
                        </td>

                        {/* Terms */}
                        <td className="px-5 py-3.5 border-r border-[#E5E7EB] text-[#475569] text-xs font-medium">
                          {s.payment_terms || '–'}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <StatusBadge status={s.status} />
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── PAGINATION ── */}
            <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
              <span className="text-sm text-[#6B7280] font-medium">
                {loading
                  ? 'Loading...'
                  : `Showing ${totalCount === 0 ? 0 : ((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount} suppliers`
                }
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E5E7EB] text-sm font-semibold text-[#475569] hover:border-[#03045E] hover:text-[#03045E] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </button>

                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pn = page <= 3 ? i + 1 : page - 2 + i
                  if (pn > totalPages) return null
                  return (
                    <button
                      key={i}
                      onClick={() => setPage(pn)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                        page === pn
                          ? 'bg-[#03045E] text-white shadow'
                          : 'bg-white border border-[#E5E7EB] text-[#475569] hover:border-[#03045E]'
                      }`}
                    >
                      {pn}
                    </button>
                  )
                })}

                <button
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl bg-[#03045E] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── CARD VIEW ── */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-[#E5E7EB] animate-pulse">
                  <div className="h-12 bg-[#F3F4F6] rounded-xl mb-4" />
                  <div className="h-4 bg-[#F3F4F6] rounded mb-2 w-3/4" />
                  <div className="h-3 bg-[#F3F4F6] rounded w-1/2" />
                </div>
              ))
            ) : suppliers.length === 0 ? (
              <div className="col-span-full text-center py-16 text-[#6B7280] font-semibold">No suppliers found</div>
            ) : (
              suppliers.map((s, i) => (
                <motion.div
                  key={s.id || i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#03045E] to-[#0B132B] flex items-center justify-center shadow-sm flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {(s.supplier_name || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#0B132B] text-sm leading-tight truncate">{s.supplier_name}</div>
                        {s.category && <span className="text-xs text-[#03045E] font-semibold">{s.category}</span>}
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  <div className="space-y-2">
                    {[
                      { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', val: s.contact_name },
                      { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', val: s.email },
                      { icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', val: s.phone },
                      { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', val: [s.city, s.country].filter(Boolean).join(', ') || null },
                    ].map(({ icon, val }, j) => val && (
                      <div key={j} className="flex items-center gap-2 text-xs text-[#475569]">
                        <svg className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                        </svg>
                        <span className="truncate">{val}</span>
                      </div>
                    ))}
                    {s.payment_terms && (
                      <div className="pt-1">
                        <span className="px-2.5 py-1 bg-[#F0F4FF] text-[#03045E] rounded-full text-xs font-semibold">
                          💳 {s.payment_terms}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
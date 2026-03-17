'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function Footer() {
  const [email, setEmail] = useState('')

  const links = [
    { label: 'Documentation', href: 'https://docs.oracle.com/en/' },
    { label: 'API', href: 'https://docs.oracle.com/en/cloud/saas/index.html' },
    { label: 'Support', href: 'https://support.oracle.com/' },
    { label: 'Privacy', href: 'https://www.oracle.com/legal/privacy/' }
  ]

  const handleNewsletterSubmit = (e) => {
    e.preventDefault()
    toast.success('Feature coming soon!', {
      duration: 3000,
      style: {
        background: '#03045E',
        color: '#fff',
        fontWeight: '600',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(3, 4, 94, 0.2)'
      }
    })
    setEmail('')
  }

  return (
    <footer className="relative mt-24 border-t-2 border-[#03045E] bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              {/* DT logo with spinning ring */}
              <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(#00C853, #03045E, #00C853)',
                    animation: 'ft-spin 3s linear infinite'
                  }}
                />
                <div
                  className="absolute w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#03045E' }}
                >
                  <img src="/assets/dt.png" alt="DT" className="w-6 h-6 object-contain" />
                </div>
              </div>

              {/* DT Technology text */}
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-lg" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '0.01em' }}>
                  <span style={{ color: '#0B132B' }}>D</span>
                  <span style={{ color: '#00C853' }}>T</span>
                </span>
                <span className="text-[0.58rem] font-medium tracking-widest uppercase text-[#94a3b8]">
                  Technology
                </span>
              </div>
            </div>

            <p className="text-[#475569] text-sm leading-relaxed">
              Built for Oracle HCM, SCM, ERP, and Financials integrations with AI-powered intelligence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[#0B132B] font-semibold mb-3 border-b-2 border-[#03045E] pb-1 inline-block">Quick Links</h4>
            <div className="flex flex-col gap-2 mt-2">
              {links.map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#475569] hover:text-[#03045E] text-sm transition-all duration-300 hover:translate-x-1 inline-flex items-center gap-1 font-medium group"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300"
                    style={{ background: '#00C853' }}
                  />
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-[#0B132B] font-semibold mb-3 border-b-2 border-[#03045E] pb-1 inline-block">Stay Updated</h4>
            <p className="text-xs text-[#94a3b8] mb-3 mt-2">Get the latest updates from DT Technology.</p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[#0B132B] placeholder-[#6B7280] bg-[#F9FAFB] border-2 border-[#E5E7EB] focus:outline-none focus:border-[#03045E] transition-all"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:opacity-90 hover:scale-105"
                style={{ background: '#03045E' }}
              >
                →
              </button>
            </form>
          </div>
        </div>

        {/* Divider with green accent */}
        <div className="relative h-px mb-6" style={{ background: '#E5E7EB' }}>
          <div className="absolute left-0 top-0 h-full w-24" style={{ background: '#00C853' }} />
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#475569]">
          <p className="font-medium">
            © 2026 <span style={{ color: '#03045E', fontWeight: 700 }}>DT Technology</span>. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Terms', 'Privacy', 'Cookies'].map((item, i) => (
              <a
                key={i}
                href={
                  item === 'Terms' ? 'https://www.oracle.com/legal/terms.html'
                  : item === 'Privacy' ? 'https://www.oracle.com/legal/privacy/'
                  : 'https://www.oracle.com/legal/privacy/cookies.html'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#03045E] transition-colors duration-300 font-medium relative group"
              >
                {item}
                <span
                  className="absolute -bottom-0.5 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300"
                  style={{ background: '#00C853' }}
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Spin animation */}
      <style jsx>{`
        @keyframes ft-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </footer>
  )
}
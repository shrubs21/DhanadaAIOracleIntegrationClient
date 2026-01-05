// Footer.jsx (Error-free version)
'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function Footer() {
  const [email, setEmail] = useState('')

  const links = [
    {
      label: 'Documentation',
      href: 'https://docs.oracle.com/en/'
    },
    {
      label: 'API',
      href: 'https://docs.oracle.com/en/cloud/saas/index.html'
    },
    {
      label: 'Support',
      href: 'https://support.oracle.com/'
    },
    {
      label: 'Privacy',
      href: 'https://www.oracle.com/legal/privacy/'
    }
  ]

  const handleNewsletterSubmit = (e) => {
    e.preventDefault()
    toast.success('Feature coming soon! ', {
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
    <footer className="relative mt-24 border-t border-[#E5E7EB] bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-sm bg-[#03045E]"
              >
                <span className="text-[10px]">Oracle</span>
              </div>
              <span className="font-semibold text-[#0B132B]">AI Oracle Assistant</span>
            </div>
            <p className="text-[#475569] text-sm leading-relaxed">
              Built for Oracle HCM, SCM, ERP, and Financials integrations with AI-powered intelligence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[#0B132B] font-semibold mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2">
            {links.map((link, i) => (
  <a
    key={i}
    href={link.href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-[#475569] hover:text-[#03045E] text-sm transition-all duration-300 hover:translate-x-1 inline-block font-medium"
  >
    {link.label}
  </a>
))}

            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-[#0B132B] font-semibold mb-3">Stay Updated</h4>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[#0B132B] placeholder-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] focus:outline-none focus:border-[#03045E] transition-all"
              />
              <button 
                type="submit"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#03045E] hover:opacity-90 transition-all duration-300"
              >
                →
              </button>
            </form>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-6 bg-[#E5E7EB]" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#475569]">
          <p className="font-medium">© 2026 AI Oracle Assistant. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a 
              href="https://www.oracle.com/legal/terms.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-[#03045E] transition-colors duration-300 font-medium"
            >
              Terms
            </a>
            <a 
              href="https://www.oracle.com/legal/privacy/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-[#03045E] transition-colors duration-300 font-medium"
            >
              Privacy
            </a>
            <a 
              href="https://www.oracle.com/legal/privacy/cookies.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-[#03045E] transition-colors duration-300 font-medium"
            >
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
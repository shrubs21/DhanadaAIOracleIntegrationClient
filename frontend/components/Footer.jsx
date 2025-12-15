export default function Footer() {
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

  return (
    <footer className="relative mt-24 border-t" style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}>
      {/* Gradient Glow at Top */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5) 30%, rgba(236, 72, 153, 0.5) 50%, rgba(59, 130, 246, 0.5) 70%, transparent)'
        }}
      />
      
      {/* Glassmorphic Background */}
      <div 
        className="relative"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)'
                  }}
                >
                  <span className="text-[10px]">Oracle</span>
                </div>
                <span className="font-semibold text-gray-900">AI Oracle Assistant</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Built for Oracle HCM, SCM, ERP, and Financials integrations with AI-powered intelligence.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-3">Quick Links</h4>
              <div className="flex flex-col gap-2">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-purple-600 text-sm transition-all duration-300 hover:translate-x-1 inline-block font-medium"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-3">Stay Updated</h4>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  }}
                />
                <button 
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)',
                    boxShadow: '0 4px 16px rgba(168, 85, 247, 0.3)'
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div 
            className="h-px mb-6"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1) 50%, transparent)'
            }}
          />

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <p className="font-medium">© 2026 AI Oracle Assistant. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="https://www.oracle.com/legal/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors duration-300 font-medium">Terms</a>
              <a href="https://www.oracle.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors duration-300 font-medium">Privacy</a>
              <a href="https://www.oracle.com/legal/privacy/cookies.html" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors duration-300 font-medium">Cookies</a>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle bottom glow */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at bottom, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
          filter: 'blur(30px)'
        }}
      />
    </footer>
  )
}
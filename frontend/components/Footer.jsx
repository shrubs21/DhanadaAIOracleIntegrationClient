export default function Footer(){
  const links = [
    { label: 'Documentation', href: '/docs' },
    { label: 'API', href: '/api' },
    { label: 'Support', href: '/support' },
    { label: 'Privacy', href: '/privacy' }
  ]

  return (
    <footer className="relative mt-24 border-t border-white/10">
      {/* Gradient Glow at Top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
      
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-400 flex items-center justify-center text-black font-bold text-sm">
                AI
              </div>
              <span className="font-semibold text-white">AI Oracle Assistant</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Built for Oracle HCM/SCM/ERP/Financials integrations with AI-powered intelligence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {links.map((link, i) => (
                <a 
                  key={i}
                  href={link.href}
                  className="text-gray-400 hover:text-white text-sm transition-colors duration-300 hover:translate-x-1 inline-block"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-semibold mb-3">Stay Updated</h4>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300">
                →
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <p>© 2026 AI Oracle Assistant. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors duration-300">Terms</a>
            <a href="#" className="hover:text-white transition-colors duration-300">Privacy</a>
            <a href="#" className="hover:text-white transition-colors duration-300">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
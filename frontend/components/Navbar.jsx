'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const userName = "Chandhresh"
  const userInitial = userName.charAt(0).toUpperCase()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem("loggedIn")
      setIsLoggedIn(stored === "true")
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEsc)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [menuOpen])

  const handleLogout = () => {
    localStorage.removeItem("loggedIn")
    setIsLoggedIn(false)
    setMenuOpen(false)
    window.location.href = "/login"
  }

  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <div className="pointer-events-auto w-full max-w-6xl">
        <nav 
          className="group rounded-2xl px-6 py-3 flex items-center justify-between transition-all duration-500 hover:shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 32px rgba(3, 4, 94, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.5)'
          }}
        >
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 no-underline group/logo">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden transition-transform duration-300 group-hover/logo:scale-110"
              style={{ background: '#03045E' }}
            >
              {/* Animated Tech Pattern */}
              <div className="absolute inset-0 opacity-30 animate-pulse" 
                   style={{ 
                     backgroundImage: `radial-gradient(#ffffff 0.8px, transparent 0.8px)`, 
                     backgroundSize: '6px 6px' 
                   }}>
              </div>
              
              <span className="text-white font-black text-sm relative z-10 tracking-tighter">
                DT
              </span>
              
              {/* Glossy Reflection Effect */}
              <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/20 to-transparent"></div>
            </div>

            <div className="flex flex-col">
              <span className="text-xl font-black text-[#03045E] tracking-tighter leading-none transition-colors group-hover/logo:text-[#023E8A]">
                DigiTrans
              </span>
              <div className="h-[2px] w-0 bg-[#03045E] transition-all duration-300 group-hover/logo:w-full mt-1"></div>
            </div>
          </Link>

          {/* Action Section */}
          <div className="flex items-center gap-4 relative" ref={menuRef}>
            {!isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-5 py-2 text-[#03045E] font-semibold rounded-xl hover:bg-[#03045E]/5 transition-all duration-300"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className="px-6 py-2.5 rounded-xl text-white font-bold transition-all duration-300 shadow-[0_4px_14px_0_rgba(3,4,94,0.39)] hover:shadow-[0_6px_20px_rgba(3,4,94,0.23)] hover:scale-[1.02] active:scale-95"
                  style={{ background: '#03045E' }}
                >
                  Get Started
                </Link>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 shadow-lg hover:ring-4 hover:ring-[#03045E]/10 scale-100 active:scale-90"
                  style={{ 
                    background: 'linear-gradient(135deg, #03045E 0%, #023E8A 100%)' 
                  }}
                >
                  {userInitial}
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div 
                    className="absolute right-0 mt-4 w-56 rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in duration-200"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(3, 4, 94, 0.1)',
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    <div className="px-5 py-4 border-b border-slate-100">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Signed in as</p>
                      <p className="text-[#03045E] font-bold truncate">{userName}</p>
                    </div>

                    <div className="p-2">
                      <Link
                        href="/account"
                        className="flex items-center px-4 py-3 text-sm text-slate-600 font-medium rounded-xl hover:bg-[#03045E]/5 hover:text-[#03045E] transition-all"
                      >
                        Account Settings
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-3 text-sm text-red-500 font-bold rounded-xl hover:bg-red-50 transition-all"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
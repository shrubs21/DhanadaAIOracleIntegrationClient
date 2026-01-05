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

  // Close menu on outside click
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
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-6xl px-4">

        <nav 
          className="rounded-2xl px-6 py-3 flex items-center justify-between shadow-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(229, 231, 235, 0.8)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
          }}
        >

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: '#03045E' }}
            >
              <span className="text-white font-bold text-[11px]">Oracle</span>
            </div>
            <div className="text-lg font-semibold text-[#0B132B]">
              AI Oracle Assistant 
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4 relative" ref={menuRef}>

            {/* Not logged in */}
            {!isLoggedIn && (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-[#0B132B] rounded-md hover:bg-white/60 transition-all duration-300"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className="px-4 py-2 rounded-md text-white hover:opacity-90 transition shadow-sm"
                  style={{ background: '#03045E' }}
                >
                  Register
                </Link>
              </>
            )}

            {/* Logged in */}
            {isLoggedIn && (
              <div className="relative">

                {/* Avatar */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-10 h-10 rounded-full flex items-center justify-center
                             text-white font-semibold transition hover:scale-105 shadow-sm"
                  style={{ background: '#03045E' }}
                >
                  {userInitial}
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div 
                    className="absolute right-0 mt-3 w-44 rounded-xl overflow-hidden z-50 shadow-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(229, 231, 235, 0.8)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                    }}
                  >

                    <div 
                      className="px-4 py-3 border-b text-[#0B132B] font-medium"
                      style={{ borderColor: 'rgba(229, 231, 235, 0.5)' }}
                    >
                      {userName}
                    </div>

                    <Link
                      href="/account"
                      className="block px-4 py-3 text-[#475569] hover:bg-white/60 transition-all duration-300"
                    >
                      Account Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-[#475569] hover:bg-white/60 transition-all duration-300"
                    >
                      Logout
                    </button>
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
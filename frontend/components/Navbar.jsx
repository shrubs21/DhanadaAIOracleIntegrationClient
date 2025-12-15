'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Navbar() {
  
  // Load login state from localStorage (persistent)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Dummy user name (later will come from backend)
  const userName = "Chandhresh"
  const userInitial = userName.charAt(0).toUpperCase()

  // Load login state on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem("loggedIn")
      setIsLoggedIn(stored === "true")
    }
  }, [])

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("loggedIn")
    setIsLoggedIn(false)
    setMenuOpen(false)
    window.location.href = "/login" // redirect
  }

  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-6xl px-4">

        <nav className="backdrop-blur-md bg-white/50 border border-white/80 rounded-2xl px-6 py-3
                        flex items-center justify-between shadow-xl">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)'
              }}
            >
              <span className="text-white font-bold text-[11px]">Oracle</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">AI Oracle Assistant</div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4 relative">

            {/* If NOT logged in: show login/register */}
            {!isLoggedIn && (
              <>
                <Link 
                  href="/login"
                  className="px-4 py-2 text-gray-900 rounded-md hover:bg-white/30 transition"
                >
                  Login
                </Link>

                <Link 
                  href="/register"
                  className="px-4 py-2 rounded-md text-white hover:brightness-110 transition"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)'
                  }}
                >
                  Register
                </Link>
              </>
            )}

            {/* If logged in: show avatar */}
            {isLoggedIn && (
              <div className="relative">

                {/* Avatar button */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold hover:scale-105 transition"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(59, 130, 246, 1) 100%)'
                  }}
                >
                  {userInitial}
                </button>

                {/* Dropdown menu */}
                {menuOpen && (
                  <div className="absolute right-0 mt-3 w-44 bg-white shadow-xl rounded-xl 
                                  border border-gray-200 backdrop-blur-md overflow-hidden z-50">

                    <div className="px-4 py-3 border-b text-gray-900 font-medium">
                      {userName}
                    </div>

                    <Link 
                      href="/account"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100 transition"
                    >
                      Account Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition"
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
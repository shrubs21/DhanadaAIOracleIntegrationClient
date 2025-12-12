'use client'
import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-6xl px-4">
        <nav className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center justify-between shadow-xl">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-400 flex items-center justify-center text-black font-bold">
              AI
            </div>
            <div className="text-lg font-semibold">AI Oracle Assistant</div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-4">
            <Link 
              href="/login"
              className="px-4 py-2 rounded-md hover:bg-white/10 transition"
            >
              Login
            </Link>

            <Link 
              href="/register"
              className="px-4 py-2 rounded-md bg-purple-600 hover:brightness-110 transition"
            >
              Register
            </Link>
          </div>

        </nav>
      </div>
    </header>
  )
}

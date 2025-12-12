'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Hero() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section className="relative overflow-hidden min-h-screen flex items-center">

      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full 
          bg-gradient-to-br from-purple-400/30 via-blue-400/20 to-transparent 
          blur-3xl animate-pulse-slow"
          style={{ transform: `translate(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px)` }}
        />
        <div
          className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full 
          bg-gradient-to-br from-cyan-400/30 via-blue-500/20 to-transparent 
          blur-3xl animate-pulse-slow"
          style={{
            transform: `translate(-${mousePosition.x * 0.03}px, -${mousePosition.y * 0.03}px)`,
            animationDelay: '1s',
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-28 text-center relative">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 
            bg-white/70 border border-white/80 rounded-full 
            text-sm text-gray-900 mb-8 backdrop-blur-md animate-fade-in-down shadow-sm">
          
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-600"></span>
          </span>

          AI-Powered Oracle Assistant
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 animate-fade-in-up text-gray-900">
          Chat with your Oracle instances{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r 
          from-purple-500 via-fuchsia-500 to-cyan-500 animate-gradient">
            Powered by AI
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-700 text-lg max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Connect HCM, SCM, ERP and Financials. Summarize ledgers, analyze data and trigger actions — securely.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>

          <Link
            href="/register"
            className="group px-8 py-4 rounded-xl bg-gradient-to-r 
            from-purple-600 to-cyan-500 text-white font-semibold 
            transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            Get Started
          </Link>

          <Link
            href="/chat"
            className="group px-8 py-4 rounded-xl bg-white/70 border border-gray-200
            backdrop-blur-md text-gray-800 font-semibold 
            hover:bg-white/90 transition-all duration-300"
          >
            Open Chat
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
          </Link>

        </div>

        {/* Feature Pills */}
        <div className="mt-8 grid grid-cols-3 gap-4 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          {['Real-time Analysis', 'Secure Integration', 'AI-Powered'].map((text, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-white/70 backdrop-blur-xl 
              border border-gray-200 shadow-md 
              hover:bg-white transition duration-300 cursor-pointer"
            >
              <p className="text-sm text-gray-900 font-medium">{text}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.8s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
        .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
      `}</style>

    </section>
  )
}

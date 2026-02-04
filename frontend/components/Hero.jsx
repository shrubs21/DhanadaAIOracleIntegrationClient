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
    <section className="relative overflow-hidden min-h-screen flex items-center bg-white">

      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-3xl animate-pulse-slow"
          style={{
            background: 'radial-gradient(circle, rgba(3,4,94,0.18), transparent 65%)',
            transform: `translate(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px)`
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl animate-pulse-slow"
          style={{
            background: 'radial-gradient(circle, rgba(3,4,94,0.12), transparent 65%)',
            transform: `translate(-${mousePosition.x * 0.03}px, -${mousePosition.y * 0.03}px)`,
            animationDelay: '1s',
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6py-28 text-center relative">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] rounded-full text-sm text-[#0B132B] mb-8 shadow-sm animate-fade-in-down">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#03045E]/30 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#03045E]"></span>
          </span>
          AI-Powered Oracle Assistant
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 animate-fade-in-up text-[#0B132B]">
          Chat with your Oracle instances{' '}
          <span className="text-[#03045E]">
            Powered by AI
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-[#475569] text-lg max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Connect HCM, SCM, ERP and Financials. Summarize ledgers, analyze data and trigger actions — securely.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-4 animate-fade-in-up mb-8" style={{ animationDelay: '0.4s' }}>
          <Link
            href="/register"
            className="group px-8 py-4 rounded-xl bg-[#03045E] text-white font-semibold 
            transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            Get Started
          </Link>

          <Link
            href="/chat"
            className="group px-8 py-4 rounded-xl bg-white border border-[#E5E7EB]
            text-[#0B132B] font-semibold 
            hover:bg-[#F9FAFB] transition-all duration-300"
          >
            Open Chat
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
          </Link>
        </div>

        {/* Feature Pills */}
       {/* Feature Pills – iOS Frosted Glass */}
<div
  className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto animate-fade-in-up"
  style={{ animationDelay: '0.6s' }}
>
  {[
    'Real-time Analysis',
    'Secure Integration',
    'AI-Powered'
  ].map((text, i) => (
    <div
      key={i}
      className="
        relative
        px-6 py-4
        rounded-full
        bg-[#F3F4F6]/70
        backdrop-blur-xl
        border border-white
        shadow-[0_8px_30px_rgba(0,0,0,0.08)]
        text-center
        cursor-pointer
        transition-all
        duration-300
        ease-out
        hover:-translate-y-1.5
        hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)]
        group
        overflow-hidden
      "
    >
      {/* iOS highlight edge */}
      <span
        className="
          absolute
          inset-0
          rounded-full
          ring-1
          ring-white/60
          pointer-events-none
        "
      />

      {/* Soft glass shine */}
      <span
        className="
          absolute
          -top-1/2
          left-0
          w-full
          h-full
          bg-gradient-to-br
          from-white/60
          via-transparent
          to-transparent
          opacity-40
          pointer-events-none
        "
      />

      {/* Hover light sweep */}
      <span
        className="
          absolute
          inset-0
          bg-gradient-to-r
          from-transparent
          via-white/70
          to-transparent
          opacity-0
          group-hover:opacity-100
          transition-opacity
          duration-500
          pointer-events-none
        "
      />

      {/* Text */}
      <p className="relative z-10 text-sm font-semibold text-[#0B132B] tracking-wide">
        {text}
      </p>
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
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.8s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
      `}</style>

    </section>
  )
}
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

      <div className="max-w-6xl mx-auto px-6 py-28 text-center relative">

        {/* Logo Image */}
        <div className="flex justify-center mb-8 animate-fade-in-down">
          <img
            src="/assets/dt.png"
            alt="DT Technology"
            className="w-24 h-24 object-contain"
          />
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 animate-fade-in-up text-[#0B132B]">
          Chat with your Oracle instances{' '}
          <span style={{ color: '#03045E' }}>
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
            className="group px-8 py-4 rounded-xl bg-[#00C853] border border-[#00C853]
            text-white font-semibold 
            hover:bg-[#00b349] hover:border-[#00b349] transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            Open Chat
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
          </Link>
        </div>

        {/* Feature Pillars — animate ONLY on hover */}
        <div
          className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto animate-fade-in-up"
          style={{ animationDelay: '0.6s' }}
        >
          {['Real-time Analysis', 'Secure Integration', 'AI-Powered'].map((text, i) => (
            <div key={i} className="pillar-card">
              <span className="pillar-border" />
              <span className="pillar-glow" />
              <span className="pillar-shimmer" />
              <p className="pillar-text">{text}</p>
            </div>
          ))}
        </div>

      </div>

      <style jsx>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.05); }
        }

        /* Pillar animations — triggered on hover */
        @keyframes border-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50%       { opacity: 0.65; transform: scale(1.1); }
        }
        @keyframes pillar-float {
          0%, 100% { transform: translateY(0px) scale(1.04); }
          50%       { transform: translateY(-7px) scale(1.04); }
        }
        @keyframes shimmer-sweep {
          0%   { left: -100%; }
          100% { left: 200%; }
        }

        .animate-fade-in-down { animation: fade-in-down 0.8s ease-out forwards; }
        .animate-fade-in-up   { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
        .animate-pulse-slow   { animation: pulse-slow 4s ease-in-out infinite; }

        /* ── Pillar: static default ── */
        .pillar-card {
          position: relative;
          padding: 20px 28px;
          border-radius: 999px;
          background: #ffffff;
          border: 2px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          text-align: center;
          cursor: pointer;
          overflow: hidden;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .pillar-card::before {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 999px;
          background: #ffffff;
          z-index: 1;
        }

        /* ── Hover: fire everything ── */
        .pillar-card:hover {
          box-shadow: 0 10px 45px rgba(0,200,83,0.5), 0 2px 12px rgba(0,0,0,0.1);
          border-color: transparent;
          animation: pillar-float 1.6s ease-in-out infinite;
        }

        .pillar-border {
          position: absolute;
          inset: -3px;
          border-radius: 999px;
          background: conic-gradient(from 0deg, #00C853, #03045E 40%, #00C853 70%, #03045E);
          z-index: 0;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .pillar-card:hover .pillar-border {
          opacity: 1;
          animation: border-spin 1.8s linear infinite;
        }

        .pillar-glow {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: radial-gradient(circle at center, rgba(0,200,83,0.25), transparent 70%);
          z-index: 2;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .pillar-card:hover .pillar-glow {
          opacity: 1;
          animation: glow-pulse 1.6s ease-in-out infinite;
        }

        .pillar-shimmer {
          position: absolute;
          top: 0; bottom: 0;
          width: 45%;
          background: linear-gradient(90deg, transparent, rgba(0,200,83,0.35), transparent);
          z-index: 3;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .pillar-card:hover .pillar-shimmer {
          opacity: 1;
          animation: shimmer-sweep 1.5s ease-in-out infinite;
        }

        .pillar-text {
          position: relative;
          z-index: 4;
          font-size: 0.875rem;
          font-weight: 700;
          color: #0B132B;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: color 0.3s ease;
        }
        .pillar-card:hover .pillar-text {
          color: #03045E;
        }
      `}</style>

    </section>
  )
}
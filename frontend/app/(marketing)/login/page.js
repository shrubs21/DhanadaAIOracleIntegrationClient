'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (e) => { 
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      alert('Login successful! (This is a UI demo)')
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Animated Background Gradients - Soft & Elegant */}
      <div className="absolute inset-0 -z-10">
        <div 
          className="absolute top-20 left-20 w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse-slow opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(139, 92, 246, 0.15) 50%, transparent 100%)'
          }}
        />
        <div 
          className="absolute bottom-20 right-20 w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse-slow opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 100%)',
            animationDelay: '2s'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse-slow opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, rgba(219, 39, 119, 0.1) 50%, transparent 100%)',
            animationDelay: '1s'
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-all duration-300 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-300">←</span>
          <span className="font-medium">Back to home</span>
        </Link>

        {/* Login Card with  Glass Effect */}
        <div className="relative group">
          {/* Top Gradient Glow - iOS Style */}
          <div 
            className="absolute -top-px left-0 right-0 h-32 rounded-t-[2rem] opacity-50"
            style={{
              background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.4) 0%, rgba(139, 92, 246, 0.3) 30%, transparent 100%)',
              filter: 'blur(30px)'
            }}
          />
          
          {/*  Glassmorphism Card */}
          <div 
            className="relative rounded-[2rem] p-8 shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6) inset, 0 1px 2px rgba(255, 255, 255, 0.9) inset'
            }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div 
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 24px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                }}
              >
                <span className="text-3xl relative z-10">🔐</span>
                <div 
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.6), transparent 70%)'
                  }}
                />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">
                Welcome Back
              </h2>
              <p className="text-gray-600">Sign in to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Email Address</label>
                <div className="relative group/input">
                  <input 
                    type="email"
                    className="w-full px-4 py-3.5 rounded-xl text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                    }}
                    placeholder="Demo@example.com"
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm font-semibold transition-colors duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative group/input">
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-3.5 rounded-xl text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                    }}
                    placeholder="Enter your password"
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors duration-300 text-lg"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center pt-2">
                <input 
                  type="checkbox" 
                  id="remember"
                  className="w-4 h-4 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="remember" className="ml-3 text-sm text-gray-700 cursor-pointer font-medium">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit Button with Gradient Glow */}
              <div className="relative pt-2">
                {/* Button Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300 blur-xl"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #3b82f6 100%)',
                  }}
                />
                
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #3b82f6 100%)',
                    boxShadow: '0 4px 20px rgba(168, 85, 247, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div 
                className="flex-1 h-px"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.1) 50%, transparent 100%)'
                }}
              />
              <span className="text-sm text-gray-500 font-medium">OR</span>
              <div 
                className="flex-1 h-px"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.1) 50%, transparent 100%)'
                }}
              />
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-gray-600 text-sm mt-8">
              Don't have an account?{' '}
              <Link 
                href="/register" 
                className="font-semibold transition-colors duration-300"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Sign up
              </Link>
            </p>

            {/* Top white inner glow */}
            <div 
              className="absolute top-0 left-0 right-0 h-32 rounded-t-[2rem] pointer-events-none opacity-40"
              style={{
                background: 'radial-gradient(ellipse at top, rgba(255, 255, 255, 0.8) 0%, transparent 70%)'
              }}
            />
            
            {/* Bottom colored glow */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-32 rounded-b-[2rem] pointer-events-none opacity-20"
              style={{
                background: 'radial-gradient(ellipse at bottom, rgba(59, 130, 246, 0.4) 0%, transparent 70%)'
              }}
            />
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex items-center justify-center gap-8 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-base">🔒</span>
            <span className="font-medium">SSL Secured</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">✓</span>
            <span className="font-medium">GDPR Compliant</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { 
            opacity: 0.25; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.35; 
            transform: scale(1.05); 
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
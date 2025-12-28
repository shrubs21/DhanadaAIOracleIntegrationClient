'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

// 🔥 Backend API URL from environment variable  
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export default function LoginPage(){
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Invalid email or password")
        setIsLoading(false)
        return
      }

      localStorage.setItem("token", data.token)
      toast.success("Welcome back! 🎉", { duration: 2000 })
      
      setTimeout(() => {
        router.replace("/chat")
      }, 800)

    } catch (err) {
      console.error('Login error:', err)
      toast.error("Unable to connect to server")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 -z-10">
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.25, 0.35, 0.25]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 left-20 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(139, 92, 246, 0.15) 50%, transparent 100%)'
          }}
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.25, 0.35, 0.25]
          }}
          transition={{ duration: 8, delay: 2, repeat: Infinity }}
          className="absolute bottom-20 right-20 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 100%)'
          }}
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 8, delay: 1, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, rgba(219, 39, 119, 0.1) 50%, transparent 100%)'
          }}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back Link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-all duration-300 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-300">←</span>
          <span className="font-medium">Back to home</span>
        </Link>

        {/* Login Card */}
        <div className="relative group">
          {/* Top Gradient Glow */}
          <div 
            className="absolute -top-px left-0 right-0 h-32 rounded-t-[2rem] opacity-50"
            style={{
              background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.4) 0%, rgba(139, 92, 246, 0.3) 30%, transparent 100%)',
              filter: 'blur(30px)'
            }}
          />
          
          {/* Glassmorphism Card */}
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
                    placeholder="john@example.com"
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
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
                    className="w-full px-4 py-3.5 pr-12 rounded-xl text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none"
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
                    disabled={isLoading}
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors duration-300"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.42012 12.7132C2.28394 12.4975 2.21584 12.3897 2.17772 12.2234C2.14909 12.0985 2.14909 11.9015 2.17772 11.7766C2.21584 11.6103 2.28394 11.5025 2.42012 11.2868C3.54553 9.50484 6.8954 5 12.0004 5C17.1054 5 20.4553 9.50484 21.5807 11.2868C21.7169 11.5025 21.785 11.6103 21.8231 11.7766C21.8517 11.9015 21.8517 12.0985 21.8231 12.2234C21.785 12.3897 21.7169 12.4975 21.5807 12.7132C20.4553 14.4952 17.1054 19 12.0004 19C6.8954 19 3.54553 14.4952 2.42012 12.7132Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12.0004 15C13.6573 15 15.0004 13.6569 15.0004 12C15.0004 10.3431 13.6573 9 12.0004 9C10.3435 9 9.0004 10.3431 9.0004 12C9.0004 13.6569 10.3435 15 12.0004 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="21" height="21" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                        <g fill="none" fillRule="evenodd" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" transform="translate(2 10)">
                          <path d="m0 .5c2.53705308 3.66666667 5.37038642 5.5 8.5 5.5 3.1296136 0 5.9629469-1.83333333 8.5-5.5"/>
                          <path d="m2.5 3.423-2 2.077"/>
                          <path d="m14.5 3.423 2 2.077"/>
                          <path d="m10.5 6 1 2.5"/>
                          <path d="m6.5 6-1 2.5"/>
                        </g>
                      </svg>
                    )}
                  </motion.button>
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
                  disabled={isLoading}
                />
                <label htmlFor="remember" className="ml-3 text-sm text-gray-700 cursor-pointer font-medium">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <div className="relative pt-2">
                <div 
                  className="absolute inset-0 rounded-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300 blur-xl"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #3b82f6 100%)',
                  }}
                />
                
                <motion.button 
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
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
                </motion.button>
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

            {/* Decorative glows */}
            <div 
              className="absolute top-0 left-0 right-0 h-32 rounded-t-[2rem] pointer-events-none opacity-40"
              style={{
                background: 'radial-gradient(ellipse at top, rgba(255, 255, 255, 0.8) 0%, transparent 70%)'
              }}
            />
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
      </motion.div>
    </div>
  )
}
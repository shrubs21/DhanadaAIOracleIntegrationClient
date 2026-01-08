'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-white">

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Back Link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-[#475569] hover:text-[#0B132B] mb-8 transition-all duration-300 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-300">←</span>
          <span className="font-medium">Back to home</span>
        </Link>

        {/* Login Card */}
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-8 shadow-sm">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-[#03045E] shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="32" height="32" fill="white">
                <path d="M110.242 30.142a1.748 1.748 0 0 0-1.232-1.487 403.606 403.606 0 0 1-44.289-16.1 1.752 1.752 0 0 0-1.442 0 403.606 403.606 0 0 1-44.289 16.1 1.748 1.748 0 0 0-1.232 1.487 113.456 113.456 0 0 0 2.912 35.942c6.257 25.128 21.05 42.221 42.779 49.431a1.75 1.75 0 0 0 1.1 0c21.729-7.21 36.522-24.3 42.779-49.431a113.456 113.456 0 0 0 2.914-35.942zm-6.309 35.1C97.949 89.271 84.515 105 64 112.007c-20.487-6.994-33.912-22.694-39.909-46.672a113.51 113.51 0 0 1-2.949-33.676A416.349 416.349 0 0 0 64 16.061a416.188 416.188 0 0 0 42.858 15.6 113.25 113.25 0 0 1-2.925 33.577z"/>
                <path d="M101.339 34.655c-17.394-5.5-30.432-10.756-36.655-13.4a1.747 1.747 0 0 0-1.368 0c-6.223 2.641-19.261 7.9-36.655 13.4a1.752 1.752 0 0 0-1.222 1.632 107.971 107.971 0 0 0 3.1 28.292c5.43 21.36 17.149 35.631 34.832 42.415a1.753 1.753 0 0 0 1.254 0c17.683-6.784 29.4-21.055 34.832-42.414a107.986 107.986 0 0 0 3.1-28.293 1.752 1.752 0 0 0-1.218-1.632zm-5.273 29.063C91 83.655 80.211 97.03 64 103.481 47.789 97.03 37 83.655 31.934 63.717A105.7 105.7 0 0 1 28.92 37.61C45.245 32.4 57.633 27.451 64 24.77c6.367 2.681 18.755 7.627 35.08 12.84a105.72 105.72 0 0 1-3.014 26.108z"/>
                <path d="M76.515 51.153V46.6a12.515 12.515 0 1 0-25.03 0v4.555a8.29 8.29 0 0 0-6.3 8.034V76.74a8.291 8.291 0 0 0 8.282 8.282h21.07a8.291 8.291 0 0 0 8.282-8.282V59.187a8.29 8.29 0 0 0-6.304-8.034zM64 37.583a9.025 9.025 0 0 1 9.015 9.017v4.3h-18.03v-4.3A9.025 9.025 0 0 1 64 37.583zM79.319 76.74a4.788 4.788 0 0 1-4.782 4.782H53.463a4.788 4.788 0 0 1-4.782-4.782V59.187a4.789 4.789 0 0 1 4.782-4.787h21.074a4.789 4.789 0 0 1 4.782 4.783z"/>
                <path d="M68.129 60.861a6.191 6.191 0 0 0-10.293 4.026 6.144 6.144 0 0 0 2.079 5.237.464.464 0 0 1 .174.307v3.008a3.911 3.911 0 1 0 7.822 0v-2.98a.512.512 0 0 1 .184-.346 6.188 6.188 0 0 0 .034-9.252zm-2.351 6.629a3.982 3.982 0 0 0-1.367 2.969v2.98a.411.411 0 1 1-.822 0v-3.008a3.926 3.926 0 0 0-1.364-2.937 2.675 2.675 0 0 1-.9-2.283 2.715 2.715 0 0 1 2.364-2.41 2.768 2.768 0 0 1 .311-.018 2.662 2.662 0 0 1 1.794.686 2.688 2.688 0 0 1-.016 4.021z"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-[#0B132B]">
              Welcome Back
            </h2>
            <p className="text-[#475569]">Sign in to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0B132B] block">Email Address</label>
              <input 
                type="email"
                className="w-full px-4 py-3.5 rounded-xl text-[#0B132B] placeholder-[#6B7280] bg-white border border-[#E5E7EB] focus:outline-none focus:border-[#03045E] transition-all duration-300"
                value={email} 
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#0B132B]">Password</label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-semibold text-[#03045E] hover:opacity-80 transition-opacity duration-300"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-[#0B132B] placeholder-[#6B7280] bg-white border border-[#E5E7EB] focus:outline-none focus:border-[#03045E] transition-all duration-300"
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowPassword(!showPassword)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#0B132B] transition-colors duration-300"
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
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-2">
              <input 
                type="checkbox" 
                id="remember"
                className="w-4 h-4 rounded border-[#E5E7EB] bg-white text-[#03045E] focus:ring-[#03045E] focus:ring-offset-0 cursor-pointer"
                disabled={isLoading}
              />
              <label htmlFor="remember" className="ml-3 text-sm text-[#475569] cursor-pointer font-medium">
                Remember me for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <motion.button 
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl font-semibold text-white bg-[#03045E] hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="flex items-center justify-center gap-2">
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
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-sm text-[#6B7280] font-medium">OR</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-[#475569] text-sm">
            Don't have an account?{' '}
            <Link 
              href="/register" 
              className="font-semibold text-[#03045E] hover:opacity-80 transition-opacity duration-300"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex items-center justify-center gap-8 text-xs text-[#475569]">
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
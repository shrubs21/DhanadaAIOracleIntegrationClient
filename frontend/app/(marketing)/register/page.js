'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!')
      toast.error('Passwords do not match!')
      return
    }
    if (!acceptTerms) {
      setError('Please accept the terms and conditions')
      toast.error('Please accept the terms and conditions')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      toast.error('Password must be at least 8 characters long')
      return
    }

    try {
      setIsLoading(true)
      
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          email: formData.email,
          password: formData.password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || data.message || "Registration failed")
        toast.error(data.error || data.message || "Registration failed")
        setIsLoading(false)
        return
      }

      toast.success("Account created! Redirecting to login...", { duration: 2000 })
      setTimeout(() => {
        router.replace("/login")
      }, 1000)
      
    } catch (err) {
      console.error('Registration error:', err)
      setError("Unable to connect to server. Please try again later.")
      toast.error("Unable to connect to server. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = () => {
    const pwd = formData.password
    if (pwd.length === 0) return { strength: 0, label: '', color: '' }
    if (pwd.length < 6) return { strength: 25, label: 'Weak', color: 'bg-red-500' }
    if (pwd.length < 10) return { strength: 50, label: 'Fair', color: 'bg-yellow-500' }
    if (pwd.length < 14) return { strength: 75, label: 'Good', color: 'bg-blue-500' }
    return { strength: 100, label: 'Strong', color: 'bg-green-500' }
  }

  const strength = passwordStrength()

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

        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-8 shadow-sm">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-[#03045E] shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="white" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4M4.5 7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7zM8 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-[#0B132B]">Create Account</h2>
            <p className="text-[#475569]">Join us and start your journey</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-200 flex items-start gap-3">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={onSubmit} className="space-y-5">

            {/* FIRST NAME */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0B132B] block">Full Name</label>
              <input 
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3.5 rounded-xl text-[#0B132B] placeholder-[#6B7280] bg-white border border-[#E5E7EB] focus:outline-none focus:border-[#03045E] transition-all duration-300"
                required
              />
            </div>

            {/* EMAIL */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0B132B] block">Email Address</label>
              <input 
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3.5 rounded-xl text-[#0B132B] placeholder-[#6B7280] bg-white border border-[#E5E7EB] focus:outline-none focus:border-[#03045E] transition-all duration-300"
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0B132B] block">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-[#0B132B] placeholder-[#6B7280] bg-white border border-[#E5E7EB] focus:outline-none focus:border-[#03045E] transition-all duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowPassword(!showPassword)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#0B132B] transition-colors duration-300"
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

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${strength.strength}%` }}
                      transition={{ duration: 0.3 }}
                      className={`h-full ${strength.color}`}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${
                      strength.strength === 25 ? 'text-red-500' :
                      strength.strength === 50 ? 'text-yellow-500' :
                      strength.strength === 75 ? 'text-blue-500' :
                      'text-green-500'
                    }`}>
                      {strength.label}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      {formData.password.length}/14 characters
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={formData.password.length >= 8 ? 'text-green-500' : 'text-gray-400'}>
                        {formData.password.length >= 8 ? '✓' : '○'}
                      </span>
                      <span className={formData.password.length >= 8 ? 'text-[#0B132B]' : 'text-[#6B7280]'}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}>
                        {/[A-Z]/.test(formData.password) ? '✓' : '○'}
                      </span>
                      <span className={/[A-Z]/.test(formData.password) ? 'text-[#0B132B]' : 'text-[#6B7280]'}>
                        One uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}>
                        {/[0-9]/.test(formData.password) ? '✓' : '○'}
                      </span>
                      <span className={/[0-9]/.test(formData.password) ? 'text-[#0B132B]' : 'text-[#6B7280]'}>
                        One number
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={/[!@#$%^&*]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}>
                        {/[!@#$%^&*]/.test(formData.password) ? '✓' : '○'}
                      </span>
                      <span className={/[!@#$%^&*]/.test(formData.password) ? 'text-[#0B132B]' : 'text-[#6B7280]'}>
                        One special character (!@#$%^&*)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0B132B] block">Confirm Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-[#0B132B] placeholder-[#6B7280] bg-white border border-[#E5E7EB] focus:outline-none focus:border-[#03045E] transition-all duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowConfirmPassword(!showConfirmPassword)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#0B132B] transition-colors duration-300"
                >
                  {showConfirmPassword ? (
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
              
              {formData.confirmPassword && (
                <div className="flex items-center gap-2 text-xs mt-2">
                  <span className={formData.password === formData.confirmPassword ? 'text-green-500' : 'text-red-500'}>
                    {formData.password === formData.confirmPassword ? '✓' : '✗'}
                  </span>
                  <span className={formData.password === formData.confirmPassword ? 'text-[#0B132B]' : 'text-red-600'}>
                    {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                </div>
              )}
            </div>

            {/* TERMS CHECKBOX */}
            <div className="flex items-start pt-2">
              <input 
                type="checkbox"
                id="terms"
                className="w-4 h-4 mt-0.5 rounded border-[#E5E7EB] bg-white text-[#03045E] focus:ring-[#03045E] focus:ring-offset-0 cursor-pointer"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <label htmlFor="terms" className="ml-3 text-sm text-[#475569] cursor-pointer font-medium">
                I agree to the{' '}
                <Link href="/terms" className="text-[#03045E] hover:opacity-80 underline">
                  Terms & Conditions
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-[#03045E] hover:opacity-80 underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
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

          {/* LOGIN LINK */}
          <p className="text-center text-[#475569] text-sm">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-semibold text-[#03045E] hover:opacity-80 transition-opacity duration-300"
            >
              Sign in
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
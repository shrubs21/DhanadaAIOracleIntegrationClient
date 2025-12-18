'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

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

  // ✅ PROFESSIONAL AUTH FLOW: Register → Redirect to Login
  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
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
      
      const res = await fetch("http://localhost:4000/api/auth/register", {
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

      // ✅ PROFESSIONAL: Registration succeeded → Redirect to Login
      // No token handling here - that happens during login
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">

      {/* Background Glow Elements */}
      <div className="absolute inset-0 -z-10">
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.25, 0.35, 0.25]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.3), rgba(59,130,246,0.15), transparent)'
          }}
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.25, 0.35, 0.25]
          }}
          transition={{ duration: 8, delay: 2, repeat: Infinity }}
          className="absolute bottom-20 left-20 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.3), rgba(139,92,246,0.15), transparent)'
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
            background: 'radial-gradient(circle, rgba(236,72,153,0.25), rgba(219,39,119,0.1), transparent)'
          }}
        />
      </div>

      {/* Centered Card Container */}
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

        <div className="relative group">

          {/* Top Glow */}
          <div 
            className="absolute -top-px left-0 right-0 h-32 rounded-t-[2rem] opacity-50"
            style={{
              background: 'linear-gradient(180deg, rgba(14,165,233,0.4), rgba(139,92,246,0.3), transparent)',
              filter: 'blur(30px)'
            }}
          />

          {/* Glassmorphism Card */}
          <div 
            className="relative rounded-[2rem] p-8 shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 8px 32px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.6) inset, 0 1px 2px rgba(255,255,255,0.9) inset'
            }}
          >

            {/* Header */}
            <div className="text-center mb-8">
              <div 
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.9) 0%, rgba(168, 85, 247, 0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 24px rgba(14, 165, 233, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                }}
              >
                <span className="text-3xl relative z-10">✨</span>
                <div 
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.6), transparent 70%)'
                  }}
                />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Create Account</h2>
              <p className="text-gray-600">Join us and start your journey</p>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="mb-6 p-4 rounded-xl text-sm font-medium text-red-700 flex items-start gap-3"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <span className="text-lg flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={onSubmit} className="space-y-5">

              {/* FIRST NAME */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Full Name</label>
                <div className="relative group/input">
                  <input 
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-xl text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                    }}
                    placeholder="John Doe"
                    required
                  />
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Email Address</label>
                <div className="relative group/input">
                  <input 
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-xl text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                    }}
                    placeholder="john@example.com"
                    required
                  />
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Password</label>
                <div className="relative group/input">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 pr-12 rounded-xl text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                    }}
                    placeholder="Create a strong password"
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors duration-300 text-lg"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </motion.button>
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
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
                        style={{ 
                          boxShadow: strength.strength > 0 ? '0 0 8px currentColor' : 'none'
                        }}
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
                      <span className="text-xs text-gray-500">
                        {formData.password.length}/14 characters
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={formData.password.length >= 8 ? 'text-green-500' : 'text-gray-400'}>
                          {formData.password.length >= 8 ? '✓' : '○'}
                        </span>
                        <span className={formData.password.length >= 8 ? 'text-gray-700' : 'text-gray-500'}>
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}>
                          {/[A-Z]/.test(formData.password) ? '✓' : '○'}
                        </span>
                        <span className={/[A-Z]/.test(formData.password) ? 'text-gray-700' : 'text-gray-500'}>
                          One uppercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}>
                          {/[0-9]/.test(formData.password) ? '✓' : '○'}
                        </span>
                        <span className={/[0-9]/.test(formData.password) ? 'text-gray-700' : 'text-gray-500'}>
                          One number
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={/[!@#$%^&*]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}>
                          {/[!@#$%^&*]/.test(formData.password) ? '✓' : '○'}
                        </span>
                        <span className={/[!@#$%^&*]/.test(formData.password) ? 'text-gray-700' : 'text-gray-500'}>
                          One special character (!@#$%^&*)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Confirm Password</label>
                <div className="relative group/input">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 pr-12 rounded-xl text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                    }}
                    placeholder="Confirm your password"
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors duration-300 text-lg"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </motion.button>
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
                </div>
                
                {formData.confirmPassword && (
                  <div className="flex items-center gap-2 text-xs mt-2">
                    <span className={formData.password === formData.confirmPassword ? 'text-green-500' : 'text-red-500'}>
                      {formData.password === formData.confirmPassword ? '✓' : '✗'}
                    </span>
                    <span className={formData.password === formData.confirmPassword ? 'text-gray-700' : 'text-red-600'}>
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
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 bg-white text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <label htmlFor="terms" className="ml-3 text-sm text-gray-700 cursor-pointer font-medium">
                  I agree to the{' '}
                  <Link href="/terms" className="text-cyan-600 hover:text-cyan-700 underline">
                    Terms & Conditions
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-cyan-600 hover:text-cyan-700 underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="relative pt-2">
                <div 
                  className="absolute inset-0 rounded-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300 blur-xl"
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #a855f7 100%)',
                  }}
                />
                
                <motion.button 
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #a855f7 100%)',
                    boxShadow: '0 4px 20px rgba(14, 165, 233, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
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

            {/* LOGIN LINK */}
            <p className="text-center text-gray-600 text-sm mt-8">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="font-semibold transition-colors duration-300"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Sign in
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
                background: 'radial-gradient(ellipse at bottom, rgba(14, 165, 233, 0.4) 0%, transparent 70%)'
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
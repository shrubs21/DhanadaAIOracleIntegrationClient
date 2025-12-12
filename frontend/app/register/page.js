'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!')
      return
    }
    if (!acceptTerms) {
      alert('Please accept the terms and conditions')
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      alert('Registration successful! (This is a UI demo)')
      setIsLoading(false)
    }, 1500)
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
    <div className="min-h-screen px-6 py-28 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">

      {/* ---------------------------------- */}
      {/* ✅ FIXED: Back to home under navbar */}
      {/* ---------------------------------- */}
      <div className="max-w-6xl mx-auto mb-6">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all duration-300 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-300">←</span>
          <span className="font-medium">Back to home</span>
        </Link>
      </div>

      {/* Background Glow Elements */}
      <div className="absolute inset-0 -z-10">
        <div 
          className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse-slow opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.3), rgba(59,130,246,0.15), transparent)'
          }}
        />
        <div 
          className="absolute bottom-20 left-20 w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse-slow opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.3), rgba(139,92,246,0.15), transparent)',
            animationDelay: '2s'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse-slow opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.25), rgba(219,39,119,0.1), transparent)',
            animationDelay: '1s'
          }}
        />
      </div>

      {/* Centered Card */}
      <div className="w-full max-w-md mx-auto relative z-10">

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
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 8px 32px -8px rgba(0,0,0,0.12)'
            }}
          >

            {/* Header */}
            <div className="text-center mb-8">
              <div 
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #a855f7)',
                  boxShadow: '0 8px 24px rgba(14,165,233,0.3)'
                }}
              >
                <span className="text-3xl">✨</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
              <p className="text-gray-600">Join us and start your journey</p>
            </div>

            {/* FORM */}
            <form onSubmit={onSubmit} className="space-y-5">

              {/* FULL NAME */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Full Name</label>
                <input 
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/60 border border-black/10 text-gray-900"
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/60 border border-black/10 text-gray-900"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/60 border border-black/10 text-gray-900"
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/60 border border-black/10 text-gray-900"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* TERMS CHECKBOX */}
              <div className="flex items-start gap-3 pt-1">
                <input 
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <label className="text-sm text-gray-700">
                  I agree to the Terms & Privacy Policy
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                {isLoading ? "Creating..." : "Create Account"}
              </button>

            </form>

            {/* LOGIN LINK */}
            <p className="text-center text-gray-600 text-sm mt-8">
              Already have an account?{" "}
              <Link href="/login" className="text-purple-600 font-semibold">Sign in</Link>
            </p>

          </div>
        </div>
      </div>

    </div>
  )
}

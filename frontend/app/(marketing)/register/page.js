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
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">

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

      {/* Centered Card Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Back Link - Same as Login Page */}
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

            {/* FORM */}
            <form onSubmit={onSubmit} className="space-y-5">

              {/* FULL NAME */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Full Name</label>
                <div className="relative group/input">
                  <input 
                    type="text"
                    name="fullName"
                    value={formData.fullName}
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
                    placeholder="you@example.com"
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
                    className="w-full px-4 py-3.5 rounded-xl text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                    }}
                    placeholder="Create a strong password"
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
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-3 space-y-2">
                    {/* Strength Bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${strength.color} transition-all duration-500 ease-out`}
                        style={{ 
                          width: `${strength.strength}%`,
                          boxShadow: strength.strength > 0 ? '0 0 8px currentColor' : 'none'
                        }}
                      />
                    </div>

                    {/* Strength Label & Requirements */}
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

                    {/* Requirements Checklist */}
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
                    className="w-full px-4 py-3.5 rounded-xl text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                    }}
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors duration-300 text-lg"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
                </div>
              </div>

              {/* TERMS CHECKBOX */}
              <div className="flex items-center pt-2">
                <input 
                  type="checkbox"
                  id="terms"
                  className="w-4 h-4 rounded border-gray-300 bg-white text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <label htmlFor="terms" className="ml-3 text-sm text-gray-700 cursor-pointer font-medium">
                  I agree to the Terms & Privacy Policy
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="relative pt-2">
                {/* Button Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300 blur-xl"
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #a855f7 100%)',
                  }}
                />
                
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group"
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
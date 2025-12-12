'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage(){
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
    setFormData({...formData, [e.target.name]: e.target.value})
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-black">
      {/* Animated Background Gradients - More Intense */}
      <div className="absolute inset-0 -z-10">
        <div 
          className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse-slow opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.8) 0%, rgba(59, 130, 246, 0.4) 50%, transparent 100%)'
          }}
        />
        <div 
          className="absolute bottom-20 left-20 w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse-slow opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, rgba(168, 85, 247, 0.4) 50%, transparent 100%)',
            animationDelay: '2s'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse-slow opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.6) 0%, rgba(219, 39, 119, 0.3) 50%, transparent 100%)',
            animationDelay: '1s'
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-all duration-300 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-300">←</span>
          <span className="font-medium">Back to home</span>
        </Link>

        {/* Register Card with Gradient Top Glow */}
        <div className="relative group">
          {/* Top Gradient Glow - Apple Style */}
          <div 
            className="absolute -top-px left-0 right-0 h-32 rounded-t-[2rem] opacity-60"
            style={{
              background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.8) 0%, rgba(59, 130, 246, 0.6) 30%, transparent 100%)',
              filter: 'blur(40px)'
            }}
          />
          
          {/* Glassmorphism Card */}
          <div 
            className="relative rounded-[2rem] p-8 shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div 
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(14, 165, 233, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                <span className="text-3xl relative z-10">✨</span>
                <div 
                  className="absolute inset-0 opacity-50"
                  style={{
                    background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.3), transparent 70%)'
                  }}
                />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-white">
                Create Account
              </h2>
              <p className="text-gray-400">Join us and start your journey</p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Full Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">Full Name</label>
                <div className="relative group/input">
                  <input 
                    type="text"
                    name="fullName"
                    className="w-full px-4 py-3.5 rounded-xl text-white placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    placeholder="John Doe"
                    value={formData.fullName} 
                    onChange={handleChange}
                    required
                  />
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">Email Address</label>
                <div className="relative group/input">
                  <input 
                    type="email"
                    name="email"
                    className="w-full px-4 py-3.5 rounded-xl text-white placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    placeholder="you@example.com"
                    value={formData.email} 
                    onChange={handleChange}
                    required
                  />
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">Password</label>
                <div className="relative group/input">
                  <input 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="w-full px-4 py-3.5 rounded-xl text-white placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    placeholder="Create a strong password"
                    value={formData.password} 
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-300 text-lg"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-medium">Password strength</span>
                      <span className={`font-semibold ${
                        strength.strength === 100 ? 'text-green-400' :
                        strength.strength === 75 ? 'text-blue-400' :
                        strength.strength === 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>{strength.label}</span>
                    </div>
                    <div 
                      className="h-2 rounded-full overflow-hidden"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <div 
                        className={`h-full ${strength.color} transition-all duration-500 rounded-full relative overflow-hidden`}
                        style={{width: `${strength.strength}%`}}
                      >
                        <div 
                          className="absolute inset-0 opacity-50"
                          style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                            animation: 'shimmer 2s infinite'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">Confirm Password</label>
                <div className="relative group/input">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    className="w-full px-4 py-3.5 rounded-xl text-white placeholder-gray-500 transition-all duration-300 focus:outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword} 
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-300 text-lg"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                    }}
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-400 font-medium flex items-center gap-1 pt-1">
                    <span>⚠️</span> Passwords do not match
                  </p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-300 leading-relaxed cursor-pointer">
                  I agree to the{' '}
                  <Link 
                    href="/terms" 
                    className="font-semibold transition-colors duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link 
                    href="/privacy" 
                    className="font-semibold transition-colors duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button with Gradient Glow */}
              <div className="relative pt-2">
                {/* Button Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300 blur-xl"
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 50%, #3b82f6 100%)',
                  }}
                />
                
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group"
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 50%, #3b82f6 100%)',
                    boxShadow: '0 4px 20px rgba(14, 165, 233, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account...
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
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
                }}
              />
              <span className="text-sm text-gray-500 font-medium">OR</span>
              <div 
                className="flex-1 h-px"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
                }}
              />
            </div>

            {/* Login Link */}
            <p className="text-center text-gray-400 text-sm mt-8">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="font-semibold transition-colors duration-300"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Sign in
              </Link>
            </p>

            {/* Bottom Inner Glow */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-32 rounded-b-[2rem] pointer-events-none opacity-40"
              style={{
                background: 'radial-gradient(ellipse at bottom, rgba(139, 92, 246, 0.3) 0%, transparent 70%)'
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { 
            opacity: 0.3; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.5; 
            transform: scale(1.1); 
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
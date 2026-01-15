import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react'

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

// Password validation requirements
const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(password),
  }
}

const Signup = () => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('')
  
  // Username validation state
  const [usernameError, setUsernameError] = useState('')
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  
  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecial: false,
  })
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)

  // Debounced username check
  const checkUsername = useCallback(async (usernameToCheck: string) => {
    const normalized = usernameToCheck.trim().toLowerCase()
    
    if (!normalized) {
      setUsernameError('')
      setUsernameAvailable(null)
      return
    }
    
    if (normalized.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      setUsernameAvailable(false)
      return
    }
    
    if (!/^[a-z0-9_]+$/.test(normalized)) {
      setUsernameError('Username can only contain letters, numbers, and underscores')
      setUsernameAvailable(false)
      return
    }
    
    setUsernameChecking(true)
    setUsernameError('')
    
    try {
      const res = await fetch(new URL('/api/auth/check-username', window.location.origin).href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalized })
      })
      const data = await res.json()
      
      if (data.available) {
        setUsernameAvailable(true)
        setUsernameError('')
      } else {
        setUsernameAvailable(false)
        setUsernameError(data.error || 'Username is not available')
      }
    } catch (err) {
      console.error('Username check error:', err)
      setUsernameAvailable(null)
      setUsernameError('')
    } finally {
      setUsernameChecking(false)
    }
  }, [])

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) {
        checkUsername(username)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [username, checkUsername])

  // Update password validation on change
  useEffect(() => {
    setPasswordValidation(validatePassword(password))
  }, [password])

  // Check if form is valid
  const isPasswordValid = Object.values(passwordValidation).every(Boolean)
  const isFormValid = firstName && lastName && company && email && username && password && 
    usernameAvailable === true && isPasswordValid

  useEffect(() => {
    // Fetch reCAPTCHA site key
    const loadRecaptcha = async () => {
      try {
        const res = await fetch(new URL('/api/auth/recaptcha-site-key', window.location.origin).href)
        const data = await res.json()
        if (data.site_key) {
          setRecaptchaSiteKey(data.site_key)
          // Load reCAPTCHA script if not already loaded
          if (!document.querySelector(`script[src*="recaptcha"]`)) {
            const script = document.createElement('script')
            script.src = `https://www.google.com/recaptcha/api.js?render=${data.site_key}`
            script.async = true
            document.head.appendChild(script)
          }
        }
      } catch (err) {
        // reCAPTCHA may fail to load in some environments (e.g., tunnel with auth)
        // Signup will still work without reCAPTCHA token
        console.warn('reCAPTCHA not available:', err)
      }
    }
    loadRecaptcha()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let recaptchaToken = ''
      
      // Get reCAPTCHA token if available
      if (recaptchaSiteKey && window.grecaptcha) {
        try {
          await new Promise<void>(resolve => window.grecaptcha.ready(resolve))
          recaptchaToken = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'signup' })
        } catch (err) {
          console.error('reCAPTCHA error:', err)
        }
      }

      const response = await fetch(new URL('/api/auth/signup', window.location.origin).href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          company,
          email,
          username,
          password,
          recaptcha_token: recaptchaToken
        })
      })

      const data = await response.json()

      if (data.success) {
        window.location.href = data.next || '/confirm-terms'
      } else {
        setError(data.error || 'Signup failed. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen prelogin-gradient-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-16 sm:h-20 flex items-center justify-between">
          <a href="/"><img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-2.5 sm:h-3 lg:h-3.5 w-auto" /></a>
          
          {/* Navigation - visible on all screens with smaller text on mobile */}
                    <nav className="prelogin-nav flex items-center gap-2 sm:gap-4 lg:gap-8">
                      <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 font-poppins text-[10px] sm:text-sm">IHCC</a>
                      <a href="/faq" className="text-gray-300 font-poppins text-[10px] sm:text-sm">FAQ</a>
                      <a href="/about-us" className="text-gray-300 font-poppins text-[10px] sm:text-sm">About Us</a>
                    </nav>
          
          <a href="/login" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center border border-white">Log In</a>
        </div>
      </header>

      {/* Signup Form */}
      <div className="pt-24 sm:pt-28 pb-32 px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="bg-gradient-to-br from-[#1c4262] to-[#0f1419] border border-corama-teal/20 rounded-2xl p-8 sm:p-10 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-6">
              <img 
                src="/static/app/landing/corama-logo.png" 
                alt="CORAMA" 
                className="h-20 mx-auto mb-4"
              />
              <h1 className="font-poppins text-2xl text-white">Create Your Account</h1>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg p-4 mb-6 text-sm flex items-start gap-3" style={{ backgroundColor: '#2F3C4F' }}>
                <img src="/static/app/landing/information-icon-white.svg" alt="Info" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-white">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-gray-300 font-poppins text-sm mb-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    required
                    autoFocus
                    autoComplete="given-name"
                    className="w-full bg-white text-gray-900 rounded-lg px-4 py-3 font-poppins text-sm border border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20 outline-none transition-all placeholder:text-gray-400"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    required
                    autoComplete="family-name"
                    className="w-full bg-white text-gray-900 rounded-lg px-4 py-3 font-poppins text-sm border border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20 outline-none transition-all placeholder:text-gray-400"
                  />
                </div>
                
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company Name"
                  required
                  autoComplete="organization"
                  className="w-full bg-white text-gray-900 rounded-lg px-4 py-3 font-poppins text-sm border border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Account Details */}
              <div className="mb-5">
                <div className="flex items-center gap-2 text-gray-300 font-poppins text-sm mb-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Account Details
                </div>
                
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  required
                  autoComplete="email"
                  className="w-full bg-white text-gray-900 rounded-lg px-4 py-3 mb-3 font-poppins text-sm border border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20 outline-none transition-all placeholder:text-gray-400"
                />
                
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    autoComplete="username"
                    className={`w-full bg-white text-gray-900 rounded-lg px-4 py-3 pr-10 font-poppins text-sm border outline-none transition-all placeholder:text-gray-400 ${
                      usernameError ? 'border-red-500 focus:border-red-500' : 
                      usernameAvailable === true ? 'border-green-500 focus:border-green-500' : 
                      'border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20'
                    }`}
                  />
                  {usernameChecking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                  )}
                  {!usernameChecking && usernameAvailable === true && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                  {!usernameChecking && usernameAvailable === false && (
                    <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                  )}
                </div>
                {usernameError && (
                  <p className="text-red-400 text-xs font-poppins mb-3 -mt-2">{usernameError}</p>
                )}
                
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowPasswordRequirements(true)}
                    onBlur={() => setShowPasswordRequirements(false)}
                    placeholder="Create a strong password"
                    required
                    autoComplete="new-password"
                    className={`w-full bg-white text-gray-900 rounded-lg px-4 py-3 pr-12 font-poppins text-sm border outline-none transition-all placeholder:text-gray-400 ${
                      password && !isPasswordValid ? 'border-red-500 focus:border-red-500' :
                      password && isPasswordValid ? 'border-green-500 focus:border-green-500' :
                      'border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-corama-teal transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {(showPasswordRequirements || (password && !isPasswordValid)) && (
                  <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#2F3C4F' }}>
                    <p className="text-xs text-white font-poppins mb-2">Password must contain:</p>
                    <div className="grid grid-cols-2 gap-1">
                      <div className={`flex items-center gap-1 text-xs font-poppins ${passwordValidation.minLength ? 'text-green-400' : 'text-white'}`}>
                        {passwordValidation.minLength ? <Check size={12} /> : <X size={12} />}
                        At least 8 characters
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-poppins ${passwordValidation.hasUppercase ? 'text-green-400' : 'text-white'}`}>
                        {passwordValidation.hasUppercase ? <Check size={12} /> : <X size={12} />}
                        One uppercase letter
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-poppins ${passwordValidation.hasNumber ? 'text-green-400' : 'text-white'}`}>
                        {passwordValidation.hasNumber ? <Check size={12} /> : <X size={12} />}
                        One number
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-poppins ${passwordValidation.hasSpecial ? 'text-green-400' : 'text-white'}`}>
                        {passwordValidation.hasSpecial ? <Check size={12} /> : <X size={12} />}
                        One special character
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full bg-gradient-to-b from-corama-teal via-[#9cd6d7] to-[#85c4c7] text-[#0B0B0F] font-poppins font-semibold py-3.5 rounded-lg hover:shadow-lg hover:shadow-corama-teal/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Creating Account...
                  </>
                ) : (
                  'Get Started Free'
                )}
              </button>
            </form>

            {/* Links */}
            <div className="text-center mt-5">
              <p className="text-gray-400 font-poppins text-sm">
                Already have an account? <a href="/login" className="text-corama-teal hover:text-[#99c8ca] transition-colors">Sign in here</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - at bottom of page content, not fixed */}
      <footer className="bg-[#0B0B0F] pt-8 pb-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white font-poppins">
          <div className="text-center sm:text-left">
            <div>180 North Michigan Avenue</div>
            <div className="sm:text-center">Suite 500 Chicago, IL 60601</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Learn More About IHCC</a>
            <a href="/terms-of-use" className="hover:text-white transition-colors">Terms of Use</a>
            <a href="/static/docs/policy.pdf" target="_blank" className="hover:text-white transition-colors">Policy Notice</a>
            <a href="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</a>
          </div>
          <div>contact@corama.ai</div>
        </div>
      </footer>
    </div>
  )
}

export default Signup

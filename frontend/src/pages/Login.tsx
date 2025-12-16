import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('')

  useEffect(() => {
    // Fetch reCAPTCHA site key
    const loadRecaptcha = async () => {
      try {
        const res = await fetch('/api/auth/recaptcha-site-key')
        const data = await res.json()
        if (data.site_key) {
          setRecaptchaSiteKey(data.site_key)
          // Load reCAPTCHA script
          const script = document.createElement('script')
          script.src = `https://www.google.com/recaptcha/api.js?render=${data.site_key}`
          script.async = true
          document.head.appendChild(script)
        }
      } catch (err) {
        // reCAPTCHA may fail to load in some environments (e.g., tunnel with auth)
        // Login will still work without reCAPTCHA token
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
          recaptchaToken = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'login' })
        } catch (err) {
          console.error('reCAPTCHA error:', err)
        }
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          recaptcha_token: recaptchaToken
        })
      })

      const data = await response.json()

      if (data.success) {
        window.location.href = data.redirect || '/dashboard'
      } else {
        setError(data.error || 'Login failed. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <a href="/"><img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-4 sm:h-5 w-auto" /></a>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">IHCC</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">Support</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">FAQ</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <a href="/signup" className="text-corama-teal font-poppins text-sm font-medium hover:text-[#99c8ca] transition-colors">Sign up</a>
        </div>
      </header>

      {/* Login Form */}
      <div className="pt-24 sm:pt-32 pb-32 px-4 sm:px-6 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-[#1c4262] to-[#0f1419] border border-corama-teal/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <img 
                src="/static/app/landing/corama-logo.png" 
                alt="CORAMA" 
                className="h-20 mx-auto mb-6"
              />
              <h1 className="font-poppins text-2xl text-white">Welcome Back</h1>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-4 mb-6 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-gray-300 font-poppins text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full bg-white text-gray-900 rounded-lg px-4 py-3.5 font-poppins text-sm border border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="mb-6 relative">
                <label className="block text-gray-300 font-poppins text-sm mb-2">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-white text-gray-900 rounded-lg px-4 py-3.5 pr-12 font-poppins text-sm border border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20 outline-none transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[38px] text-gray-500 hover:text-corama-teal transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-b from-corama-teal via-[#9cd6d7] to-[#85c4c7] text-[#0B0B0F] font-poppins font-semibold py-3.5 rounded-lg hover:shadow-lg hover:shadow-corama-teal/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Links */}
            <div className="text-center mt-6">
              <a href="/reset-password" className="text-corama-teal font-poppins text-sm hover:text-[#99c8ca] transition-colors">
                Forgot your password?
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/95 to-transparent py-5 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 font-poppins">
          <div className="text-center sm:text-left">
            222 W. Merchandise Mart Plaza<br />
            Suite 1212 c/o 1871 Chicago, IL 60654
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Learn More About IHCC</a>
            <a href="/terms-of-use" className="hover:text-white transition-colors">Terms of Use</a>
            <a href="/static/docs/policy.pdf" target="_blank" className="hover:text-white transition-colors">Policy Notice</a>
            <a href="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</a>
            <a href="mailto:Info@corama.ai" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div>Info@corama.ai</div>
        </div>
      </footer>
    </div>
  )
}

export default Login

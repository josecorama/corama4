import { useState, useEffect } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

const ResetPassword = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('')

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
        // Password reset will still work without reCAPTCHA token
        console.warn('reCAPTCHA not available:', err)
      }
    }
    loadRecaptcha()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      let recaptchaToken = ''
      
      // Get reCAPTCHA token if available
      if (recaptchaSiteKey && window.grecaptcha) {
        try {
          await new Promise<void>(resolve => window.grecaptcha.ready(resolve))
          recaptchaToken = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'reset_password' })
        } catch (err) {
          console.error('reCAPTCHA error:', err)
        }
      }

      const response = await fetch(new URL('/api/auth/reset-password', window.location.origin).href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          recaptcha_token: recaptchaToken
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message || 'A password reset link has been sent to your email.')
        setEmail('')
      } else {
        setError(data.error || 'Failed to send reset email. Please try again.')
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
          
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="/login" className="text-white font-poppins text-xs sm:text-sm hover:text-corama-teal transition-colors">Log In</a>
            <a href="/signup" className="bg-corama-teal text-[#0B0B0F] font-poppins text-xs sm:text-sm font-semibold px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-[#99c8ca] transition-colors">Sign up</a>
          </div>
        </div>
      </header>

      {/* Reset Password Form */}
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
              <h1 className="font-poppins text-2xl text-white mb-2">Reset Password</h1>
              <p className="text-gray-400 font-poppins text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg p-4 mb-6 text-sm flex items-start gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-4 mb-6 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-gray-300 font-poppins text-sm mb-2">Email Address</label>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-b from-corama-teal via-[#9cd6d7] to-[#85c4c7] text-[#0B0B0F] font-poppins font-semibold py-3.5 rounded-lg hover:shadow-lg hover:shadow-corama-teal/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            {/* Links */}
            <div className="text-center mt-6">
              <a href="/login" className="text-corama-teal font-poppins text-sm hover:text-[#99c8ca] transition-colors">
                Back to Sign In
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

export default ResetPassword

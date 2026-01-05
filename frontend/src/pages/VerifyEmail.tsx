import { useState, useEffect, useRef } from 'react'
import { Loader2, Mail, RefreshCw } from 'lucide-react'

const VerifyEmail = () => {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Get email from URL params or session storage
  const urlParams = new URLSearchParams(window.location.search)
  const email = urlParams.get('email') || sessionStorage.getItem('verify_email') || ''

  useEffect(() => {
    // Store email in session storage for persistence
    if (urlParams.get('email')) {
      sessionStorage.setItem('verify_email', urlParams.get('email') || '')
    }
  }, [])

  useEffect(() => {
    // Countdown timer for resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(new URL('/api/auth/verify-email', window.location.origin).href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode, email })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Email verified successfully! Redirecting...')
        sessionStorage.removeItem('verify_email')
        setTimeout(() => {
          window.location.href = data.redirect || '/confirm-terms'
        }, 1500)
      } else {
        setError(data.error || 'Verification failed. Please try again.')
        // Clear code on error
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return
    
    setError('')
    setSuccess('')
    setResendLoading(true)

    try {
      const response = await fetch(new URL('/api/auth/resend-otp', window.location.origin).href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('A new verification code has been sent to your email.')
        setResendCooldown(60) // 60 second cooldown
        // Clear existing code
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      } else {
        if (data.seconds_until_retry) {
          setResendCooldown(data.seconds_until_retry)
        }
        setError(data.error || 'Failed to resend code. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <a href="/"><img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-3 sm:h-3.5 w-auto" /></a>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">IHCC</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">Support</a>
            <a href="/faq" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">FAQ</a>
            <a href="/about-us" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <a href="/login" className="text-corama-teal font-poppins text-sm font-medium hover:text-[#99c8ca] transition-colors">Log In</a>
        </div>
      </header>

      {/* Verification Form */}
      <div className="pt-24 sm:pt-28 pb-32 px-4 sm:px-6 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-[#1c4262] to-[#0f1419] border border-corama-teal/20 rounded-2xl p-8 sm:p-10 shadow-2xl">
            {/* Logo and Icon */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-corama-teal/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-corama-teal" />
              </div>
              <h1 className="font-poppins text-2xl text-white mb-2">Verify Your Email</h1>
              <p className="text-gray-400 font-poppins text-sm">
                We sent a 6-digit code to<br />
                <span className="text-corama-teal">{email || 'your email'}</span>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-4 mb-6 text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg p-4 mb-6 text-sm">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* 6-Digit Code Input */}
              <div className="mb-6">
                <label className="block text-gray-300 font-poppins text-sm mb-3 text-center">
                  Enter verification code
                </label>
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      autoFocus={index === 0}
                      className="w-11 h-14 sm:w-12 sm:h-16 bg-white text-gray-900 rounded-lg text-center font-poppins text-xl sm:text-2xl font-bold border border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || code.join('').length !== 6}
                className="w-full bg-gradient-to-b from-corama-teal via-[#9cd6d7] to-[#85c4c7] text-[#0B0B0F] font-poppins font-semibold py-3.5 rounded-lg hover:shadow-lg hover:shadow-corama-teal/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </button>
            </form>

            {/* Resend Code */}
            <div className="text-center mt-6">
              <p className="text-gray-400 font-poppins text-sm mb-2">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || resendLoading}
                className="text-corama-teal hover:text-[#99c8ca] font-poppins text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw size={16} />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Resend Code
                  </>
                )}
              </button>
            </div>

            {/* Help Text */}
            <div className="text-center mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-500 font-poppins text-xs">
                The code expires in 15 minutes.<br />
                Check your spam folder if you don't see the email.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/95 to-transparent py-5 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white font-poppins">
          <div className="text-center sm:text-left">
            <div>222 W. Merchandise Mart Plaza</div>
            <div className="sm:text-center">Suite 1212 c/o 1871 Chicago, IL 60654</div>
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

export default VerifyEmail

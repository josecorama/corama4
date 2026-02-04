import { useState, useEffect, useRef } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

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
    <div className="min-h-screen bg-[#0B0B0F] relative">
      {/* Flicker Background */}
      <div className="prelogin-flicker-bg" />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-16 sm:h-20 flex items-center justify-between">
          <a href="/"><img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-2.5 sm:h-3 lg:h-3.5 w-auto" /></a>
          
          {/* Navigation - visible on all screens with smaller text on mobile */}
          <nav className="prelogin-nav flex items-center gap-2 sm:gap-4 lg:gap-8">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">IHCC</a>
            <a href="/faq" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">FAQ</a>
            <a href="/about-us" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">About Us</a>
          </nav>
          
          <a href="/signup" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center" style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)' }}>Sign up</a>
        </div>
      </header>

      {/* Verification Form */}
      <div className="relative z-10 pt-24 sm:pt-28 pb-32 px-4 sm:px-6 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-gradient-to-br from-[#1c4262]/80 to-[#0f1419]/90 border border-corama-teal/20 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-sm">
            {/* Logo */}
            <div className="text-center mb-6">
              <img 
                src="/static/app/landing/corama-logo.png" 
                alt="CORAMA" 
                className="h-20 mx-auto mb-6"
              />
              <h1 className="font-poppins text-2xl text-white mb-3">Enter The Code</h1>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed">
                Enter the 6-digit verification code to confirm<br />
                that you received the verification mail.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg p-4 mb-6 text-sm flex items-start gap-3" style={{ backgroundColor: '#2F3C4F' }}>
                <img src="/static/app/landing/information-icon.svg" alt="Info" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-white">{error}</span>
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
              {/* Verification Code Label */}
              <div className="mb-6">
                <label className="block text-gray-300 font-poppins text-sm mb-3">
                  Verification Code
                </label>
                
                {/* 6-Digit Code Input - Kept as separate boxes per user request */}
                <div className="flex justify-between gap-2" onPaste={handlePaste}>
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
                      placeholder=""
                      className="w-12 h-14 bg-[#0B0B0F]/60 text-white rounded-lg text-center font-poppins text-xl font-bold border border-corama-teal/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20 outline-none transition-all placeholder:text-gray-600"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || code.join('').length !== 6}
                className="w-full bg-gradient-to-r from-corama-teal to-[#85c4c7] text-[#0B0B0F] font-poppins font-semibold py-3.5 rounded-lg hover:shadow-lg hover:shadow-corama-teal/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Verifying...
                  </>
                ) : (
                  'Submit Code'
                )}
              </button>
            </form>

            {/* Resend Code */}
            <div className="text-center mt-5">
              <p className="text-gray-400 font-poppins text-sm mb-2">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || resendLoading}
                className="text-corama-teal hover:text-[#6BA4A7] font-poppins text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
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

            {/* Login Link */}
            <div className="text-center mt-5">
              <p className="text-gray-400 font-poppins text-sm">
                Remembered your password? <a href="/login" className="text-corama-teal hover:text-[#6BA4A7] transition-colors">Log In</a>
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

export default VerifyEmail

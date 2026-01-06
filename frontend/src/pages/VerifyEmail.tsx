import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const VerifyEmail = () => {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    // Countdown timer for resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(new URL('/api/auth/verify-email', window.location.origin).href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: fullCode })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message || 'Email verified successfully!')
        // Redirect to next page after short delay
        setTimeout(() => {
          window.location.href = data.next || '/confirm-terms'
        }, 1500)
      } else {
        setError(data.error || 'Verification failed. Please try again.')
        // Clear code on error
        setCode(['', '', '', '', '', ''])
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resendLoading) return

    setResendLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(new URL('/api/auth/resend-otp', window.location.origin).href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message || 'A new code has been sent to your email.')
        setResendCooldown(60) // 60 second cooldown
        // Clear current code
        setCode(['', '', '', '', '', ''])
      } else {
        setError(data.error || 'Failed to resend code. Please try again.')
        // Check for retry-after header
        const retryAfter = response.headers.get('Retry-After')
        if (retryAfter) {
          setResendCooldown(parseInt(retryAfter, 10))
        }
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
          
          <a href="/signup" className="text-corama-teal font-poppins text-sm font-medium hover:text-[#99c8ca] transition-colors">Sign up</a>
        </div>
      </header>

      {/* Verification Form */}
      <div className="pt-24 sm:pt-28 pb-32 px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-[#1c4262]/70 to-[#0f1419] border border-corama-teal/20 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-lg">
            {/* Logo */}
            <div className="text-center mb-6">
              <img 
                src="/static/app/landing/corama-logo.png" 
                alt="CORAMA" 
                className="h-20 mx-auto mb-6"
              />
              <h1 className="font-poppins text-2xl text-white mb-2">Enter The Code</h1>
              <p className="text-gray-400 font-poppins text-sm">
                Enter the 6-digit verification code to confirm<br />
                that you received the verification mail.
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
              {/* Verification Code Label */}
              <div className="mb-3">
                <label className="text-gray-300 font-poppins text-sm">Verification Code</label>
              </div>

              {/* 6-Digit Code Input */}
              <div className="mb-6">
                <input
                  type="text"
                  value={code.join('')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    const newCode = value.split('').concat(['', '', '', '', '', '']).slice(0, 6)
                    setCode(newCode)
                  }}
                  onPaste={handlePaste}
                  placeholder="Enter the 6 digit code"
                  maxLength={6}
                  className="w-full bg-white text-gray-900 rounded-lg px-4 py-3 font-poppins text-sm border border-gray-300/30 focus:border-corama-teal focus:ring-2 focus:ring-corama-teal/20 outline-none transition-all placeholder:text-gray-400 tracking-widest text-center"
                  autoFocus
                />
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
                  'Submit Code'
                )}
              </button>
            </form>

            {/* Resend Link */}
            <div className="text-center mt-5">
              <p className="text-gray-400 font-poppins text-sm">
                Didn't receive the code?{' '}
                {resendCooldown > 0 ? (
                  <span className="text-gray-500">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    onClick={handleResendCode}
                    disabled={resendLoading}
                    className="text-corama-teal hover:text-[#99c8ca] transition-colors disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </p>
            </div>

            {/* Back to Login Link */}
            <div className="text-center mt-3">
              <p className="text-gray-400 font-poppins text-sm">
                Remembered your password? <a href="/login" className="text-corama-teal hover:text-[#99c8ca] transition-colors">Log in</a>
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

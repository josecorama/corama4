import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const ResetPasswordConfirm = () => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [oobCode, setOobCode] = useState('')
  const [codeValid, setCodeValid] = useState(false)

  useEffect(() => {
    // Extract oobCode from URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('oobCode')
    const mode = urlParams.get('mode')

    if (!code || mode !== 'resetPassword') {
      setError('Invalid or expired password reset link.')
      setValidating(false)
      return
    }

    setOobCode(code)

    // Verify the code is valid
    const verifyCode = async () => {
      try {
        const response = await fetch('/api/auth/verify-reset-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oob_code: code })
        })

        const data = await response.json()

        if (data.valid) {
          setCodeValid(true)
        } else {
          setError(data.error || 'Invalid or expired password reset link.')
        }
      } catch (err) {
        setError('Failed to verify reset link. Please try again.')
      } finally {
        setValidating(false)
      }
    }

    verifyCode()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/confirm-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oob_code: oobCode,
          new_password: password
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to reset password. Please try again.')
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
          <a href="/"><img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-3 sm:h-3.5 w-auto" /></a>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">IHCC</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">Support</a>
            <a href="/faq" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">FAQ</a>
            <a href="/about-us" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="/login" className="text-white font-poppins text-xs sm:text-sm hover:text-corama-teal transition-colors">Log In</a>
            <a href="/signup" className="bg-corama-teal text-[#0B0B0F] font-poppins text-xs sm:text-sm font-semibold px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-[#99c8ca] transition-colors">Sign up</a>
          </div>
        </div>
      </header>

      {/* Reset Password Confirm Form */}
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
              <h1 className="font-poppins text-2xl font-bold text-white mb-2">Reset Password</h1>
              <p className="text-gray-400 font-poppins text-sm">
                Enter your new password<br />to login into your account.
              </p>
            </div>

            {/* Loading State */}
            {validating && (
              <div className="text-center py-8">
                <Loader2 className="animate-spin w-8 h-8 text-corama-teal mx-auto mb-4" />
                <p className="text-gray-400 font-poppins text-sm">Verifying reset link...</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-white font-poppins text-xl mb-2">Password Reset Successful!</h2>
                <p className="text-gray-400 font-poppins text-sm mb-6">
                  Your password has been updated. You can now sign in with your new password.
                </p>
                <a 
                  href="/login" 
                  className="inline-block bg-gradient-to-b from-corama-teal via-[#9cd6d7] to-[#85c4c7] text-[#0B0B0F] font-poppins font-semibold py-3 px-8 rounded-lg hover:shadow-lg hover:shadow-corama-teal/30 transition-all"
                >
                  Sign In
                </a>
              </div>
            )}

            {/* Error State (invalid code) */}
            {!validating && !codeValid && !success && (
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-white font-poppins text-xl mb-2">Invalid Reset Link</h2>
                <p className="text-gray-400 font-poppins text-sm mb-6">
                  {error || 'This password reset link is invalid or has expired.'}
                </p>
                <a 
                  href="/reset-password" 
                  className="inline-block bg-gradient-to-b from-corama-teal via-[#9cd6d7] to-[#85c4c7] text-[#0B0B0F] font-poppins font-semibold py-3 px-8 rounded-lg hover:shadow-lg hover:shadow-corama-teal/30 transition-all"
                >
                  Request New Link
                </a>
              </div>
            )}

            {/* Password Form */}
            {!validating && codeValid && !success && (
              <>
                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-4 mb-6 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label className="block text-gray-300 font-poppins text-sm mb-2">New Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      minLength={8}
                      autoFocus
                      autoComplete="new-password"
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
                        Saving Password...
                      </>
                    ) : (
                      'Save New Password'
                    )}
                  </button>

                  <div className="text-center mt-6">
                    <span className="text-gray-400 font-poppins text-sm">Remembered your password? </span>
                    <a href="/login" className="text-corama-teal hover:text-[#99c8ca] font-poppins text-sm transition-colors">Log in</a>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/95 to-transparent py-5 z-40">
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

export default ResetPasswordConfirm

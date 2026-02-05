import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react'

// Password validation requirements (same as Signup)
const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(password),
  }
}

const ResetPasswordConfirm = () => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [oobCode, setOobCode] = useState('')
  const [codeValid, setCodeValid] = useState(false)
  
  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecial: false,
  })
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  
  // Update password validation on change
  useEffect(() => {
    setPasswordValidation(validatePassword(password))
  }, [password])
  
  // Check if password is valid
  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

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

    // Validate password strength (same requirements as Signup)
    if (!isPasswordValid) {
      setError('Password does not meet all requirements.')
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
    <div className="min-h-screen bg-[#0B0B0F] relative flex flex-col">
      {/* Flicker Background */}
      <div className="prelogin-flicker-bg" />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo Group (Left Side) */}
          <div className="flex items-center gap-3 sm:gap-5">
            <a href="/">
              <img src="/static/app/landing/corama-logo-new.png" alt="CORAMA" className="h-6 sm:h-8 lg:h-8 w-auto" />
            </a>
            <div className="h-6 w-px bg-white/20"></div>
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer">
              <img src="/static/app/dashboard/IHCC-new.png" alt="IHCC" className="h-5 sm:h-6 lg:h-6 w-auto" />
            </a>
          </div>
          
          {/* Navigation and Buttons (Right Side) */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
            <nav className="prelogin-nav flex items-center gap-2 sm:gap-4 lg:gap-6">
              <a href="/faq" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">FAQ</a>
              <a href="/about-us" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">About Us</a>
              <a href="/login" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">Log In</a>
            </nav>
            <a href="/signup" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center" style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)' }}>Sign up</a>
          </div>
        </div>
      </header>

            {/* Reset Password Confirm Form */}
            <div className="relative z-10 pt-24 sm:pt-32 pb-16 px-4 sm:px-6 flex items-center justify-center flex-1">
        <div className="w-full max-w-md animate-fade-in">
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
              <div className="text-center py-4">
                {/* Checkmark Icon */}
                <img 
                  src="/static/app/landing/CheckPwReset.svg" 
                  alt="Success" 
                  className="w-14 h-14 mx-auto mb-4"
                />
                
                {/* Title */}
                <h2 className="text-white font-poppins text-2xl font-bold mb-1">Password Reset</h2>
                <h2 className="text-white font-poppins text-2xl font-bold mb-4">Successful</h2>
                
                {/* Description */}
                <p className="text-gray-400 font-poppins text-sm mb-6">
                  Your password has been updated.<br />
                  You can now sign in with your new password.
                </p>
                
                {/* Sign In Button */}
                <a 
                  href="/login" 
                  className="block w-full bg-gradient-to-b from-corama-teal via-[#9cd6d7] to-[#85c4c7] text-[#0B0B0F] font-poppins font-semibold py-3.5 rounded-lg hover:shadow-lg hover:shadow-corama-teal/30 transition-all text-center"
                >
                  Sign In
                </a>
                
                {/* Log in link */}
                <div className="mt-5">
                  <span className="text-gray-400 font-poppins text-sm">Remembered your password? </span>
                  <a href="/login" className="text-corama-teal hover:text-[#6BA4A7] font-poppins text-sm transition-colors">Log in</a>
                </div>
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
                  <div className="rounded-lg p-4 mb-6 text-sm flex items-start gap-3" style={{ backgroundColor: '#2F3C4F' }}>
                    <img src="/static/app/landing/information-icon-white.svg" alt="Info" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-white">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label className="block text-gray-300 font-poppins text-sm mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setShowPasswordRequirements(true)}
                        onBlur={() => setShowPasswordRequirements(false)}
                        placeholder="Create a strong password"
                        required
                        autoFocus
                        autoComplete="new-password"
                        className={`w-full bg-white text-gray-900 rounded-lg px-4 py-3.5 pr-12 font-poppins text-sm border outline-none transition-all placeholder:text-gray-400 ${
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
                    disabled={loading || !isPasswordValid}
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
                    <a href="/login" className="text-corama-teal hover:text-[#6BA4A7] font-poppins text-sm transition-colors">Log in</a>
                  </div>
                </form>
              </>
            )}
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

export default ResetPasswordConfirm

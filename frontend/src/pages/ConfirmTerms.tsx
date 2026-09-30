import { useState } from 'react'
import { Loader2 } from 'lucide-react'

const ConfirmTerms = () => {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const handleAgree = async () => {
    if (!accepted) {
      setError('Please confirm that you have read and agree to the Terms of Use and Privacy Notice.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/confirm-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_terms: true })
      })

      const data = await response.json()

      if (data.success) {
        window.location.href = data.redirect || '/dashboard'
      } else {
        setError(data.error || 'Failed to accept terms. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    window.location.href = '/signup'
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
            </nav>
            <a href="/signup" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center" style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)' }}>Sign up</a>
          </div>
        </div>
      </header>

            {/* Main Content */}
            <div className="relative z-10 pt-24 sm:pt-32 pb-16 px-4 sm:px-6 flex-1">
        <div className="max-w-4xl mx-auto animate-fade-in">
          {/* Title Section */}
          <div className="text-center mb-10">
            <h1 className="font-poppins font-black text-3xl sm:text-4xl md:text-5xl text-white mb-3">
              Terms of Use &amp; Privacy Notice
            </h1>
            <p className="text-gray-300 font-poppins text-sm sm:text-base max-w-2xl mx-auto">
              Before you start using CORAMA, please review and accept our Terms of Use and Privacy Notice.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-4 mb-6 text-sm max-w-2xl mx-auto">
              {error}
            </div>
          )}

          {/* Terms Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto shadow-xl">
            {/* Header */}
            <h2 className="text-corama-teal font-poppins font-bold text-sm tracking-wider mb-4">
              CORAMA (CONTRACT RADAR MAXIMIZER)
            </h2>
            <h3 className="text-gray-900 font-poppins font-bold text-base mb-4">
              A program of the Illinois Hispanic Chamber of Commerce
            </h3>

            {/* Scrollable Content */}
            <div className="h-64 sm:h-80 overflow-y-auto pr-2 text-gray-700 font-poppins text-sm leading-relaxed space-y-4 border-t border-gray-200 pt-4">
              <p>
                CORAMA is an artificial intelligence tool owned and operated by the Illinois Hispanic Chamber of
                Commerce (IHCC), a 501(c)(6) not-for-profit organization based in Chicago, Illinois. CORAMA is
                offered at no cost to help small and diverse businesses discover, evaluate, and pursue public
                contracting opportunities.
              </p>

              <h4 className="font-bold text-gray-900">What you are agreeing to</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Our{' '}
                  <a href="/terms-of-use" target="_blank" rel="noopener noreferrer" className="text-corama-teal hover:underline">Terms of Use</a>,
                  which govern your use of CORAMA, including the CORAMA Directory and our AI features.
                </li>
                <li>
                  Our{' '}
                  <a href="/privacy-notice" target="_blank" rel="noopener noreferrer" className="text-corama-teal hover:underline">Privacy Notice</a>,
                  which explains what information we collect, how we use it, and your privacy rights.
                </li>
              </ul>

              <h4 className="font-bold text-gray-900">Key points</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>CORAMA is free. There are no subscriptions, tokens, credits, or automatic renewals.</li>
                <li>
                  You own the documents you upload and the capability statements and proposals CORAMA generates for
                  you. We use your uploads only to operate and improve the service.
                </li>
                <li>
                  Your documents and prompts are processed by AI service providers (such as OpenAI through its
                  business API) on our behalf; they are not used to train those providers&apos; models.
                </li>
                <li>
                  We do not sell your personal information or share it for advertising. Your business profile is only
                  visible to others if you choose to publish it in the CORAMA Directory.
                </li>
                <li>
                  AI-generated content may contain errors. Always verify contract details against the official
                  solicitation before submitting a bid or proposal.
                </li>
                <li>CORAMA is intended for businesses and business professionals who are 18 or older.</li>
                <li>
                  You can request deletion of your account and uploaded documents at any time by emailing{' '}
                  <a href="mailto:admin@corama.ai" className="text-corama-teal hover:underline">admin@corama.ai</a>.
                </li>
              </ul>
              <p className="text-xs text-gray-500">
                This summary is for convenience only. The full Terms of Use and Privacy Notice control.
              </p>
            </div>

            {/* Consent Checkbox */}
            <label className="flex items-start gap-3 mt-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => { setAccepted(e.target.checked); if (e.target.checked) setError('') }}
                disabled={loading}
                className="mt-0.5 h-4 w-4 accent-[#4a8a8c] flex-shrink-0"
              />
              <span className="text-gray-700 font-poppins text-sm leading-relaxed">
                I have read and agree to the CORAMA{' '}
                <a href="/terms-of-use" target="_blank" rel="noopener noreferrer" className="text-corama-teal hover:underline">Terms of Use</a>
                {' '}and{' '}
                <a href="/privacy-notice" target="_blank" rel="noopener noreferrer" className="text-corama-teal hover:underline">Privacy Notice</a>.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="text-corama-teal font-poppins text-sm font-medium hover:text-[#5a9a9c] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAgree}
                disabled={loading || !accepted}
                className="bg-corama-teal text-white font-poppins text-sm font-semibold px-8 py-2.5 rounded-lg hover:bg-[#5a9a9c] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Processing...
                  </>
                ) : (
                  'Agree and Continue'
                )}
              </button>
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
            <a href="/privacy-notice" className="hover:text-white transition-colors">Privacy Notice</a>
            <a href="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</a>
          </div>
          <div>admin@corama.ai</div>
        </div>
      </footer>
    </div>
  )
}

export default ConfirmTerms

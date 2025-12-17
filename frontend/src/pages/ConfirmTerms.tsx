import { useState } from 'react'
import { Loader2 } from 'lucide-react'

const ConfirmTerms = () => {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAgree = async () => {
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
    <div className="min-h-screen bg-[#0B0B0F]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <a href="/"><img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-3 sm:h-3.5 w-auto" /></a>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">IHCC</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">Support</a>
            <a href="/faq" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">FAQ</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <a href="/signup" className="text-corama-teal font-poppins text-sm font-medium hover:text-[#99c8ca] transition-colors">Sign up</a>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-24 sm:pt-32 pb-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-10">
            <h1 className="font-poppins font-black text-3xl sm:text-4xl md:text-5xl text-white mb-3">
              Automatic Renewal Terms and Conditions
            </h1>
            <p className="text-gray-400 font-poppins text-base sm:text-lg">General Questions</p>
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
              CONFIDENTIAL WORK PRODUCT
            </h2>
            <h3 className="text-gray-900 font-poppins font-bold text-base mb-4">
              Contract Radar Maximizer Terms of Use
            </h3>

            {/* Scrollable Content */}
            <div className="h-64 sm:h-80 overflow-y-auto pr-2 text-gray-700 font-poppins text-sm leading-relaxed space-y-4 border-t border-gray-200 pt-4">
              <p>
                The Federal Trade Commission recently put forth a new rule regulating automatically renewable 
                subscription services (the "Subscription") that consumers consent to. In a business-to-business 
                context, Contract Radar Maximizer must follow the below requirements for compliance when providing 
                subscription-based services to consumers.
              </p>

              <h4 className="font-bold text-gray-900">A. General Notice Requirements</h4>
              <p>
                Auto renewal laws require that consumers are given full notice of the terms and conditions of the 
                Subscription before they assent. The Contract Radar Maximizer terms have been drafted to satisfy 
                this requirement. The Terms should be prominently provided on the website and/or app at all times.
              </p>
              <p>
                In addition to the general notice, the Subscription page where consumers purchase the Subscription 
                must present the automatic renewal terms in both:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>A clear and conspicuous manner before the purchase is concluded</li>
                <li>In visual proximity to the request for consent to the offer.</li>
              </ul>
              <p>A model for usage by Contract Radar Maximizer is in Section E, Model Terms.</p>

              <h4 className="font-bold text-gray-900">B. Affirmative Consent</h4>
              <p>
                Consent to the auto-renewal Subscription terms must be affirmatively obtained. This can be done by 
                a check box or signature. Stating "By signing up, you agree to Terms" is not enough under the FTC rule. 
                An affirmative action must be taken. Records of consent must be kept for three years.
              </p>

              <h4 className="font-bold text-gray-900">C. Cancellation</h4>
              <p>
                Sellers using automatic renewal must provide a simple cancellation method. The method must be at 
                least as simple as it was to enroll. For example, if you sign-up online, the consumer must be able to 
                easily cancel online as well.
              </p>
              <p>
                Cancellation must be effectuated the same way as consent. For example, sellers cannot force a 
                consumer to cancel through a chatbot unless consent was also obtained in the same manner. Sellers may 
                not charge an additional fee for cancellation.
              </p>

              <h4 className="font-bold text-gray-900">D. Model Terms</h4>
              <p>
                The attached write-up should be posted on the page that the consumer signs up for the Subscription 
                and makes a payment. This write-up should also be used for the Auto Renewal Notices.
              </p>

              <h4 className="font-bold text-gray-900">IMPORTANT NOTICE ABOUT AUTO RENEWAL SUBSCRIPTIONS</h4>
              <p>
                Your Subscription with us will continue to auto-renew on a [monthly/yearly] basis until terminated.
                Your Contract Radar Maximizer membership (the "Subscription") is effective for the [XXX] period covered 
                by your payment and continues upon your payment of the [TIME PERIOD] renewal fee. The renewal cost for 
                your Subscription will automatically be charged, at the then-current rate for your Subscription. The 
                current Subscription pricing can be found at [SUBSCRIPTION PRICE PAGE OR LIST PRICING].
              </p>
              <p>
                To avoid the automatic renewal of your Subscription, you must cancel your Subscription at least [X] 
                days prior to the end of your current billing cycle. If you cancel less than [X] days before the end of 
                your current billing cycle, your Subscription will continue as scheduled and your cancellation will take 
                effect at the end of the next billing cycle.
              </p>
              <p>
                If you cancel your Subscription prior to the end of your Subscription, you will be entitled to continue 
                to access your Subscription through to the end of your current Subscription period. At the end of your 
                Subscription period, you will immediately lose all access to any content or features provided through your 
                Subscription.
              </p>
              <p>
                If you choose to discontinue your Subscription for any reason before the expiration of the Subscription 
                term for which you have paid, you may cancel your Subscription and opt out of auto-renewal by:
                [TERMINATION CHOICES]
              </p>
              <p>
                [FOR CHANGES IN FEE NOTICES: We reserve the right to change or adjust the annual Subscription dues for 
                any renewal term to be effective upon the renewal of your Subscription. Any price changes or changes to 
                your Subscription plan will take effect following notice to you. [INFORMATION ABOUT SUBSCRIPTION PRICING 
                UPDATE]]
              </p>
              <p>
                [FOR PROMOTIONAL/FREE TRIAL PERIODS: We currently offer special promotional pricing and trials for 
                our Subscriptions (each, a "Free Trial"). Information on our Free Trials can be found at [LINK]. At the 
                end of your Promotional Subscription term, your subscription will automatically renew at the price and 
                for the duration disclosed to you at the signup of your Promotional Subscription.] You can cancel your 
                Free Trial up to seven (7) days before the end of the Free Trial without penalty.
              </p>
              <p>
                For our full Terms, please visit: <a href="/terms-of-use" className="text-corama-teal hover:underline">Contract Radar Maximizer Terms of Use</a>
              </p>
            </div>

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
                disabled={loading}
                className="bg-corama-teal text-white font-poppins text-sm font-semibold px-8 py-2.5 rounded-lg hover:bg-[#5a9a9c] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Processing...
                  </>
                ) : (
                  'Agree'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/95 to-transparent py-5 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white font-poppins">
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

export default ConfirmTerms

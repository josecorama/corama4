import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api, CreditPackage } from '../services/api'

interface CreditPack {
  credits: number
  name: string
  priceCents: number
  displayPrice: number
  description: string
  highlighted?: boolean
}

interface CreditFeature {
  icon: string
  title: string
  description: string
  credits: number
  bgColor: string
}

const GetMoreCredits = () => {
  const [_credits, setCredits] = useState(0)
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([])
  const [_loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)

  useEffect(() => {
    loadCreditsData()
  }, [])

  const loadCreditsData = async () => {
    try {
      const data = await api.getCredits()
      setCredits(data.current_balance)
      
      // Transform API packages to component format
      if (data.packages && data.packages.length > 0) {
        const packs: CreditPack[] = data.packages.map((pkg: CreditPackage, index: number) => ({
          credits: pkg.credits,
          name: pkg.description || `${pkg.credits} Credits`,
          priceCents: pkg.price, // Keep cents for backend
          displayPrice: pkg.price / 100, // Convert to dollars for display
          description: pkg.description || 'Credit package',
          highlighted: index === 2 // Highlight the third package
        }))
        setCreditPacks(packs)
      }else {
        // Default packages if API doesn't return any
        setCreditPacks([
          { credits: 50, name: 'Starter Pack', priceCents: 1000, displayPrice: 10.00, description: 'Perfect for small projects' },
          { credits: 150, name: 'Professional Pack', priceCents: 2500, displayPrice: 25.00, description: 'Great for multiple proposals' },
          { credits: 500, name: 'Enterprise Pack', priceCents: 7500, displayPrice: 75.00, description: 'Best value for frequent users', highlighted: true },
          { credits: 1500, name: 'Agency Pack', priceCents: 20000, displayPrice: 200.00, description: 'For consulting firms and agencies' },
        ])
      }
    } catch (error) {
      console.error('Failed to load credits data:', error)
      // Set default packages on error
      setCreditPacks([
        { credits: 50, name: 'Starter Pack', priceCents: 1000, displayPrice: 10.00, description: 'Perfect for small projects' },
        { credits: 150, name: 'Professional Pack', priceCents: 2500, displayPrice: 25.00, description: 'Great for multiple proposals' },
        { credits: 500, name: 'Enterprise Pack', priceCents: 7500, displayPrice: 75.00, description: 'Best value for frequent users', highlighted: true },
        { credits: 1500, name: 'Agency Pack', priceCents: 20000, displayPrice: 200.00, description: 'For consulting firms and agencies' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (pack: CreditPack) => {
    setPurchasing(pack.credits)
    try {
      const result = await api.createCheckout(pack.credits, pack.priceCents)
      if (result.checkout_url) {
        window.location.href = result.checkout_url
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  const creditFeatures: CreditFeature[] = [
    {
      icon: '/static/app/dashboard/BasicAIChat.svg',
      title: 'Basic AI Chat',
      description: 'Get instant answers to your questions about government contracting, procurement processes, and general guidance.',
      credits: 1,
      bgColor: 'bg-[#5A7A8A]',
    },
    {
      icon: '/static/app/dashboard/ComplianceCheck.svg',
      title: 'Compliance Check',
      description: 'Deep analysis of contract opportunities to identify key requirements, evaluation criteria, and match them against your capabilities.',
      credits: 2,
      bgColor: 'bg-[#4A7A7C]',
    },
    {
      icon: '/static/app/dashboard/ContractAnalysis.svg',
      title: 'Contract Analysis',
      description: 'Verify that your capability statement or proposal meets all necessary compliance requirements for government contracting.',
      credits: 3,
      bgColor: 'bg-[#7AACAD]',
    },
    {
      icon: '/static/app/dashboard/FullProposal.svg',
      title: 'Full Proposal',
      description: 'Generate a comprehensive, professionally formatted proposal document tailored to a specific contract opportunity.',
      credits: 15,
      bgColor: 'bg-[#4A8A8C]',
    },
  ]

    return (
      <div className="flex min-h-screen bg-corama-dark">
        <Sidebar />
      
        <div className="flex-1 flex flex-col min-w-0">
          <Header credits={5} />
        
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
            {/* Page Title */}
            <h1 className="text-white font-poppins font-bold text-xl sm:text-2xl mb-6 lg:mb-8">Get More Credits</h1>

            {/* Credit Packs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 lg:mb-12">
              {creditPacks.map((pack, index) => (
                <div
                  key={index}
                  className="group rounded-xl p-4 sm:p-5 lg:p-6 card-gradient hover:bg-white text-white hover:text-corama-dark border-2 border-transparent hover:border-corama-teal transition-all duration-200 flex flex-col h-full"
                >
                  <p className="font-poppins text-xs sm:text-sm mb-2 text-gray-400 group-hover:text-gray-600 text-center">
                    {pack.credits} Credits
                  </p>
                  <div className="inline-block px-3 sm:px-4 py-1 rounded-full mb-3 sm:mb-4 border border-corama-teal/30 text-corama-teal group-hover:bg-corama-teal/20 group-hover:border-corama-teal/50 transition-all self-start">
                    <span className="font-poppins font-semibold text-sm sm:text-base">{pack.name}</span>
                  </div>
                  <div className="mb-3 sm:mb-4 flex flex-col items-center">
                    <div>
                      <span className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-600">$</span>
                      <span className="text-3xl sm:text-4xl font-bold text-corama-teal group-hover:text-corama-dark">
                        {pack.displayPrice.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-600 mt-1">/each</span>
                  </div>
                  <p className="font-poppins text-xs sm:text-sm mb-4 sm:mb-6 text-gray-400 group-hover:text-gray-600 flex-grow">
                    {pack.description}
                  </p>
                  <button
                    onClick={() => handlePurchase(pack)}
                    disabled={purchasing !== null}
                    className={`w-full py-2 rounded-lg font-poppins font-semibold text-sm sm:text-base transition-colors bg-corama-teal text-corama-dark group-hover:bg-corama-dark group-hover:text-white mt-auto ${purchasing !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {purchasing === pack.credits ? 'Processing...' : 'Choose Pack'}
                  </button>
                </div>
              ))}
            </div>

            {/* How Credits Work */}
            <h2 className="text-white font-poppins font-bold text-lg sm:text-xl mb-4 sm:mb-6">How Credits Work</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {creditFeatures.map((feature, index) => (
                <div key={index} className={`${feature.bgColor} rounded-xl p-4 sm:p-5 lg:p-6`}>
                  <div className="mb-3 sm:mb-4">
                    <img src={feature.icon} alt="" className="w-10 h-10" aria-hidden="true" />
                  </div>
                  <h3 className="text-[#1C4262] font-poppins font-bold text-base sm:text-lg mb-2 sm:mb-3">{feature.title}</h3>
                  <p className="text-[#1C4262]/80 font-poppins text-xs sm:text-sm mb-3 sm:mb-4">{feature.description}</p>
                  <p className="text-[#1C4262] font-poppins font-bold text-sm sm:text-base">{feature.credits} Credit{feature.credits > 1 ? 's' : ''}.</p>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    )
}

export default GetMoreCredits

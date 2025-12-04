import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { MessageSquare, Search, Shuffle, FileText } from 'lucide-react'
import { api, CreditPackage } from '../services/api'

interface CreditPack {
  credits: number
  name: string
  price: number
  description: string
  highlighted?: boolean
}

interface CreditFeature {
  icon: React.ReactNode
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
          price: pkg.price,
          description: pkg.description || 'Credit package',
          highlighted: index === 2 // Highlight the third package
        }))
        setCreditPacks(packs)
      } else {
        // Default packages if API doesn't return any
        setCreditPacks([
          { credits: 50, name: 'Starter Pack', price: 10.00, description: 'Perfect for small projects' },
          { credits: 150, name: 'Professional Pack', price: 25.00, description: 'Great for multiple proposals' },
          { credits: 500, name: 'Enterprise Pack', price: 75.00, description: 'Best value for frequent users', highlighted: true },
          { credits: 1500, name: 'Agency Pack', price: 200.00, description: 'For consulting firms and agencies' },
        ])
      }
    } catch (error) {
      console.error('Failed to load credits data:', error)
      // Set default packages on error
      setCreditPacks([
        { credits: 50, name: 'Starter Pack', price: 10.00, description: 'Perfect for small projects' },
        { credits: 150, name: 'Professional Pack', price: 25.00, description: 'Great for multiple proposals' },
        { credits: 500, name: 'Enterprise Pack', price: 75.00, description: 'Best value for frequent users', highlighted: true },
        { credits: 1500, name: 'Agency Pack', price: 200.00, description: 'For consulting firms and agencies' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (pack: CreditPack) => {
    setPurchasing(pack.credits)
    try {
      const result = await api.createCheckout(pack.credits, pack.price)
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
      icon: <MessageSquare size={24} />,
      title: 'Basic AI Chat',
      description: 'Get instant answers to your questions about government contracting, procurement processes, and general guidance.',
      credits: 1,
      bgColor: 'bg-corama-teal/80',
    },
    {
      icon: <Search size={24} />,
      title: 'Compliance Check',
      description: 'Deep analysis of contract opportunities to identify key requirements, evaluation criteria, and match them against your capabilities.',
      credits: 2,
      bgColor: 'bg-corama-teal/70',
    },
    {
      icon: <Shuffle size={24} />,
      title: 'Contract Analysis',
      description: 'Verify that your capability statement or proposal meets all necessary compliance requirements for government contracting.',
      credits: 3,
      bgColor: 'bg-corama-teal/60',
    },
    {
      icon: <FileText size={24} />,
      title: 'Full Proposal',
      description: 'Generate a comprehensive, professionally formatted proposal document tailored to a specific contract opportunity.',
      credits: 15,
      bgColor: 'bg-corama-teal/50',
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
                  className={`rounded-xl p-4 sm:p-5 lg:p-6 ${
                    pack.highlighted
                      ? 'bg-white text-corama-dark'
                      : 'card-gradient text-white'
                  }`}
                >
                  <p className={`font-poppins text-xs sm:text-sm mb-2 ${pack.highlighted ? 'text-gray-600' : 'text-gray-400'}`}>
                    {pack.credits} Credits
                  </p>
                  <div className={`inline-block px-3 sm:px-4 py-1 rounded-full mb-3 sm:mb-4 ${
                    pack.highlighted
                      ? 'bg-corama-teal/20 text-corama-teal'
                      : 'border border-corama-teal/30 text-corama-teal'
                  }`}>
                    <span className="font-poppins font-semibold text-sm sm:text-base">{pack.name}</span>
                  </div>
                  <div className="mb-3 sm:mb-4">
                    <span className={`text-xs sm:text-sm ${pack.highlighted ? 'text-gray-600' : 'text-gray-400'}`}>$</span>
                    <span className={`text-3xl sm:text-4xl font-bold ${pack.highlighted ? 'text-corama-dark' : 'text-corama-teal'}`}>
                      {pack.price.toFixed(2)}
                    </span>
                    <span className={`text-xs sm:text-sm ${pack.highlighted ? 'text-gray-600' : 'text-gray-400'}`}>/each</span>
                  </div>
                  <p className={`font-poppins text-xs sm:text-sm mb-4 sm:mb-6 ${pack.highlighted ? 'text-gray-600' : 'text-gray-400'}`}>
                    {pack.description}
                  </p>
                  <button
                    onClick={() => handlePurchase(pack)}
                    disabled={purchasing !== null}
                    className={`w-full py-2 rounded-lg font-poppins font-semibold text-sm sm:text-base transition-colors ${
                      pack.highlighted
                        ? 'bg-corama-dark text-white hover:bg-corama-darker'
                        : 'bg-corama-teal text-corama-dark hover:bg-corama-teal-light'
                    } ${purchasing !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  <div className="text-white mb-3 sm:mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-white font-poppins font-bold text-base sm:text-lg mb-2 sm:mb-3">{feature.title}</h3>
                  <p className="text-white/80 font-poppins text-xs sm:text-sm mb-3 sm:mb-4">{feature.description}</p>
                  <p className="text-white font-poppins font-bold text-sm sm:text-base">{feature.credits} Credit{feature.credits > 1 ? 's' : ''}.</p>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    )
}

export default GetMoreCredits

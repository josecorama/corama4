import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { Edit, Printer } from 'lucide-react'
import { api, ContractMatch as ApiContractMatch } from '../services/api'

// SVG asset paths for contract cards
const CircleIcon = '/static/app/dashboard/Circle.svg'
const StarsIcon = '/static/app/dashboard/Stars.svg'
const ContractSiteIcon = '/static/app/dashboard/ContractSite.svg'
const AskAIIcon = '/static/app/dashboard/AskAI.svg'

interface ContractMatch {
  rank: number
  state: string
  contractValue: string
  submissionDeadline: string
  industrySector: string
  name: string
  contractingAgency: string
  matchPercentage: number
  detailLink?: string
}

const TopFiveContracts = () => {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<ContractMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [_hasMatches, setHasMatches] = useState(false)

  useEffect(() => {
    loadTopFive()
  }, [])

  const loadTopFive = async () => {
    setLoading(true)
    try {
      const data = await api.getTopFiveContracts()
      if (data.success && data.matches) {
        const transformedContracts: ContractMatch[] = data.matches.map((m: ApiContractMatch) => ({
          rank: m.rank,
          state: m.State || 'N/A',
          contractValue: m.Budget || 'TBD',
          submissionDeadline: m.Due_Date || 'N/A',
          industrySector: m.Category || 'N/A',
          name: m.Bid_Name,
          contractingAgency: m.Organization || m.Company || 'N/A',
          matchPercentage: Math.round((m.Similarity_Score || 0) * 100),
          detailLink: m.Detail_Link
        }))
        setContracts(transformedContracts)
        setHasMatches(data.has_matches)
      }
    } catch (error) {
      console.error('Failed to load top five contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVisitSite = (url?: string) => {
    if (url) {
      window.open(url, '_blank')
    }
  }

    return (
      <div className="relative flex min-h-screen bg-corama-dark">
        {/* Horizontal separator line across entire width, below header (lg only) */}
        <div className="hidden lg:block absolute inset-x-0 top-16 h-px bg-white z-10" aria-hidden="true" />
        
        <Sidebar />
      
        <div className="flex-1 flex flex-col min-w-0">
          <Header credits={5} />
        
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400 font-poppins">Loading top contracts...</p>
              </div>
            ) : contracts.length === 0 ? (
              // Redirect to the dedicated No Capability Statement page
              (() => {
                navigate('/no-capability-statement')
                return (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-400 font-poppins">Redirecting...</p>
                  </div>
                )
              })()
            ) : (
            <div className="space-y-4 lg:space-y-6">
              {contracts.map((contract) => (
                <div key={contract.rank} className="rounded-2xl p-4 sm:p-5 lg:p-6 relative" style={{ backgroundColor: '#2F3C4F' }}>
                  {/* Match badge - absolute positioned at top right */}
                  <div className="absolute top-4 right-4 lg:top-6 lg:right-6">
                    <span className="bg-white text-corama-dark font-poppins text-sm font-bold px-4 py-1.5 rounded-full">
                      {Number.isFinite(contract.matchPercentage) ? `${contract.matchPercentage}% Match` : 'Match Pending'}
                    </span>
                  </div>

                  <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-8">
                    {/* Left column: Rank circle with stars */}
                    <div className="flex lg:flex-col items-center gap-3 lg:gap-2 flex-shrink-0">
                      <div className="relative">
                        <img src={CircleIcon} alt="" className="w-32 h-32 lg:w-40 lg:h-40" />
                        <span className="absolute inset-0 flex items-center justify-center text-5xl lg:text-6xl font-bold text-white" style={{ paddingTop: '4px' }}>
                          {contract.rank}
                        </span>
                      </div>
                      <img src={StarsIcon} alt="" className="w-20 lg:w-24" />
                    </div>

                    {/* Middle column: Contract Details */}
                    <div className="flex-1 w-full lg:pl-4">
                      {/* State name */}
                      <h3 className="text-white font-poppins font-bold text-lg lg:text-xl mb-4">{contract.state}</h3>

                      {/* Top row: Contract Value, Submission Deadline, Industry Sector */}
                      <div className="grid grid-cols-3 gap-x-6 lg:gap-x-10 mb-4">
                        <div>
                          <span className="inline-block bg-corama-teal text-white font-poppins text-xs px-3 py-1 rounded-full mb-2">
                            Contract Value
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.contractValue}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-corama-teal text-white font-poppins text-xs px-3 py-1 rounded-full mb-2">
                            Submission Deadline
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base whitespace-pre-line">{contract.submissionDeadline}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-corama-teal text-white font-poppins text-xs px-3 py-1 rounded-full mb-2">
                            Industry Sector
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.industrySector}</p>
                        </div>
                      </div>

                      {/* Bottom row: Name, Contracting Agency, and Buttons */}
                      <div className="grid grid-cols-3 gap-x-6 lg:gap-x-10">
                        <div>
                          <span className="inline-block bg-corama-teal text-white font-poppins text-xs px-3 py-1 rounded-full mb-2">
                            Name
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.name}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-corama-teal text-white font-poppins text-xs px-3 py-1 rounded-full mb-2">
                            Contracting Agency
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.contractingAgency}</p>
                        </div>
                        {/* Action Buttons - aligned with bottom row */}
                        <div className="flex flex-col gap-2 justify-start">
                          <button 
                            onClick={() => handleVisitSite(contract.detailLink)}
                            className="flex items-center justify-center gap-2 text-white font-poppins text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
                            style={{ backgroundColor: '#275570' }}
                          >
                            Contract Website
                            <img src={ContractSiteIcon} alt="" className="w-5 h-5" />
                          </button>
                          <button 
                            className="flex items-center justify-center gap-2 text-white font-poppins text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
                            style={{ backgroundColor: '#275570' }}
                          >
                            Ask AI About This
                            <img src={AskAIIcon} alt="" className="w-6 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bottom Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6 lg:mt-8">
                <button className="flex items-center gap-3 card-gradient text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:bg-corama-darker transition-colors">
                  <Edit size={20} />
                  <div className="text-left">
                    <p className="font-bold text-sm sm:text-base">Edit Profile</p>
                    <p className="text-xs sm:text-sm text-gray-400">Click to edit your registration.</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 card-gradient text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:bg-corama-darker transition-colors">
                  <Printer size={20} />
                  <div className="text-left">
                    <p className="font-bold text-sm sm:text-base">Print Results</p>
                    <p className="text-xs sm:text-sm text-gray-400">Click to finalize your registration.</p>
                  </div>
                </button>
              </div>
            </div>
            )}
          </main>
        </div>
      </div>
    )
}

export default TopFiveContracts

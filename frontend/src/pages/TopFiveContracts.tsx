import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { Globe, MessageSquare, Star, Edit, Printer } from 'lucide-react'
import { api, ContractMatch as ApiContractMatch } from '../services/api'

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
      <div className="flex min-h-screen bg-corama-dark">
        <Sidebar />
      
        <div className="flex-1 flex flex-col min-w-0">
          <Header credits={5} />
        
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400 font-poppins">Loading top contracts...</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className="card-gradient rounded-xl p-6 text-center">
                <p className="text-white font-poppins text-lg mb-2">No matched contracts yet</p>
                <p className="text-gray-400 font-poppins text-sm">Upload your capability statement to see your top contract matches.</p>
              </div>
            ) : (
            <div className="space-y-4 lg:space-y-6">
              {contracts.map((contract) => (
                <div key={contract.rank} className="card-gradient rounded-xl p-3 sm:p-4 lg:p-6">
                  <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
                    {/* Rank Badge - Horizontal on mobile, vertical on desktop */}
                    <div className="flex lg:flex-col items-center gap-3 lg:gap-0 w-full lg:w-auto">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full border-4 border-corama-teal flex items-center justify-center bg-corama-dark flex-shrink-0">
                        <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-corama-teal">{contract.rank}</span>
                      </div>
                      <div className="flex gap-1 lg:mt-2">
                        {[1, 2, 3].map((star) => (
                          <Star key={star} size={14} className="text-corama-teal fill-corama-teal" />
                        ))}
                      </div>
                      {/* Mobile match percentage */}
                      <span className="lg:hidden ml-auto bg-white text-corama-dark font-poppins text-xs sm:text-sm font-bold px-3 py-1 rounded-full">
                        {contract.matchPercentage}% Match
                      </span>
                    </div>

                    {/* Contract Details */}
                    <div className="flex-1 w-full">
                      <div className="hidden lg:flex justify-between items-start mb-4">
                        <h3 className="text-white font-poppins font-bold text-lg">{contract.state}</h3>
                        <span className="bg-white text-corama-dark font-poppins text-sm font-bold px-4 py-1 rounded-full">
                          {contract.matchPercentage}% Match
                        </span>
                      </div>
                    
                      {/* Mobile state title */}
                      <h3 className="lg:hidden text-white font-poppins font-bold text-base sm:text-lg mb-3">{contract.state}</h3>

                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-3 lg:mb-4">
                        <div>
                          <span className="inline-block bg-corama-teal/20 text-corama-teal font-poppins text-xs px-2 py-1 rounded mb-1">
                            Contract Value
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.contractValue}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-corama-teal/20 text-corama-teal font-poppins text-xs px-2 py-1 rounded mb-1">
                            Deadline
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base whitespace-pre-line">{contract.submissionDeadline}</p>
                        </div>
                        <div className="col-span-2 lg:col-span-1">
                          <span className="inline-block bg-corama-teal/20 text-corama-teal font-poppins text-xs px-2 py-1 rounded mb-1">
                            Industry Sector
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.industrySector}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                        <div>
                          <span className="inline-block bg-corama-teal/20 text-corama-teal font-poppins text-xs px-2 py-1 rounded mb-1">
                            Name
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.name}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-corama-teal/20 text-corama-teal font-poppins text-xs px-2 py-1 rounded mb-1">
                            Contracting Agency
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.contractingAgency}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto">
                      <button 
                        onClick={() => handleVisitSite(contract.detailLink)}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white text-corama-dark font-poppins text-xs sm:text-sm px-3 lg:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="hidden sm:inline">Contract</span> Website <Globe size={16} />
                      </button>
                      <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white text-corama-dark font-poppins text-xs sm:text-sm px-3 lg:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        Ask AI <MessageSquare size={16} />
                      </button>
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

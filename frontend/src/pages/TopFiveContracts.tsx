import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import FilterPopup from '../components/FilterPopup'
import { Edit, Printer, RefreshCw } from 'lucide-react'
import { api, ContractMatch as ApiContractMatch } from '../services/api'

// SVG asset paths for contract cards
const CircleIcon = '/static/app/dashboard/Circle.svg'
const StarsIcon = '/static/app/dashboard/Stars.svg'
const ContractSiteIcon = '/static/app/dashboard/ContractSite.svg'
const AskAIIcon = '/static/app/dashboard/AskAI.svg'
const SortByIcon = '/static/app/dashboard/SortBy.svg'

interface ContractMatch {
  rank: number
  state: string
  contractValue: string
  submissionDeadline: string
  naicsCode: string
  name: string
  contractingAgency: string
  matchPercentage: number
  detailLink?: string
}

const TopFiveContracts = () => {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<ContractMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [hasMatches, setHasMatches] = useState<boolean | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [contractType, setContractType] = useState('all')
  const [selectedStates, setSelectedStates] = useState<string[]>(['all', 'IL', 'IN'])
  const [noFilterResults, setNoFilterResults] = useState(false)

  // Redirect to dashboard if user has no matches at all
  useEffect(() => {
    if (!loading && hasMatches === false) {
      navigate('/dashboard')
    }
  }, [loading, hasMatches, navigate])

  useEffect(() => {
    // Load with no filters on initial load - the API will return all matches from CSV
    // The default filter state ('all') is just for the UI display
    loadTopFive()
  }, [])

  const loadTopFive = async (filterContractType?: string, filterStates?: string[]) => {
    setLoading(true)
    setNoFilterResults(false)
    try {
      const data = await api.getTopFiveContracts(filterContractType, filterStates)
      if (data.success) {
        const transformedContracts: ContractMatch[] = (data.matches || []).map((m: ApiContractMatch) => {
          // Parse similarity score - handle both percentage strings and decimals
          let matchPct = 0
          const simScore = m.Similarity_Score
          if (typeof simScore === 'string') {
            // Handle "52.83%" format
            matchPct = parseFloat(simScore.replace('%', '')) || 0
          } else if (typeof simScore === 'number') {
            // Handle decimal format (0.5283) or already percentage (52.83)
            matchPct = simScore > 1 ? simScore : simScore * 100
          }
          
          return {
            rank: m.rank,
            state: m.State || 'N/A',
            contractValue: m.Budget || 'TBD',
            submissionDeadline: m.Due_Date || 'N/A',
            naicsCode: m.NAICS_Code || 'N/A',
            name: m.Bid_Name,
            contractingAgency: m.Organization || m.Company || 'N/A',
            matchPercentage: Math.round(matchPct),
            detailLink: m.Detail_Link
          }
        })
        setContracts(transformedContracts)
        setHasMatches(data.has_matches)
        
        // Check if filters produced no results but user has matches overall
        if (data.has_matches && transformedContracts.length === 0) {
          setNoFilterResults(true)
        }
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

  const handleRerunMatching = async (filterContractType?: string, filterStates?: string[]) => {
    setRerunning(true)
    setNoFilterResults(false)
    try {
      // Convert contract type to array format expected by backend
      const contractTypes = filterContractType && filterContractType !== 'all' && filterContractType !== '' 
        ? [filterContractType] 
        : []
      const states = filterStates?.filter(s => s !== 'all') || []
      
      const data = await api.rerunTopFiveMatching(contractTypes, states)
      if (data.success) {
        const transformedContracts: ContractMatch[] = (data.matches || []).map((m: ApiContractMatch) => {
          let matchPct = 0
          const simScore = m.Similarity_Score
          if (typeof simScore === 'string') {
            matchPct = parseFloat(simScore.replace('%', '')) || 0
          } else if (typeof simScore === 'number') {
            matchPct = simScore > 1 ? simScore : simScore * 100
          }
          
          return {
            rank: m.rank,
            state: m.State || 'N/A',
            contractValue: m.Budget || 'TBD',
            submissionDeadline: m.Due_Date || 'N/A',
            naicsCode: m.NAICS_Code || 'N/A',
            name: m.Bid_Name,
            contractingAgency: m.Organization || m.Company || 'N/A',
            matchPercentage: Math.round(matchPct),
            detailLink: m.Detail_Link
          }
        })
        setContracts(transformedContracts)
        // Don't change hasMatches here - rerun with filters returning 0 results
        // doesn't mean the user has no matches at all, just that filters are too restrictive
        // Only show "no filter results" message instead of redirecting to dashboard
        
        if (transformedContracts.length === 0) {
          setNoFilterResults(true)
        } else {
          // Only set hasMatches to true if we got results
          // Never set it to false from rerun - that would cause redirect to dashboard
          setHasMatches(true)
        }
      } else {
        console.error('Rerun matching failed:', data.error)
        alert(data.error || 'Failed to refresh matches. Please try again.')
      }
    } catch (error) {
      console.error('Failed to rerun matching:', error)
      alert('Failed to refresh matches. Please try again.')
    } finally {
      setRerunning(false)
    }
  }

  const handleApplyFilter = (newContractType: string, newStates: string[]) => {
    setContractType(newContractType)
    setSelectedStates(newStates)
    // Re-run matching with the new filters
    handleRerunMatching(newContractType, newStates)
  }

    return (
      <div className="min-h-screen bg-corama-dark">
        {/* Header spans full width at top */}
        <Header credits={5} />
        
        {/* Sidebar + Content row below header */}
        <div className="flex">
          {/* Horizontal separator line across entire viewport width, below header (lg only) */}
          <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
          
          <Sidebar />
        
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
              {/* Page Title and Action Buttons */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl">Top Five Contracts</h1>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleRerunMatching(contractType, selectedStates)}
                    disabled={rerunning}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-poppins text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#6bb4b5' }}
                  >
                    <RefreshCw size={16} className={rerunning ? 'animate-spin' : ''} />
                    {rerunning ? 'Refreshing...' : 'Refresh Matches'}
                  </button>
                  <button 
                    onClick={() => setIsFilterOpen(true)}
                    className="hover:opacity-90 transition-opacity"
                  >
                    <img src={SortByIcon} alt="Sort By" className="h-10 lg:h-12" />
                  </button>
                </div>
              </div>

                        {loading || rerunning ? (
                          <div className="flex items-center justify-center h-64">
                            <p className="text-gray-400 font-poppins">{rerunning ? 'Refreshing matches...' : 'Loading top contracts...'}</p>
                          </div>
                        ) : noFilterResults ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-400 font-poppins text-lg mb-4">No contracts match these filters.</p>
                <button 
                  onClick={() => {
                    setContractType('')
                    setSelectedStates([])
                    loadTopFive()
                  }}
                  className="px-6 py-2 rounded-full font-poppins text-sm font-semibold text-white"
                  style={{ backgroundColor: '#6bb4b5' }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (!loading && hasMatches === false) ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400 font-poppins">Redirecting to dashboard...</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-400 font-poppins text-lg mb-4">No contracts to show yet.</p>
                <button 
                  onClick={() => handleRerunMatching(contractType, selectedStates)}
                  className="px-6 py-2 rounded-full font-poppins text-sm font-semibold text-white"
                  style={{ backgroundColor: '#6bb4b5' }}
                >
                  Refresh Matches
                </button>
              </div>
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
                            NAICS Code
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.naicsCode}</p>
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
                        {/* Action Buttons - aligned with bottom row, pill style matching NAICS Code label */}
                        <div className="flex flex-col gap-2 justify-start items-start">
                          <button 
                            onClick={() => handleVisitSite(contract.detailLink)}
                            className="inline-flex items-center justify-center gap-2 text-white font-poppins text-xs px-3 py-1 rounded-full hover:opacity-90 transition-colors"
                            style={{ backgroundColor: '#275570' }}
                          >
                            Contract Website
                            <img src={ContractSiteIcon} alt="" className="w-4 h-4" />
                          </button>
                          <button 
                            className="inline-flex items-center justify-center gap-2 text-white font-poppins text-xs px-3 py-1 rounded-full hover:opacity-90 transition-colors"
                            style={{ backgroundColor: '#275570' }}
                          >
                            Ask AI About This
                            <img src={AskAIIcon} alt="" className="w-5 h-4" />
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

        {/* Filter Popup */}
        <FilterPopup 
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleApplyFilter}
        />
      </div>
    )
}

export default TopFiveContracts

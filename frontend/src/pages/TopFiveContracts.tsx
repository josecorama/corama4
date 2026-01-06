import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import FilterPopup from '../components/FilterPopup'
import { InlineLoading } from '../components/ThinkingPopup'
import { Edit, Printer, RefreshCw } from 'lucide-react'
import { api, ContractMatch as ApiContractMatch } from '../services/api'

// SVG asset paths for contract cards
const TopSignBaseIcon = '/static/app/dashboard/TopSignBase.svg'
const StarSingleIcon = '/static/app/dashboard/StarSingle.svg'
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

// Demo data for testing UI without Qdrant - activated with ?demo=1
const DEMO_CONTRACTS: ContractMatch[] = [
  {
    rank: 1,
    state: 'Illinois',
    contractValue: '$10,000',
    submissionDeadline: '2025-12-19\n00-00-00',
    naicsCode: '333414',
    name: 'Electrical Heating Element, NSN 4520-01-559-0984',
    contractingAgency: 'DEPT OF DEFENSE.DEFENSE LOGISTICS AGENCY.',
    matchPercentage: 17,
    detailLink: 'https://sam.gov'
  },
  {
    rank: 2,
    state: 'California',
    contractValue: '$25,000',
    submissionDeadline: '2025-12-25\n14-00-00',
    naicsCode: '541330',
    name: 'Engineering Services for Infrastructure Project',
    contractingAgency: 'DEPT OF TRANSPORTATION',
    matchPercentage: 45,
    detailLink: 'https://sam.gov'
  },
  {
    rank: 3,
    state: 'Texas',
    contractValue: '$50,000',
    submissionDeadline: '2026-01-15\n09-00-00',
    naicsCode: '236220',
    name: 'Commercial Building Construction',
    contractingAgency: 'GENERAL SERVICES ADMINISTRATION',
    matchPercentage: 62,
    detailLink: 'https://sam.gov'
  },
  {
    rank: 4,
    state: 'New York',
    contractValue: '$15,000',
    submissionDeadline: '2026-01-20\n17-00-00',
    naicsCode: '541512',
    name: 'IT Consulting Services',
    contractingAgency: 'DEPT OF HOMELAND SECURITY',
    matchPercentage: 38,
    detailLink: 'https://sam.gov'
  },
  {
    rank: 5,
    state: 'Florida',
    contractValue: '$75,000',
    submissionDeadline: '2026-02-01\n12-00-00',
    naicsCode: '237310',
    name: 'Highway Bridge Rehabilitation',
    contractingAgency: 'FEDERAL HIGHWAY ADMINISTRATION',
    matchPercentage: 71,
    detailLink: 'https://sam.gov'
  }
]

const TopFiveContracts = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === '1'
  const [contracts, setContracts] = useState<ContractMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [hasMatches, setHasMatches] = useState<boolean | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [contractType, setContractType] = useState('all')
  const [selectedStates, setSelectedStates] = useState<string[]>(['all', 'IL', 'IN'])
  const [noFilterResults, setNoFilterResults] = useState(false)

  // Redirect to no-capability-statement page if user has no matches at all (skip in demo mode)
  useEffect(() => {
    if (!loading && hasMatches === false && !isDemo) {
      navigate('/no-capability-statement')
    }
  }, [loading, hasMatches, navigate, isDemo])

  useEffect(() => {
    // In demo mode, use mock data instead of API
    if (isDemo) {
      setContracts(DEMO_CONTRACTS)
      setHasMatches(true)
      setLoading(false)
      return
    }
    // Load with no filters on initial load - the API will return all matches from CSV
    // The default filter state ('all') is just for the UI display
    loadTopFive()
  }, [isDemo])

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
      // Set hasMatches to false on error to prevent infinite loading state
      // This will trigger the redirect to dashboard
      setHasMatches(false)
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
            <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
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

                        {loading || rerunning || hasMatches === null ? (
                          <div className="flex items-center justify-center h-64">
                            {rerunning ? (
                              <InlineLoading text="Refreshing" size="large" darkMode={true} />
                            ) : (
                              <InlineLoading text="Loading" size="large" darkMode={true} />
                            )}
                          </div>
                        ) : hasMatches === false ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400 font-poppins">Redirecting to dashboard...</p>
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
                  {/* State name - top left */}
                  <h3 className="text-[#6BB4B5] font-poppins font-bold text-lg lg:text-xl mb-4">{contract.state}</h3>
                  
                  {/* Match badge - absolute positioned at top right with gradient */}
                  <div className="absolute top-4 right-4 lg:top-6 lg:right-6">
                    <span 
                      className="font-poppins text-sm font-bold px-5 py-2 rounded-full text-white"
                      style={{ background: 'radial-gradient(ellipse at 50% 150%, #6BB4B5 0%, #99C8CA 100%)' }}
                    >
                      {Number.isFinite(contract.matchPercentage) ? `${contract.matchPercentage}% Match` : 'Match Pending'}
                    </span>
                  </div>

                  <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
                    {/* Left column: Top Sign with rank number and decorative stars */}
                    <div className="relative flex-shrink-0" style={{ width: '160px', height: '180px' }}>
                      {/* Top Sign base image with fixed dimensions for proper positioning */}
                      <div className="relative w-32 h-32 lg:w-36 lg:h-36">
                        <img src={TopSignBaseIcon} alt="" className="absolute inset-0 w-full h-full" />
                        {/* Dynamic rank number overlay - centered in the yellow star area */}
                        <span className="absolute left-1/2 top-[35%] transform -translate-x-1/2 -translate-y-1/2 text-3xl lg:text-4xl font-poppins font-bold text-white leading-none">
                          {contract.rank}
                        </span>
                      </div>
                      {/* Decorative stars positioned around the Top Sign */}
                      <img src={StarSingleIcon} alt="" className="absolute w-10 h-9 lg:w-12 lg:h-10 pointer-events-none select-none" style={{ left: '-15px', top: '55%' }} />
                      <img src={StarSingleIcon} alt="" className="absolute w-6 h-5 lg:w-8 lg:h-7 pointer-events-none select-none" style={{ left: '15px', top: '90%' }} />
                    </div>

                    {/* Middle column: Contract Details with white pill headers */}
                    <div className="flex-1 w-full">
                      {/* Top row: Contract Value, Submission Deadline, NAICS Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-4">
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-xs font-medium px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            Contract Value
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.contractValue}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-xs font-medium px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            Submission Deadline
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base whitespace-pre-line">{contract.submissionDeadline?.replace('T', '\n')}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-xs font-medium px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            NAICS Code
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.naicsCode}</p>
                        </div>
                      </div>

                      {/* Bottom row: Name, Contracting Agency */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-xs font-medium px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            Name
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.name}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-xs font-medium px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            Contracting Agency
                          </span>
                          <p className="text-white font-poppins font-bold text-sm lg:text-base">{contract.contractingAgency}</p>
                        </div>
                        {/* Action Buttons - with gradient background, larger size */}
                        <div className="flex flex-col gap-3 justify-start items-start">
                          <button 
                            onClick={() => handleVisitSite(contract.detailLink)}
                            className="inline-flex items-center justify-center gap-3 text-white font-poppins text-sm font-medium px-6 py-2.5 rounded-full hover:opacity-90 transition-colors"
                            style={{ background: 'linear-gradient(180deg, #1C4262 6.25%, #284165 96%)' }}
                          >
                            Contract Website
                            <img src={ContractSiteIcon} alt="" className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => navigate('/ai-assistant', { state: { contractName: contract.name, contractAgency: contract.contractingAgency } })}
                            className="inline-flex items-center justify-center gap-3 text-white font-poppins text-sm font-medium px-6 py-2.5 rounded-full hover:opacity-90 transition-colors"
                            style={{ background: 'linear-gradient(180deg, #1C4262 6.25%, #284165 96%)' }}
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
                <button className="flex items-center gap-3 card-gradient-original text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:bg-corama-darker transition-colors">
                  <Edit size={20} />
                  <div className="text-left">
                    <p className="font-bold text-sm sm:text-base">Edit Profile</p>
                    <p className="text-xs sm:text-sm text-gray-400">Click to edit your registration.</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 card-gradient-original text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:bg-corama-darker transition-colors">
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

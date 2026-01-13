import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import FilterPopup from '../components/FilterPopup'
import { InlineLoading } from '../components/ThinkingPopup'
import { RefreshCw } from 'lucide-react'
import { api, ContractMatch as ApiContractMatch } from '../services/api'

// Print styles - injected into document head
const printStyles = `
@media print {
  /* Hide non-essential elements */
  aside, header, button, .no-print {
    display: none !important;
  }
  
  /* Reset page layout */
  body, html {
    background: white !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Make main content full width */
  main {
    padding: 0 !important;
    margin: 0 !important;
  }
  
  .flex {
    display: block !important;
  }
  
  /* Style contract cards for print */
  .print-card {
    background: #2F3C4F !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    page-break-inside: avoid !important;
    margin-bottom: 20px !important;
    border: 2px solid #333 !important;
    border-radius: 12px !important;
    padding: 16px !important;
  }
  
  /* Ensure text is visible */
  .print-card * {
    color: black !important;
  }
  
  .print-card h3, .print-card .text-white {
    color: #1a1a1a !important;
  }
  
  /* Match badge styling for print */
  .print-badge {
    background: #6BB4B5 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color: white !important;
    padding: 4px 12px !important;
    border-radius: 20px !important;
  }
  
  /* Trophy/rank styling for print */
  .print-rank {
    font-size: 24px !important;
    font-weight: bold !important;
    color: #1C4262 !important;
  }
  
  /* Label badges for print */
  .print-label {
    background: #f0f0f0 !important;
    border: 1px solid #ccc !important;
    padding: 4px 12px !important;
    border-radius: 20px !important;
    font-weight: bold !important;
    font-size: 12px !important;
  }
  
  /* Page title for print */
  .print-title {
    font-size: 24px !important;
    font-weight: bold !important;
    color: #1a1a1a !important;
    margin-bottom: 20px !important;
    display: block !important;
  }
}
`

// SVG asset paths for contract cards
const TrophyBackgroundIcon = '/static/app/dashboard/TrophyBackground.svg'
const ContractSiteIcon = '/static/app/dashboard/ContractSite.svg'
const AskAIIcon = '/static/app/dashboard/AskAI.svg'
const SortByIcon = '/static/app/dashboard/SortBy.svg'
const PrintResultsIcon = '/static/app/dashboard/PrintResults.svg'

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMatches, setHasMatches] = useState<boolean | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [contractType, setContractType] = useState('all')
  const [selectedStates, setSelectedStates] = useState<string[]>(['all', 'IL', 'IN'])
  const [noFilterResults, setNoFilterResults] = useState(false)
  
  // Pagination state
  const [currentOffset, setCurrentOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalAvailable, setTotalAvailable] = useState(0)

  // Inject print styles into document head
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.id = 'top-five-print-styles'
    styleElement.textContent = printStyles
    document.head.appendChild(styleElement)
    
    return () => {
      const existingStyle = document.getElementById('top-five-print-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  // Redirect to no-capability-statement page if user has no matches at all
  // Pass the current page as returnTo so user is redirected back after uploading CS
  useEffect(() => {
    if (!loading && hasMatches === false) {
      navigate('/no-capability-statement?returnTo=/top-five-contracts')
    }
  }, [loading, hasMatches, navigate])

  useEffect(() => {
    // Load with no filters on initial load - the API will return all matches from CSV
    // The default filter state ('all') is just for the UI display
    loadTopFive()
  }, [])

  const loadTopFive = async (filterContractType?: string, filterStates?: string[], offset: number = 0) => {
    setLoading(true)
    setNoFilterResults(false)
    try {
      const data = await api.getTopFiveContracts(filterContractType, filterStates, offset)
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
        setCurrentOffset(offset)
        setHasMore(data.has_more || false)
        setTotalAvailable(data.total_available || 0)
        
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
  
  // Load more contracts (next 5)
  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return
    
    setLoadingMore(true)
    try {
      const nextOffset = currentOffset + 5
      const data = await api.getTopFiveContracts(
        contractType !== 'all' ? contractType : undefined,
        selectedStates.filter(s => s !== 'all'),
        nextOffset
      )
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
        // Replace current contracts with the next page
        setContracts(transformedContracts)
        setCurrentOffset(nextOffset)
        setHasMore(data.has_more || false)
      }
    } catch (error) {
      console.error('Failed to load more contracts:', error)
    } finally {
      setLoadingMore(false)
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
      <div className="h-screen bg-corama-dark overflow-y-auto">
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
                              <InlineLoading text="Refreshing" size="large" />
                            ) : (
                              <InlineLoading text="Loading" size="large" />
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
                <div key={contract.rank} className="print-card rounded-2xl p-4 sm:p-5 lg:p-6 relative border border-white" style={{ backgroundColor: '#2F3C4F' }}>
                  {/* State name - top left */}
                  <h3 className="text-white font-poppins font-bold text-lg lg:text-xl mb-4">{contract.state}</h3>
                  
                  {/* Match badge - absolute positioned at top right with radial gradient */}
                  <div className="absolute top-4 right-4 lg:top-6 lg:right-6">
                    <span 
                      className="font-poppins text-sm font-bold px-5 py-2 rounded-full text-white"
                      style={{ background: 'radial-gradient(ellipse at 50% 150%, #6BB4B5 0%, #99C8CA 100%)' }}
                    >
                      {Number.isFinite(contract.matchPercentage) ? `${contract.matchPercentage}% Match` : 'Match Pending'}
                    </span>
                  </div>

                  <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
                    {/* Top Sign - Trophy with background and rank number overlay */}
                    <div className="relative flex-shrink-0" style={{ width: '160px', height: '160px' }}>
                      {/* Trophy with teal circle background and rank number overlay */}
                      <div className="relative w-32 h-32 lg:w-36 lg:h-36">
                        <img src={TrophyBackgroundIcon} alt="" className="absolute inset-0 w-full h-full" />
                        <span className="absolute left-1/2 top-[35%] transform -translate-x-1/2 -translate-y-1/2 text-3xl lg:text-4xl font-poppins font-bold text-white leading-none">
                          {contract.rank}
                        </span>
                      </div>
                    </div>

                    {/* Contract Details - right side */}
                    <div className="flex-1 w-full">
                      {/* Row 1: Contract Value, Submission Deadline, NAICS Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-4">
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            Contract Value
                          </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg">{contract.contractValue}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            Submission Deadline
                          </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg whitespace-normal break-words">{contract.submissionDeadline?.replace('T', '\n')}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            NAICS Code
                          </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg">{contract.naicsCode}</p>
                        </div>
                      </div>

                      {/* Row 2: Name, Contracting Agency, Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            Name
                          </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg whitespace-normal break-words">{contract.name}</p>
                        </div>
                        <div>
                          <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                            Contracting Agency
                          </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg whitespace-normal break-words">{contract.contractingAgency}</p>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 justify-start items-start">
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
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6 lg:mt-8 no-print">
                <button 
                  className="flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white"
                  style={{ backgroundColor: 'rgb(28, 66, 98)' }}
                  onClick={() => window.print()}
                >
                  <div className="text-left">
                    <p className="font-bold text-sm sm:text-base">Print Results</p>
                    <p className="text-xs sm:text-sm text-gray-300">Click to print your contract matches.</p>
                  </div>
                  <img src={PrintResultsIcon} alt="Print" className="w-6 h-6" />
                </button>
                <button 
                  className="flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white disabled:opacity-50"
                  style={{ backgroundColor: 'rgb(28, 66, 98)' }}
                  onClick={handleLoadMore}
                  disabled={!hasMore || loadingMore}
                >
                  <div className="text-left">
                    <p className="font-bold text-sm sm:text-base">
                      {loadingMore ? 'Loading...' : hasMore ? 'Get More Related Contracts' : 'No More Contracts'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-300">
                      {hasMore 
                        ? `Showing ${currentOffset + 1}-${currentOffset + contracts.length} of ${totalAvailable}` 
                        : 'All contracts loaded'}
                    </p>
                  </div>
                  <img src="/static/app/dashboard/MoreContractsIcon.svg" alt="More Contracts" className="w-6 h-6" />
                </button>
                <button 
                  className="flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white"
                  style={{ backgroundColor: 'rgb(28, 66, 98)' }}
                  onClick={() => navigate('/no-capability-statement?returnTo=/top-five-contracts')}
                >
                  <div className="text-left">
                    <p className="font-bold text-sm sm:text-base">Change Capability Statement</p>
                    <p className="text-xs sm:text-sm text-gray-300">Click to upload a new CS.</p>
                  </div>
                  <img src="/static/app/dashboard/CSIcon.svg" alt="Capability Statement" className="w-6 h-6" />
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

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import FilterPopup from '../components/FilterPopup'
import { InlineLoading } from '../components/ThinkingPopup'
import { RefreshCw } from 'lucide-react'
import { api, ContractMatch as ApiContractMatch } from '../services/api'
import { useTranslation } from '../i18n'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// Print styles - injected into document head - preserves original design
const printStyles = `
@media print {
  /* Force print background colors and images */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  /* Hide non-essential UI elements only */
  aside, header, nav, .sidebar, .no-print {
    display: none !important;
  }
  
  /* Hide buttons but keep the card structure */
  button {
    display: none !important;
  }
  
  /* Hide rerun and sort buttons in print */
  .no-print-buttons {
    display: none !important;
  }
  
  /* Show the page title in print */
  .print-page-title {
    display: block !important;
    color: white !important;
    font-size: 1.5rem !important;
    font-weight: 700 !important;
    margin-bottom: 16px !important;
  }
  
  /* Make main content full width */
  main {
    padding: 10px !important;
    margin: 0 !important;
    width: 100% !important;
  }
  
  /* Keep the dark background for the page */
  body, html {
    background: #1C2B3A !important;
    background-color: #1C2B3A !important;
  }
  
  /* Style contract cards - preserve original dark design */
  .print-card {
    background: #2F3C4F !important;
    background-color: #2F3C4F !important;
    page-break-inside: avoid !important;
    margin-bottom: 16px !important;
    border: 1px solid white !important;
    border-radius: 16px !important;
    padding: 16px !important;
    position: relative !important;
  }
  
  /* Keep white text */
  .print-card h3,
  .print-card p,
  .print-card .text-white {
    color: white !important;
  }
  
  /* Keep trophy images visible */
  .print-card img {
    display: block !important;
  }
  
  /* Trophy container */
  .print-trophy-container {
    width: 120px !important;
    height: 120px !important;
    flex-shrink: 0 !important;
  }
  
  /* Keep label badges with white background */
  .print-card .inline-block {
    background: white !important;
    background-color: white !important;
    color: #2F3C4F !important;
    border-radius: 20px !important;
    padding: 4px 12px !important;
  }
  
  /* Match badge styling */
  .print-match-badge span {
    background: linear-gradient(to bottom, #6BB4B5, #6BA4A7) !important;
    color: white !important;
  }
  
  /* Grid layout for contract details */
  .print-card .grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 12px !important;
  }
  
  /* Flex containers */
  .print-card .flex {
    display: flex !important;
  }
  
  .print-card .flex-col {
    flex-direction: column !important;
  }
  
  /* Hide print-only title since we preserve original design */
  .print-title {
    display: none !important;
  }
  
  /* Ensure page breaks work properly */
  .space-y-4, .space-y-6 {
    display: block !important;
  }
  
  /* Scale down cards slightly to fit more on page */
  .print-card {
    transform: scale(0.95) !important;
    transform-origin: top left !important;
  }
}
`

// SVG asset paths for contract cards
const TrophyBackgroundIcon = '/static/app/dashboard/TrophyBackground.svg'
const ContractSiteIcon = '/static/app/dashboard/ContractSite.svg'
const AskAIIcon = '/static/app/dashboard/AskAI.svg'
const SortByIcon = '/static/app/dashboard/SortBy.svg'
const PrintResultsIcon = '/static/app/dashboard/GeneratePDF.svg'

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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<ContractMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMatches, setHasMatches] = useState<boolean | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [contractType, setContractType] = useState('all')
  const [selectedStates, setSelectedStates] = useState<string[]>(['all'])
  const [noFilterResults, setNoFilterResults] = useState(false)
  
  // Pagination state
  const [currentOffset, setCurrentOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalAvailable, setTotalAvailable] = useState(0)
  
  // PDF generation state
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const contractsContainerRef = useRef<HTMLDivElement>(null)

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
        const transformedContracts: ContractMatch[] = (data.matches || [])
          .filter((m: ApiContractMatch) => {
            const cat = (m.Category || '').trim().toLowerCase()
            return cat !== 'unknown' && cat !== ''
          })
          .map((m: ApiContractMatch) => {
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
        const transformedContracts: ContractMatch[] = (data.matches || [])
          .filter((m: ApiContractMatch) => {
            const cat = (m.Category || '').trim().toLowerCase()
            return cat !== 'unknown' && cat !== ''
          })
          .map((m: ApiContractMatch) => {
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
        // Append new contracts to existing ones
        setContracts(prev => [...prev, ...transformedContracts])
        setCurrentOffset(nextOffset)
        setHasMore(data.has_more || false)
      }
    } catch (error) {
      console.error('Failed to load more contracts:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const WATCH_LIST = [
    "https://cookcountyil.bonfirehub.com",
    "https://www.demandstar.com",
    "https://www.bidnetdirect.com",
    "https://vendors.planetbids.com",
    "https://www.publicpurchase.com",
    "https://iq.govwin.com",
    "https://ha.internationaleprocurement.com",
    "https://business.metro.net",
    "https://smart.gep.com"
  ]

  const [thirdPartyTarget, setThirdPartyTarget] = useState<string | null>(null)
  const [showThirdPartyPopup, setShowThirdPartyPopup] = useState(false)

  const handleExternalLink = (href?: string, e?: React.MouseEvent) => {
    if (!href) return
    const isWatch = WATCH_LIST.some(prefix => href.startsWith(prefix))
    if (isWatch) {
      if (e) e.preventDefault()
      setThirdPartyTarget(href)
      setShowThirdPartyPopup(true)
    } else {
      window.open(href, '_blank')
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
      // Keep the 'all' sentinel so the backend can tell "all states" apart from
      // a specific state selection (e.g. only Illinois). Without it, picking a
      // single state while "All Contracts" is active was ignored server-side.
      const states = filterStates || []
      
      const data = await api.rerunTopFiveMatching(contractTypes, states)
      if (data.success) {
        const transformedContracts: ContractMatch[] = (data.matches || [])
          .filter((m: ApiContractMatch) => {
            const cat = (m.Category || '').trim().toLowerCase()
            return cat !== 'unknown' && cat !== ''
          })
          .map((m: ApiContractMatch) => {
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
        // Update pagination state from rerun response
        setCurrentOffset(0)
        setHasMore(data.has_more || false)
        setTotalAvailable(data.total_available || transformedContracts.length)
        // Don't change hasMatches here- rerun with filters returning 0 results
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

  // Generate PDF from the contracts container
  const handleGeneratePdf = async () => {
    if (!contractsContainerRef.current || contracts.length === 0) return
    
    setGeneratingPdf(true)
    
    try {
      const container = contractsContainerRef.current
      
      // Capture the contracts container as canvas - hiding buttons and preserving visual appearance
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1C2B3A',
        logging: false,
        onclone: (clonedDoc) => {
          const pdfContainer = clonedDoc.querySelector('[data-pdf-container]')
          if (pdfContainer) {
            const titleEl = clonedDoc.createElement('h1')
            titleEl.textContent = t('topFiveMatchesTitle')
            titleEl.style.cssText = 'color: white; font-family: Poppins, sans-serif; font-weight: 700; font-size: 24px; margin-bottom: 24px;'
            pdfContainer.prepend(titleEl)
          }
          const noPdfElements = clonedDoc.querySelectorAll('.no-pdf')
          noPdfElements.forEach((el) => {
            (el as HTMLElement).style.display = 'none'
          })
          // Fix text fitting - ensure proper word wrapping and sizing
          const textElements = clonedDoc.querySelectorAll('.font-poppins')
          textElements.forEach((el) => {
            const htmlEl = el as HTMLElement
            htmlEl.style.wordBreak = 'break-word'
            htmlEl.style.overflowWrap = 'break-word'
            htmlEl.style.lineHeight = '1.3'
          })
          // Ensure contract name and agency text fits properly
          const breakWordsElements = clonedDoc.querySelectorAll('.break-words')
          breakWordsElements.forEach((el) => {
            const htmlEl = el as HTMLElement
            htmlEl.style.wordBreak = 'break-word'
            htmlEl.style.overflowWrap = 'break-word'
            htmlEl.style.whiteSpace = 'normal'
          })
        }
      })
      
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      
      // Create PDF - A4 size
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth / 2, imgHeight / 2]
      })
      
      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2)
      
      // Download the PDF
      pdf.save('top-five-contracts.pdf')
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGeneratingPdf(false)
    }
  }

    return (
      <div className="h-screen bg-corama-dark overflow-y-auto">
        {/* Header spans full width at top */}
        <Header />
        
        {/* Sidebar + Content row below header */}
        <div className="flex">
          {/* Horizontal separator line across entire viewport width, below header (lg only) */}
          <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
          
          <Sidebar />
        
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
              {/* Print-only title */}
              <h1 className="print-title hidden">Top Contract Matches</h1>
              
              {/* Page Title and Action Buttons */}
              <div className="flex items-center justify-between mb-6 animate-fade-in">
                <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl print-page-title">{t('topFiveMatchesTitle')}</h1>
                <div className="flex items-center gap-3 no-print-buttons">
                  <button 
                    onClick={() => handleRerunMatching(contractType, selectedStates)}
                    disabled={rerunning}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-poppins text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#6bb4b5' }}
                  >
                    <RefreshCw size={16} className={rerunning ? 'animate-spin' : ''} />
                    {rerunning ? t('rerunningMatching') : t('rerunMatching')}
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
                <p className="text-gray-400 font-poppins">{t('loading')}</p>
              </div>
            ) : noFilterResults ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-400 font-poppins text-lg mb-4">{t('noContractsMatchFilters')}</p>
                <button 
                  onClick={() => {
                    setContractType('')
                    setSelectedStates([])
                    loadTopFive()
                  }}
                  className="px-6 py-2 rounded-full font-poppins text-sm font-semibold text-white"
                  style={{ backgroundColor: '#6bb4b5' }}
                >
                  {t('clearFilters')}
                </button>
              </div>
            ) : contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-400 font-poppins text-lg mb-4">{t('noContractsToShow')}</p>
                <button 
                  onClick={() => handleRerunMatching(contractType, selectedStates)}
                  className="px-6 py-2 rounded-full font-poppins text-sm font-semibold text-white"
                  style={{ backgroundColor: '#6bb4b5' }}
                >
                  {t('rerunMatching')}
                </button>
              </div>
            ) : (
            <div ref={contractsContainerRef} data-pdf-container className="space-y-4 lg:space-y-6">
              {contracts.map((contract) => (
                <div key={contract.rank} className="print-card rounded-2xl p-4 sm:p-5 lg:p-6 relative border border-white" style={{ backgroundColor: '#2F3C4F' }}>
                  {/* State name - top left */}
                  <h3 className="text-white font-poppins font-bold text-lg lg:text-xl mb-4">{contract.state}</h3>
                  
                  {/* Match badge - absolute positioned at top right with radial gradient */}
                  <div className="absolute top-4 right-4 lg:top-6 lg:right-6 print-match-badge">
                    <span 
                      className="font-poppins text-sm font-bold px-5 py-2 rounded-full text-white"
                      style={{ background: 'radial-gradient(ellipse at 50% 150%, #6BB4B5 0%, #6BA4A7 100%)' }}
                    >
                      {Number.isFinite(contract.matchPercentage) ? `${contract.matchPercentage}% ${t('match')}` : t('matchPending')}
                    </span>
                  </div>

                  <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
                    {/* Top Sign - Trophy with background and rank number overlay */}
                    <div className="relative flex-shrink-0 print-trophy-container" style={{ width: '160px', height: '160px' }}>
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
                      {/* Row 1: Name, Submission Deadline, NAICS Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-4">
                        <div>
                                                    <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                                                      {t('name')}
                                                    </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg whitespace-normal break-words">{contract.name}</p>
                        </div>
                        <div>
                                                    <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                                                      {t('submissionDeadline')}
                                                    </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg whitespace-normal break-words">{contract.submissionDeadline?.replace('T', '\n')}</p>
                        </div>
                        <div>
                                                    <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                                                      {t('naicsCode')}
                                                    </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg">{contract.naicsCode}</p>
                        </div>
                      </div>

                      {/* Row 2: Contract Value, Contracting Agency, Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                        <div>
                                                    <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                                                      {t('contractValue')}
                                                    </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg">{contract.contractValue}</p>
                        </div>
                        <div>
                                                    <span className="inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200">
                                                      {t('contractingAgency')}
                                                    </span>
                          <p className="text-white font-poppins font-bold text-base lg:text-lg whitespace-normal break-words">{contract.contractingAgency}</p>
                        </div>
                        {/* Action Buttons - visible in PDF */}
                        <div className="flex flex-col gap-2 justify-start items-start">
                          <button 
                            onClick={(e) => handleExternalLink(contract.detailLink, e)}
                            className="inline-flex items-center justify-center gap-3 text-white font-poppins text-sm font-medium px-6 py-2.5 rounded-full hover:opacity-90 transition-colors"
                            style={{ background: 'linear-gradient(180deg, #1C4262 6.25%, #284165 96%)' }}
                          >
                                                        {t('contractWebsite')}
                                                        <img src={ContractSiteIcon} alt="" className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => { try { sessionStorage.setItem('lastContractDetailLink', contract.detailLink || '') } catch (e) {} ; navigate('/ai-assistant', { state: { contractName: contract.name, contractAgency: contract.contractingAgency, contractCategory: (contract as any).category, contractDetailLink: contract.detailLink } }) }}
                            className="inline-flex items-center justify-center gap-3 text-white font-poppins text-sm font-medium px-6 py-2.5 rounded-full hover:opacity-90 transition-colors"
                            style={{ background: 'linear-gradient(180deg, #1C4262 6.25%, #284165 96%)' }}
                          >
                                                        {t('askAiAboutThis')}
                                                        <img src={AskAIIcon} alt="" className="w-6 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bottom Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6 lg:mt-8 no-print no-pdf">
                <button 
                  className="flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white disabled:opacity-50"
                  style={{ backgroundColor: 'rgb(28, 66, 98)' }}
                  onClick={handleGeneratePdf}
                  disabled={generatingPdf}
                >
                  <div className="text-left">
                      <p className="font-bold text-sm sm:text-base">{generatingPdf ? 'Generating PDF...' : t('downloadResults')}</p>
                      <p className="text-xs sm:text-sm text-gray-300">{generatingPdf ? 'Please wait' : t('downloadAsPdf')}</p>
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
                      {loadingMore ? t('loading') : hasMore ? t('loadMore') : t('noMoreContracts')}
                    </p>
                                        <p className="text-xs sm:text-sm text-gray-300">
                                          {hasMore 
                                            ? `${t('showingContracts')} ${currentOffset + 1}-${currentOffset + contracts.length} ${t('of')} ${totalAvailable}` 
                                            : t('allContractsLoaded')}
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
                                        <p className="font-bold text-sm sm:text-base">{t('changeCapabilityStatement')}</p>
                                        <p className="text-xs sm:text-sm text-gray-300">{t('clickToUploadNewCS')}</p>
                  </div>
                  <img src="/static/app/dashboard/CSIcon.svg" alt="Capability Statement" className="w-6 h-6" />
                </button>
              </div>
            </div>
            )}
          </main>
          </div>
        </div>

        {/* Third-Party Provider Confirmation Popup */}
        {showThirdPartyPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowThirdPartyPopup(false)} />
            <div className="relative rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none w-full sm:w-auto mx-4 border border-white/20 animate-popup-pop" style={{ backgroundColor: 'rgb(11, 44, 72)', minHeight: '200px' }}>
              <button className="absolute top-4 right-4 hover:opacity-80 transition-opacity" onClick={() => setShowThirdPartyPopup(false)}>
                <img src="/static/app/proposal-summary/ClosePopupButton.svg" alt="Close" className="w-6 h-6" />
              </button>
              <div className="flex-shrink-0">
                <img src="/static/app/proposal-summary/WarnIcon.svg" alt="Warning" className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
              <div className="flex flex-col gap-4 text-center sm:text-left">
                <div>
                  <h3 className="text-white font-poppins font-bold text-lg sm:text-xl mb-1">Third-Party Contract</h3>
                  <p className="text-gray-300 font-poppins text-xs sm:text-sm">This contract is managed by a third-party provider. You will need to create an account on their site, where additional service fees may apply.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => { if (thirdPartyTarget) window.open(thirdPartyTarget, '_blank'); setShowThirdPartyPopup(false) }} className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'rgb(92, 191, 192)' }}>
                    Continue to Provider
                  </button>
                  <button onClick={() => setShowThirdPartyPopup(false)} className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'rgb(39, 69, 110)' }}>
                    Select Another Contract
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import FilterPopup from '../components/FilterPopup'
import { api, Contract as ApiContract } from '../services/api'
import { useTranslation } from '../i18n'

// Custom hook for animating a number from 0 to target value
const useCountUp = (target: number, duration: number = 1000, delay: number = 0) => {
  const [count, setCount] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  useEffect(() => {
    // Reset when target changes
    setCount(0)
    startTimeRef.current = null
    
    if (target === 0) return
    
    const startAnimation = () => {
      const animate = (currentTime: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = currentTime
        }
        
        const elapsed = currentTime - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function for smooth animation (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const currentValue = Math.round(target * easeOut)
        
        setCount(currentValue)
        
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate)
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    // Start animation after delay
    const timeoutId = setTimeout(startAnimation, delay)
    
    return () => {
      clearTimeout(timeoutId)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [target, duration, delay])
  
  return count
}

// Animated category card component
const AnimatedCategoryCard = ({ 
  cat, 
  index 
}: { 
  cat: { name: string; count: number; percentage: number }; 
  index: number 
}) => {
  const animatedPercentage = useCountUp(cat.percentage, 1200, index * 150)
  const animatedCount = useCountUp(cat.count, 1200, index * 150)
  
  // Calculate stroke dash array based on animated percentage
  const strokeDasharray = `${animatedPercentage * 2.2} 220`
  
  return (
    <div className="rounded-xl p-4 border border-white flex items-center gap-4" style={{ backgroundColor: '#0b2c48' }}>
      {/* Percentage graph on the left */}
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke="rgba(107, 180, 181, 0.2)"
            strokeWidth="5"
            fill="none"
          />
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke="#6bb4b5"
            strokeWidth="5"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.1s ease-out' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-white font-poppins text-base font-bold">
          {animatedPercentage}%
        </span>
      </div>
      
      {/* Category name and contract count to the right of graph */}
      <div className="flex flex-col justify-center">
        <h3 className="text-white font-poppins font-semibold text-sm">{cat.name}</h3>
        <p className="text-corama-teal font-poppins text-sm">{animatedCount} contracts</p>
      </div>
    </div>
  )
}

interface Contract {
  id: number
  name: string
  category: string
  naicsCode: string
  dueDate: string
  status: string
  detailLink?: string
  hashValue?: string
}

const Dashboard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [totalContracts, setTotalContracts] = useState(0)
  const [_totalPages, setTotalPages] = useState(1)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [_loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [_credits, setCredits] = useState(0)
  const [userName, setUserName] = useState('')
  
  
  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [contractType, setContractType] = useState('all')
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  
  // Toggle state for Grants/Contracts view
  const [showGrants, setShowGrants] = useState(false)
  
  // Top categories from backend (calculated from ALL contracts, not just current page)
  const [topCategories, setTopCategories] = useState<{name: string, count: number, percentage: number}[]>([])

  const contractsPerPage = 10 // Fixed batch size for traditional pagination
  const startItem = (currentPage - 1) * contractsPerPage + 1
  const endItem = Math.min(currentPage * contractsPerPage, totalContracts)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    loadContracts()
  }, [currentPage, contractType, selectedStates, showGrants])

  const loadUserData = async () => {
    try {
      const user = await api.getUser()
      setCredits(user.credits_balance)
      setUserName(user.username || user.first_name || user.email.split('@')[0])
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const loadContracts = async () => {
    setLoading(true)
    try {
      let data;
      
      if (showGrants) {
        // Fetch grants from government_grants collection
        data = await api.getGrants(currentPage, contractsPerPage)
      } else {
        // Use searchContracts only when there's a query or non-default filters
        // Otherwise use getContracts with offset-based pagination
        const hasFilters = searchQuery || contractType !== 'all' || selectedStates.length > 0
        data = hasFilters
          ? await api.searchContracts(searchQuery, currentPage, contractType, selectedStates)
          : await api.getContracts(currentPage, contractsPerPage)
      }
      
      // Transform API response to component format
      const transformedContracts: Contract[] = data.contracts.map((c: ApiContract, index: number) => ({
        id: (currentPage - 1) * contractsPerPage + index + 1,
        name: c.bid_name,
        category: c.category,
        naicsCode: c.naics_code || 'N/A',
        dueDate: c.due_date,
        status: c.status || 'Open',
        detailLink: c.detail_link,
        hashValue: c.hash_value
      }))
      
      // Always replace contracts (traditional pagination)
      setContracts(transformedContracts)
      
      setTotalContracts(data.total_contracts || transformedContracts.length)
      setTotalPages(data.total_pages || 1)
      
      // Use top_categories from backend (calculated from filtered contracts)
      // Sort by count descending to ensure left-to-right order is highest to lowest
      if (data.top_categories && data.top_categories.length > 0) {
        const sorted = [...data.top_categories].sort((a, b) => b.count - a.count)
        setTopCategories(sorted.slice(0, 4)) // Top 4 for the grid
      } else {
        setTopCategories([]) // Clear categories when no results
      }
    } catch (error) {
      console.error('Failed to load contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadContracts()
  }

  const handleApplyFilter = (newContractType: string, newStates: string[]) => {
    setContractType(newContractType)
    setSelectedStates(newStates)
    setCurrentPage(1)
  }

  // topCategories is now loaded from the backend in loadContracts()

  return (
    <div className="min-h-screen bg-corama-dark">
      {/* Filter Popup */}
      <FilterPopup
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilter}
      />
      
      {/* Header spans full width at top */}
      <Header />
      
      {/* Sidebar + Content row below header */}
      <div className="flex">
        {/* Vertical separator line with blue glow (lg only) */}
        <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
          {/* Overview Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 lg:mb-6">
            <h1 className="text-white font-poppins text-lg lg:text-xl">{t('overview')}</h1>
            
            {/* Toggle Button for Grants/Contracts - centered between Overview and Accounts */}
            <button
              onClick={() => {
                setShowGrants(!showGrants)
                setCurrentPage(1) // Reset to page 1 when toggling
              }}
              className="relative w-[240px] h-[36px] rounded-[40px] border-none cursor-pointer p-[4px] flex items-center transition-colors duration-500 select-none font-poppins"
              style={{ backgroundColor: showGrants ? '#0B2C48' : '#98C9CA' }}
              aria-pressed={showGrants}
              aria-label="Toggle between Grants and Contracts"
            >
              {/* Moving thumb - 28px (36px - 4px*2 padding) */}
              <span
                className="relative z-10 block w-[28px] h-[28px] bg-white rounded-full shadow-md transition-transform duration-500"
                style={{ 
                  transform: showGrants ? 'translateX(204px)' : 'translateX(0)',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
                }}
              />
              {/* Contracts View label (visible when OFF) */}
              <span 
                className="absolute inset-0 flex items-center justify-center text-[15px] font-medium pointer-events-none z-0 transition-opacity duration-500"
                style={{ 
                  color: '#0B2C48',
                  opacity: showGrants ? 0 : 1
                }}
              >
                {t('contractsView')}
              </span>
              {/* Grants View label (visible when ON) */}
              <span 
                className="absolute inset-0 flex items-center justify-center text-[15px] font-medium pointer-events-none z-0 transition-opacity duration-500"
                style={{ 
                  color: '#ffffff',
                  opacity: showGrants ? 1 : 0
                }}
              >
                {t('grantsView')}
              </span>
            </button>
            
            <div className="flex items-center gap-2 text-white font-poppins text-xs sm:text-sm">
              <span>{t('accounts')}</span>
              <span>|</span>
              <span className="text-white">{userName || t('loading')}</span>
            </div>
          </div>

          {/* Top Contract/Grant Categories */}
          <div className="mb-6 lg:mb-8">
            <h2 className="text-white font-poppins text-xs sm:text-sm uppercase tracking-wider mb-3 lg:mb-4 font-bold">{showGrants ? t('topGrantCategories') : t('topContractCategories')}</h2>
            
            {/* Desktop: Grid layout */}
            <div className="hidden lg:grid grid-cols-4 gap-4">
              {topCategories.map((cat, index) => (
                <AnimatedCategoryCard key={index} cat={cat} index={index} />
              ))}
            </div>
            
            {/* Mobile/Tablet: Horizontal scrollable carousel with snap */}
            <div className="lg:hidden">
              <div 
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onScroll={(e) => {
                  const container = e.currentTarget
                  const scrollLeft = container.scrollLeft
                  const cardWidth = container.offsetWidth
                  const newIndex = Math.round(scrollLeft / cardWidth)
                  const indicator = document.getElementById('category-carousel-indicator')
                  if (indicator) {
                    const dots = indicator.querySelectorAll('button')
                    dots.forEach((dot, i) => {
                      dot.className = i === newIndex 
                        ? 'w-2.5 h-2.5 rounded-full bg-corama-teal' 
                        : 'w-2 h-2 rounded-full bg-gray-500'
                    })
                  }
                }}
              >
                {topCategories.map((cat, index) => (
                  <div key={index} className="flex-shrink-0 w-full snap-center">
                    <AnimatedCategoryCard cat={cat} index={index} />
                  </div>
                ))}
              </div>
              
              {/* Dot indicators */}
              <div id="category-carousel-indicator" className="flex justify-center gap-2 mt-2">
                {topCategories.map((_, index) => (
                  <button
                    key={index}
                    className={index === 0 ? 'w-2.5 h-2.5 rounded-full bg-corama-teal' : 'w-2 h-2 rounded-full bg-gray-500'}
                    onClick={() => {
                      const container = document.querySelector('.snap-x.snap-mandatory')
                      if (container) {
                        const cardWidth = container.clientWidth
                        container.scrollTo({ left: cardWidth * index, behavior: 'smooth' })
                      }
                    }}
                    aria-label={`Go to category ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

                    {/* Available Contracts/Grants Table */}
                    <div className="rounded-xl p-3 sm:p-4 lg:p-6 border" style={{ backgroundColor: '#2f3c4f', borderColor: '#98C9CA' }}>
                      {/* Single row: Heading LEFT, Search CENTER, Filter/Pagination RIGHT */}
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4 lg:mb-6">
                        {/* Left: Available Contracts/Grants heading */}
                        <h2 className="text-white font-poppins font-semibold text-base lg:text-lg whitespace-nowrap">{showGrants ? t('availableGrants') : t('availableContracts')}</h2>
                        
                        {/* Center: Search Bar */}
                        <form onSubmit={handleSearch} className="relative flex-1 max-w-xl mx-auto">
                          <input
                            type="text"
                            placeholder={showGrants ? t('searchGrants') : t('searchContracts')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border rounded-full py-2 pl-10 pr-6 text-white placeholder-gray-400 focus:outline-none w-full text-sm font-poppins tracking-wide"
                            style={{ backgroundColor: '#2f3c4f', borderColor: '#5a7a8a' }}
                          />
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </form>
                        
                        {/* Right: Filter and pagination */}
                        <div className="flex items-center gap-2 sm:gap-4">
                          <button 
                            onClick={() => setIsFilterOpen(true)}
                            className="text-gray-400 hover:text-white p-1"
                          >
                            <img src="/static/app/dashboard/Filter.svg" alt="Filter" className="w-5 h-5" />
                          </button>
                          <div className="flex items-center gap-1 sm:gap-2 text-white font-poppins text-xs sm:text-sm">
                            <span className="hidden sm:inline">{startItem}-{endItem} of {totalContracts}</span>
                            <span className="sm:hidden">{currentPage}/{Math.ceil(totalContracts/contractsPerPage)}</span>
                                                        <button 
                                                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                          disabled={currentPage <= 1}
                                                          className={`p-1 ${currentPage <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
                                                        >
                                                          <img src="/static/app/dashboard/LeftArrow.svg" alt="Previous" className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                          onClick={() => setCurrentPage(p => p + 1)}
                                                          disabled={currentPage >= Math.ceil(totalContracts / contractsPerPage)}
                                                          className={`p-1 ${currentPage >= Math.ceil(totalContracts / contractsPerPage) ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
                                                        >
                                                          <img src="/static/app/dashboard/RightArrow.svg" alt="Next" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="font-poppins text-sm" style={{ color: '#9ccdcd' }}>
                              <th className="text-left py-3 pr-6 font-normal whitespace-nowrap align-bottom">{showGrants ? t('grantName') : t('contractName')}</th>
                              <th className="text-left py-3 font-normal whitespace-nowrap align-bottom">{t('category')}</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">{showGrants ? t('cfdaAln') : t('naicsCode')}</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">{t('dueDate')}</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">{t('status')}</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">{t('aiAssistant')}</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">{t('visitSite')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contracts.map((contract) => (
                              <tr key={contract.id} className="hover:bg-corama-darker/30">
                                <td className="py-4 pr-6 text-white font-poppins font-semibold">{contract.name}</td>
                                <td className="py-4 text-white font-poppins text-sm">{contract.category}</td>
                                <td className="py-4 px-4 text-center text-white font-poppins text-sm">{contract.naicsCode}</td>
                                <td className="py-4 px-4 text-center text-white font-poppins text-sm whitespace-nowrap">{contract.dueDate}</td>
                                <td className="py-4 px-4 text-center">
                                  <span className="text-white font-poppins text-sm">{contract.status}</span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <button 
                                    onClick={() => navigate('/ai-assistant', { state: { contractName: contract.name, contractCategory: contract.category } })}
                                    className="p-1 hover:opacity-80 transition-opacity inline-flex justify-center"
                                    title={showGrants ? "Open AI Assistant for this grant" : "Open AI Assistant for this contract"}
                                  >
                                    <img src="/static/app/dashboard/AIAssistant.svg" alt="AI Assistant" className="w-6 h-6" />
                                  </button>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <button 
                                    onClick={() => contract.detailLink && window.open(contract.detailLink, '_blank')}
                                    className="p-1 hover:opacity-80 transition-opacity inline-flex justify-center"
                                    title={showGrants ? "Visit grant website" : "Visit contract website"}
                                  >
                                    <img src="/static/app/dashboard/VisitSite.svg" alt="Visit Site" className="w-6 h-6" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile/Tablet Card View */}
                      <div className="lg:hidden space-y-3">
                        {contracts.map((contract) => (
                          <div key={contract.id} className="rounded-lg p-3 sm:p-4" style={{ backgroundColor: '#2F3C4F' }}>
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-white font-poppins font-semibold text-sm sm:text-base flex-1 pr-2">{contract.name}</h3>
                              <span className="text-white font-poppins text-xs sm:text-sm">{contract.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mb-3">
                              <div>
                                <span className="text-gray-400">{t('category')}:</span>
                                <p className="text-white">{contract.category}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">{t('dueDate')}:</span>
                                <p className="text-white">{contract.dueDate}</p>
                              </div>
                            </div>
                            <div className="flex gap-4">
                              <button 
                                onClick={() => navigate('/ai-assistant', { state: { contractName: contract.name, contractCategory: contract.category } })}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                              >
                                <img src="/static/app/dashboard/AIAssistant.svg" alt="" className="w-5 h-5" aria-hidden="true" />
                                <span className="text-white text-xs sm:text-sm">{t('aiAssistant')}</span>
                              </button>
                              <button 
                                onClick={() => contract.detailLink && window.open(contract.detailLink, '_blank')}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                              >
                                <img src="/static/app/dashboard/VisitSite.svg" alt="" className="w-5 h-5" aria-hidden="true" />
                                <span className="text-white text-xs sm:text-sm">{t('visitSite')}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
        </main>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

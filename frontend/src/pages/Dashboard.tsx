import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
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
    <div className="rounded-xl p-3 sm:p-4 border border-white flex items-center gap-3 sm:gap-4 animate-fade-in-scale min-w-0" style={{ backgroundColor: '#0b2c48', animationDelay: `${index * 100}ms` }}>
      <div className="relative w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0">
        <svg className="w-14 h-14 sm:w-20 sm:h-20 transform -rotate-90" viewBox="0 0 80 80">
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
        <span className="absolute inset-0 flex items-center justify-center text-white font-poppins text-xs sm:text-base font-bold">
          {animatedPercentage}%
        </span>
      </div>
      
      <div className="flex flex-col justify-center min-w-0">
        <h3 className="text-white font-poppins font-semibold text-xs sm:text-sm leading-tight break-words">{cat.name}</h3>
        <p className="text-corama-teal font-poppins text-xs sm:text-sm">{animatedCount} contracts</p>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentPage, setCurrentPage] = useState(1)
  const [totalContracts, setTotalContracts] = useState(0)
  const [_totalPages, setTotalPages] = useState(1)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [_credits, setCredits] = useState(0)
  const [userName, setUserName] = useState('')
  const [contractsKey, setContractsKey] = useState(0) // Key to trigger animation when contracts load
  
  
  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [contractType, setContractType] = useState('all')
  const [selectedStates, setSelectedStates] = useState<string[]>([])

  // Search suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [suggestionResults, setSuggestionResults] = useState<Contract[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const suggestionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Toggle state for Grants/Contracts view (commented out - to be improved later)
  const [showGrants, _setShowGrants] = useState(false)
  
  // Top categories from backend (calculated from ALL contracts, not just current page)
  const [topCategories, setTopCategories] = useState<{name: string, count: number, percentage: number}[]>([])

  const contractsPerPage = 100 // Fixed batch size for traditional pagination

  const startItem = (currentPage - 1) * contractsPerPage + 1
  const endItem = Math.min(currentPage * contractsPerPage, totalContracts)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestionResults([])
      return
    }
    if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current)
    suggestionDebounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const data = await api.searchContracts(searchQuery, 1, contractType, selectedStates)
        const results: Contract[] = data.contracts.map((c, i) => ({
          id: i + 1,
          name: c.bid_name,
          category: c.category,
          naicsCode: c.naics_code || 'N/A',
          dueDate: c.due_date,
          status: c.status || 'Open',
          detailLink: c.detail_link,
          hashValue: c.hash_value
        }))
        setSuggestionResults(results.slice(0, 6))
      } catch {
        setSuggestionResults([])
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300)
    return () => {
      if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current)
    }
  }, [searchQuery, contractType, selectedStates])

  // Process credit purchase if redirected from Stripe checkout
  useEffect(() => {
    const purchaseSuccess = searchParams.get('purchase_success')
    const sessionId = searchParams.get('session_id')
    
    if (purchaseSuccess === 'true' && sessionId) {
      // Call API to process the credit purchase
      const processPurchase = async () => {
        try {
          const response = await fetch('/api/credits/process-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
          })
          const data = await response.json()
          if (data.success) {
            if (data.new_balance !== undefined) {
              // Dispatch event to trigger Header credit animation
              window.dispatchEvent(new CustomEvent('creditsChanged', { 
                detail: { credits: data.new_balance } 
              }))
              // Also update local state
              setCredits(data.new_balance)
            } else {
              // Already processed case - fetch current balance
              loadUserData()
            }
          }
        } catch (error) {
          console.error('Failed to process credit purchase:', error)
        }
        
        // Remove query params from URL to prevent reprocessing on refresh
        setSearchParams({})
      }
      
      processPurchase()
    }
  }, [searchParams, setSearchParams])

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
      const transformedContracts: Contract[] = data.contracts
        .filter((c: ApiContract) => {
          const cat = (c.category || '').trim().toLowerCase()
          return cat !== 'unknown' && cat !== ''
        })
        .map((c: ApiContract, index: number) => ({
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
      // Increment key to trigger animation when contracts load
      setContractsKey(prev => prev + 1)
      
      setTotalContracts(data.total_contracts || transformedContracts.length)
      setTotalPages(data.total_pages || 1)
      
      // Show static Top Contract Categories (stored snapshot)
      setTopCategories([
        { name: 'Commodities, Equipment & Logistics', count: 6704, percentage: 59.4 },
        { name: 'Infrastructure & Construction', count: 2152, percentage: 19.1 },
        { name: 'Professional & Technical Services', count: 1036, percentage: 9.2 },
        { name: 'IT & Telecommunications', count: 869, percentage: 7.7 },
        { name: 'Medical & Human Services', count: 527, percentage: 4.7 },
      ])
    } catch (error) {
      console.error('Failed to load contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    setCurrentPage(1)
    loadContracts()
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSuggestions(value.trim().length > 0)
    setSelectedSuggestionIndex(-1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestionResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => (prev < suggestionResults.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault()
      const selected = suggestionResults[selectedSuggestionIndex]
      navigate('/ai-assistant', { state: { contractName: selected.name, contractCategory: selected.category, contractDetailLink: selected.detailLink } })
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleSelectContractSuggestion = (contract: Contract) => {
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    navigate('/ai-assistant', { state: { contractName: contract.name, contractCategory: contract.category, contractDetailLink: contract.detailLink } })
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 lg:mb-6 animate-fade-in">
            <h1 className="text-white font-poppins text-lg lg:text-xl">{t('overview')}</h1>
            
            {/* Toggle Button for Grants/Contracts - HIDDEN FOR NOW (to be improved later)
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
              <span
                className="relative z-10 block w-[28px] h-[28px] bg-white rounded-full shadow-md transition-transform duration-500"
                style={{ 
                  transform: showGrants ? 'translateX(204px)' : 'translateX(0)',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
                }}
              />
              <span 
                className="absolute inset-0 flex items-center justify-center text-[15px] font-medium pointer-events-none z-0 transition-opacity duration-500"
                style={{ 
                  color: '#0B2C48',
                  opacity: showGrants ? 0 : 1
                }}
              >
                {t('contractsView')}
              </span>
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
            */}
            
            <div className="flex items-center gap-2 text-white font-poppins text-xs sm:text-sm">
              <span>{t('accounts')}</span>
              <span>|</span>
              <span className="text-white">{userName || t('loading')}</span>
            </div>
          </div>

          {/* Top Contract/Grant Categories */}
          <div className="mb-6 lg:mb-8 animate-fade-in-up animate-delay-100">
            <h2 className="text-white font-poppins text-xs sm:text-sm uppercase tracking-wider mb-3 lg:mb-4 font-bold">{showGrants ? t('topGrantCategories') : t('topContractCategories')}</h2>
            
            {/* Desktop: Grid layout */}
            <div className="hidden lg:grid grid-cols-5 gap-4">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <div key={`cat-skeleton-${i}`} className="rounded-xl p-4 border border-white/20 flex items-center gap-4" style={{ backgroundColor: '#0b2c48' }}>
                  <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                    <div className="skeleton w-[70px] h-[70px] rounded-full" />
                  </div>
                  <div className="flex flex-col justify-center gap-2 flex-1">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              )) : topCategories.map((cat, index) => (
                <AnimatedCategoryCard key={index} cat={cat} index={index} />
              ))}
            </div>
            
            {/* Mobile/Tablet: Horizontal scrollable carousel with snap */}
            <div className="lg:hidden">
              {loading ? (
                <div className="rounded-xl p-4 border border-white/20 flex items-center gap-4" style={{ backgroundColor: '#0b2c48' }}>
                  <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                    <div className="skeleton w-[70px] h-[70px] rounded-full" />
                  </div>
                  <div className="flex flex-col justify-center gap-2 flex-1">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

                    {/* Available Contracts/Grants Table */}
                    <div key={`contracts-${contractsKey}`} className="rounded-xl p-3 sm:p-4 lg:p-6 border animate-fade-in-up" style={{ backgroundColor: '#2f3c4f', borderColor: '#98C9CA' }}>
                      {/* Single row: Heading LEFT, Search CENTER, Filter/Pagination RIGHT */}
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4 lg:mb-6">
                        {/* Left: Available Contracts/Grants heading */}
                        <h2 className="text-white font-poppins font-semibold text-base lg:text-lg whitespace-nowrap">{showGrants ? t('availableGrants') : t('availableContracts')}</h2>
                        
                        {/* Center: Search Bar */}
                        <div ref={searchContainerRef} className="relative flex-1 max-w-xl mx-auto">
                          <form onSubmit={handleSearch}>
                            <input
                              type="text"
                              placeholder={showGrants ? t('searchGrants') : t('searchContracts')}
                              value={searchQuery}
                              onChange={handleSearchInputChange}
                              onKeyDown={handleSearchKeyDown}
                              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                              className="border rounded-full py-2 pl-10 pr-6 text-white placeholder-gray-400 focus:outline-none w-full text-sm font-poppins tracking-wide"
                              style={{ backgroundColor: '#2f3c4f', borderColor: '#5a7a8a' }}
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </form>

                          {showSuggestions && (suggestionResults.length > 0 || suggestionsLoading) && (
                            <div
                              className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
                              style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                                border: '2px solid transparent',
                                borderImage: 'linear-gradient(135deg, rgba(153, 200, 202, 0.6), rgba(11, 44, 72, 0.6)) 1',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                              }}
                            >
                              <div className="py-2">
                                {suggestionsLoading ? Array.from({ length: 3 }).map((_, i) => (
                                  <div key={`sug-skeleton-${i}`} className="w-full px-4 py-3 flex items-center gap-3">
                                    <div className="skeleton w-4 h-4 rounded-full flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="skeleton h-4 w-3/4 mb-1" />
                                      <div className="skeleton h-3 w-1/2" />
                                    </div>
                                  </div>
                                )) : suggestionResults.map((contract, index) => (
                                  <button
                                    key={contract.id}
                                    onClick={() => handleSelectContractSuggestion(contract)}
                                    className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                                      index === selectedSuggestionIndex
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    <Search size={16} className="text-gray-400 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <span className="font-poppins text-sm block truncate">{contract.name}</span>
                                      <span className="font-poppins text-xs text-gray-400 block truncate">{contract.category}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Right: Filter and pagination */}
                        <div className="flex items-center gap-2 sm:gap-4">
                          <button 
                            onClick={() => setIsFilterOpen(true)}
                            className="text-gray-400 hover:text-white p-1"
                          >
                            <img src="/static/app/dashboard/Filter.svg" alt="Filter" className="w-5 h-5" />
                          </button>
                          <div className="flex items-center gap-1 sm:gap-2 text-white font-poppins text-xs sm:text-sm">
                            <span>{startItem}-{endItem} of {totalContracts}</span>
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
                            {loading ? Array.from({ length: 5 }).map((_, i) => (
                              <tr key={`skeleton-${i}`}>
                                <td className="py-4 pr-6"><div className="skeleton h-4 w-3/4" /></td>
                                <td className="py-4"><div className="skeleton h-4 w-2/3" /></td>
                                <td className="py-4 px-4"><div className="skeleton h-4 w-16 mx-auto" /></td>
                                <td className="py-4 px-4"><div className="skeleton h-4 w-20 mx-auto" /></td>
                                <td className="py-4 px-4"><div className="skeleton h-4 w-14 mx-auto" /></td>
                                <td className="py-4 px-4"><div className="skeleton h-6 w-6 rounded-full mx-auto" /></td>
                                <td className="py-4 px-4"><div className="skeleton h-6 w-6 rounded-full mx-auto" /></td>
                              </tr>
                            )) : contracts.map((contract) => (
                              <tr key={contract.id} className="hover:bg-corama-darker/30">
                                <td 
                                  className="py-4 pr-6 text-white font-poppins font-semibold cursor-pointer hover:text-corama-teal transition-colors"
                                                                  onClick={() => navigate('/ai-assistant', { state: { contractName: contract.name, contractCategory: contract.category, contractDetailLink: contract.detailLink } })}
                                                                  title={showGrants ? "Open AI Assistant for this grant" : "Open AI Assistant for this contract"}
                                                                >{contract.name}</td>
                                <td className="py-4 text-white font-poppins text-sm">{contract.category}</td>
                                <td className="py-4 px-4 text-center text-white font-poppins text-sm">{contract.naicsCode}</td>
                                <td className="py-4 px-4 text-center text-white font-poppins text-sm whitespace-nowrap">{contract.dueDate}</td>
                                <td className="py-4 px-4 text-center">
                                  <span className="text-white font-poppins text-sm">{contract.status}</span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <button 
                                    onClick={() => navigate('/ai-assistant', { state: { contractName: contract.name, contractCategory: contract.category, contractDetailLink: contract.detailLink } })}
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
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                          <div key={`skeleton-mobile-${i}`} className="rounded-lg p-3 sm:p-4" style={{ backgroundColor: '#2F3C4F' }}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="skeleton h-4 w-3/4" />
                              <div className="skeleton h-4 w-12" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div><div className="skeleton h-3 w-16 mb-1" /><div className="skeleton h-4 w-24" /></div>
                              <div><div className="skeleton h-3 w-16 mb-1" /><div className="skeleton h-4 w-20" /></div>
                            </div>
                            <div className="flex gap-4">
                              <div className="skeleton h-5 w-24" />
                              <div className="skeleton h-5 w-20" />
                            </div>
                          </div>
                        )) : contracts.map((contract) => (
                          <div key={contract.id} className="rounded-lg p-3 sm:p-4" style={{ backgroundColor: '#2F3C4F' }}>
                            <div className="flex justify-between items-start mb-2">
                              <h3 
                                className="text-white font-poppins font-semibold text-sm sm:text-base flex-1 pr-2 cursor-pointer hover:text-corama-teal transition-colors"
                                                              onClick={() => navigate('/ai-assistant', { state: { contractName: contract.name, contractCategory: contract.category, contractDetailLink: contract.detailLink } })}
                                                            >{contract.name}</h3>
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
                                                              onClick={() => navigate('/ai-assistant', { state: { contractName: contract.name, contractCategory: contract.category, contractDetailLink: contract.detailLink } })}
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

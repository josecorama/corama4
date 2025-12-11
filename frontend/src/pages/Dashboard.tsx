import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api, Contract as ApiContract } from '../services/api'

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

interface FilterPopupProps {
  isOpen: boolean
  onClose: () => void
  onApply: (contractType: string, states: string[]) => void
}

const FilterPopup = ({ isOpen, onClose, onApply }: FilterPopupProps) => {
  // Track which contract types are selected (can be multiple: federal, state, or both)
  const [federalSelected, setFederalSelected] = useState(false)
  const [stateSelected, setStateSelected] = useState(false)
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [error, setError] = useState('')
  
  const ALL_STATES = ['IL', 'IN']

  useEffect(() => {
    // Reset to nothing selected when popup opens (fresh state each time)
    setFederalSelected(false)
    setStateSelected(false)
    setSelectedStates([])
    setError('')
  }, [isOpen])

  // Derive contractType for the parent component
  const getContractType = () => {
    if (federalSelected && stateSelected) return 'all'
    if (federalSelected) return 'federal'
    if (stateSelected) return 'state'
    return ''
  }

  const handleContractTypeChange = (type: string) => {
    if (type === 'all') {
      // "All Contracts" is a master toggle - selects/deselects everything
      const allCurrentlySelected = federalSelected && stateSelected && selectedStates.includes('all')
      if (allCurrentlySelected) {
        // Deselect everything
        setFederalSelected(false)
        setStateSelected(false)
        setSelectedStates([])
      } else {
        // Select everything
        setFederalSelected(true)
        setStateSelected(true)
        setSelectedStates(['all', ...ALL_STATES])
      }
    } else if (type === 'federal') {
      setFederalSelected(!federalSelected)
    } else if (type === 'state') {
      const newStateSelected = !stateSelected
      setStateSelected(newStateSelected)
      if (!newStateSelected) {
        // Clear state selections when State is deselected
        setSelectedStates([])
      }
    }
    setError('')
  }

  const handleStateToggle = (state: string) => {
    if (state === 'all') {
      // When "All States" is selected, select all individual states too
      if (selectedStates.includes('all')) {
        // Deselect all states
        setSelectedStates([])
      } else {
        // Select all states
        setSelectedStates(['all', ...ALL_STATES])
      }
    } else {
      // Toggle individual state
      const newStates = [...selectedStates]
      if (newStates.includes(state)) {
        // Remove this state and also remove 'all' if it was selected
        const filtered = newStates.filter(s => s !== state && s !== 'all')
        setSelectedStates(filtered)
      } else {
        // Add this state
        newStates.push(state)
        // Check if all individual states are now selected, if so add 'all'
        const hasAllIndividual = ALL_STATES.every(s => newStates.includes(s))
        if (hasAllIndividual && !newStates.includes('all')) {
          newStates.push('all')
        }
        setSelectedStates(newStates)
      }
    }
    setError('')
  }

  const handleApply = () => {
    // If State is selected but no states are chosen, show error
    if (stateSelected && selectedStates.length === 0) {
      setError('Please select at least one state')
      return
    }
    onApply(getContractType(), selectedStates)
    onClose()
  }

  if (!isOpen) return null

  const isStateSelected = (state: string) => selectedStates.includes(state)
  // Show states section when "State" is selected (either alone or with Federal)
  const showStatesSection = stateSelected

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        className="relative rounded-2xl p-6 w-[320px]"
        style={{ backgroundColor: '#1e2a3a', border: '1px solid #3a4a5a' }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 hover:opacity-80"
        >
          <img src="/static/app/dashboard/ClosePop.svg" alt="Close" className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-white font-poppins text-xl font-semibold text-center mb-6">
          Select Your Filters
        </h2>

        {/* Contract Type Section */}
        <div className="mb-4">
          <h3 className="text-white font-poppins text-sm font-semibold mb-3">Contract Type</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleContractTypeChange('all')}
              className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                federalSelected && stateSelected
                  ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                  : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
              }`}
            >
              All Contracts
            </button>
            <button
              onClick={() => handleContractTypeChange('federal')}
              className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                federalSelected
                  ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                  : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
              }`}
            >
              Federal
            </button>
            <button
              onClick={() => handleContractTypeChange('state')}
              className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                stateSelected
                  ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                  : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
              }`}
            >
              State
            </button>
          </div>
        </div>

        {/* States Section - Only show when State or All Contracts is selected */}
        {showStatesSection && (
          <div className="mb-4">
            <h3 className="text-white font-poppins text-sm font-semibold mb-3">Please Select One Or More States</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStateToggle('all')}
                className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                  isStateSelected('all')
                    ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                    : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
                }`}
              >
                All States
              </button>
              <button
                onClick={() => handleStateToggle('IL')}
                className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                  isStateSelected('IL')
                    ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                    : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
                }`}
              >
                Illinois (IL)
              </button>
              <button
                onClick={() => handleStateToggle('IN')}
                className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                  isStateSelected('IN')
                    ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                    : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
                }`}
              >
                Indiana (IN)
              </button>
            </div>
            {error && (
              <p className="text-red-400 font-poppins text-xs mt-2">{error}</p>
            )}
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={handleApply}
          className="w-full py-3 rounded-full font-poppins text-sm font-semibold text-white mt-4"
          style={{ backgroundColor: '#6bb4b5' }}
        >
          Apply
        </button>
      </div>
    </div>
  )
}

const Dashboard = () => {
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
  
  // Top categories from backend (calculated from ALL contracts, not just current page)
  const [topCategories, setTopCategories] = useState<{name: string, count: number, percentage: number}[]>([])

  const contractsPerPage = 10
  const startItem = (currentPage - 1) * contractsPerPage + 1
  const endItem = Math.min(currentPage * contractsPerPage, totalContracts)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    loadContracts()
  }, [currentPage, contractType, selectedStates])

  const loadUserData = async () => {
    try {
      const user = await api.getUser()
      setCredits(user.credits_balance)
      setUserName(user.first_name || user.email.split('@')[0])
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const loadContracts = async () => {
    setLoading(true)
    try {
      // Use searchContracts only when there's a query or non-default filters
      // Otherwise use getContracts (which doesn't require auth)
      const hasFilters = searchQuery || contractType !== 'all' || selectedStates.length > 0
      const data = hasFilters
        ? await api.searchContracts(searchQuery, currentPage, contractType, selectedStates)
        : await api.getContracts(currentPage)
      
      // Transform API response to component format
      const transformedContracts: Contract[] = data.contracts.map((c: ApiContract, index: number) => ({
        id: index + 1,
        name: c.bid_name,
        category: c.category,
        naicsCode: c.naics_code || 'N/A',
        dueDate: c.due_date,
        status: c.status || 'Open',
        detailLink: c.detail_link,
        hashValue: c.hash_value
      }))
      
      setContracts(transformedContracts)
      setTotalContracts(data.total_contracts || transformedContracts.length)
      setTotalPages(data.total_pages || 1)
      
      // Use top_categories from backend (calculated from ALL contracts, not just current page)
      if (data.top_categories && data.top_categories.length > 0) {
        setTopCategories(data.top_categories.slice(0, 4)) // Top 4 for the grid
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
      <Header credits={5} />
      
      {/* Sidebar + Content row below header */}
      <div className="flex">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          {/* Overview Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 lg:mb-6">
            <h1 className="text-white font-poppins text-lg lg:text-xl">Overview</h1>
            <div className="flex items-center gap-2 text-white font-poppins text-xs sm:text-sm">
              <span>Accounts</span>
              <span>|</span>
              <span className="text-white">{userName || 'Loading...'}</span>
            </div>
          </div>

          {/* Top Contract Categories */}
          <div className="mb-6 lg:mb-8">
            <h2 className="text-white font-poppins text-xs sm:text-sm uppercase tracking-wider mb-3 lg:mb-4 font-bold">TOP CONTRACT CATEGORIES</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {topCategories.map((cat, index) => (
                <div key={index} className="card-gradient rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="rgba(107, 180, 181, 0.2)"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#6bb4b5"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${cat.percentage * 1.76} 176`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-white font-poppins text-sm font-bold">
                        {cat.percentage}%
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-poppins font-semibold">{cat.name}</h3>
                      <p className="text-corama-teal font-poppins text-sm">{cat.count} contracts</p>
                    </div>
                  </div>
                  <button className="absolute top-2 right-2 text-gray-400 hover:text-white">
                    ...
                  </button>
                </div>
              ))}
            </div>
          </div>

                    {/* Available Contracts Table */}
                    <div className="rounded-xl p-3 sm:p-4 lg:p-6 border" style={{ backgroundColor: '#2f3c4f', borderColor: '#98C9CA' }}>
                      {/* Single row: Heading LEFT, Search CENTER, Filter/Pagination RIGHT */}
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4 lg:mb-6">
                        {/* Left: Available Contracts heading */}
                        <h2 className="text-white font-poppins font-semibold text-base lg:text-lg whitespace-nowrap">Available Contracts</h2>
                        
                        {/* Center: Search Bar */}
                        <form onSubmit={handleSearch} className="relative flex-1 max-w-xl mx-auto">
                          <input
                            type="text"
                            placeholder="SEARCH CONTRACTS"
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
                              className="p-1 hover:opacity-80"
                            >
                              <img src="/static/app/dashboard/LeftArrow.svg" alt="Previous" className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setCurrentPage(p => p + 1)}
                              className="p-1 hover:opacity-80"
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
                              <th className="text-left py-3 pr-6 font-normal whitespace-nowrap align-bottom">Contract Name</th>
                              <th className="text-left py-3 font-normal whitespace-nowrap align-bottom">Category</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">NAICS Code(s)</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">Due Date</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">Status</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">AI Assistant</th>
                              <th className="text-center py-3 px-4 font-normal whitespace-nowrap align-bottom">Visit Site</th>
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
                                    onClick={() => contract.hashValue && (window.location.href = `/ai-assistant?contract=${contract.hashValue}`)}
                                    className="p-1 hover:opacity-80 transition-opacity inline-flex justify-center"
                                    title="Open AI Assistant for this contract"
                                  >
                                    <img src="/static/app/dashboard/AIAssistant.svg" alt="AI Assistant" className="w-6 h-6" />
                                  </button>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <button 
                                    onClick={() => contract.detailLink && window.open(contract.detailLink, '_blank')}
                                    className="p-1 hover:opacity-80 transition-opacity inline-flex justify-center"
                                    title="Visit contract website"
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
                          <div key={contract.id} className="bg-corama-darker/50 rounded-lg p-3 sm:p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-white font-poppins font-semibold text-sm sm:text-base flex-1 pr-2">{contract.name}</h3>
                              <span className="text-green-400 font-poppins text-xs sm:text-sm">{contract.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mb-3">
                              <div>
                                <span className="text-gray-400">Category:</span>
                                <p className="text-gray-300">{contract.category}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Due:</span>
                                <p className="text-gray-300">{contract.dueDate}</p>
                              </div>
                            </div>
                            <div className="flex gap-4">
                              <button 
                                onClick={() => contract.hashValue && (window.location.href = `/ai-assistant?contract=${contract.hashValue}`)}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                              >
                                <img src="/static/app/dashboard/AIAssistant.svg" alt="" className="w-5 h-5" aria-hidden="true" />
                                <span className="text-corama-teal text-xs sm:text-sm">AI Assistant</span>
                              </button>
                              <button 
                                onClick={() => contract.detailLink && window.open(contract.detailLink, '_blank')}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                              >
                                <img src="/static/app/dashboard/VisitSite.svg" alt="" className="w-5 h-5" aria-hidden="true" />
                                <span className="text-corama-teal text-xs sm:text-sm">Visit Site</span>
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

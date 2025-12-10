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

const Dashboard = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalContracts, setTotalContracts] = useState(0)
  const [_totalPages, setTotalPages] = useState(1)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [_loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [_credits, setCredits] = useState(0)
  const [_userName, setUserName] = useState('')

  const contractsPerPage = 10
  const startItem = (currentPage - 1) * contractsPerPage + 1
  const endItem = Math.min(currentPage * contractsPerPage, totalContracts)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    loadContracts()
  }, [currentPage])

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
      const data = searchQuery 
        ? await api.searchContracts(searchQuery, currentPage)
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

  const categories = [
    { name: 'Construction', percentage: 25.0, count: Math.round(totalContracts * 0.25) },
    { name: 'IT Services', percentage: 20.0, count: Math.round(totalContracts * 0.20) },
    { name: 'Professional', percentage: 18.0, count: Math.round(totalContracts * 0.18) },
    { name: 'Maintenance', percentage: 15.0, count: Math.round(totalContracts * 0.15) },
  ]

  return (
    <div className="flex min-h-screen bg-corama-dark">
      {/* Horizontal separator line across entire viewport width, below header (lg only) */}
      <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-20" aria-hidden="true" />
      
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header credits={5} />
        
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          {/* Overview Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 lg:mb-6">
            <h1 className="text-white font-poppins text-lg lg:text-xl">Overview</h1>
            <div className="flex items-center gap-2 text-white font-poppins text-xs sm:text-sm">
              <span>Accounts</span>
              <span>|</span>
              <span className="text-white">Test User</span>
            </div>
          </div>

          {/* Top Contract Categories */}
          <div className="mb-6 lg:mb-8">
            <h2 className="text-gray-400 font-poppins text-xs sm:text-sm uppercase tracking-wider mb-3 lg:mb-4">TOP CONTRACT CATEGORIES</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {categories.map((cat, index) => (
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
                          <button className="text-gray-400 hover:text-white p-1">
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
  )
}

export default Dashboard

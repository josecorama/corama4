import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { RefreshCw, AlertTriangle, Shield, Eye, EyeOff, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../services/api'
import { useTranslation } from '../i18n'

interface Contract {
  id: string
  title: string
  state: string
  contract_type: string
  agency: string
  deadline: string
  hidden: boolean
}

interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

const AdminContracts = () => {
  const { t: _t } = useTranslation()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [hiddenCount, setHiddenCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadContracts()
    }
  }, [currentPage, isAdmin])

  const checkAdminAndLoad = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const adminStatus = await api.checkAdminStatus()
      
      if (!adminStatus.success || !adminStatus.is_admin) {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      
      setIsAdmin(true)
      await loadContracts()
    } catch (err) {
      console.error('Error loading admin data:', err)
      setError('Failed to load admin data')
      setLoading(false)
    }
  }

  const loadContracts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await api.adminGetContracts(currentPage, 50, searchQuery)
      
      if (result.success && result.contracts) {
        setContracts(result.contracts)
        if (result.pagination) {
          setPagination(result.pagination)
        }
        if (result.hidden_count !== undefined) {
          setHiddenCount(result.hidden_count)
        }
      } else {
        setError(result.error || 'Failed to load contracts')
      }
    } catch (err) {
      console.error('Error loading contracts:', err)
      setError('Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadContracts()
  }

  const handleToggleVisibility = async (contractId: string, currentlyHidden: boolean) => {
    setTogglingId(contractId)
    
    try {
      const result = currentlyHidden 
        ? await api.adminUnhideContract(contractId)
        : await api.adminHideContract(contractId)
      
      if (result.success) {
        setContracts(prev => prev.map(c => 
          c.id === contractId ? { ...c, hidden: !currentlyHidden } : c
        ))
        setHiddenCount(prev => currentlyHidden ? prev - 1 : prev + 1)
      } else {
        setError(result.error || 'Failed to update contract visibility')
      }
    } catch (err) {
      console.error('Error toggling contract visibility:', err)
      setError('Failed to update contract visibility')
    } finally {
      setTogglingId(null)
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && pagination && page <= pagination.total_pages) {
      setCurrentPage(page)
    }
  }

  // Not admin - show access denied
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-corama-dark">
        <Header />
        <div className="flex">
          <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
              <div className="card-gradient rounded-xl p-6 lg:p-8 text-center">
                <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl mb-2">Access Denied</h1>
                <p className="text-gray-400 font-poppins mb-6">You do not have admin privileges to access this page.</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-corama-teal text-white font-poppins px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Return to Dashboard
                </button>
              </div>
            </main>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-corama-dark">
      <Header />
      
      <div className="flex">
        <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
            <div className="card-gradient rounded-xl p-3 sm:p-4 lg:p-6 animate-fade-in">
              {/* Page Title */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-6 h-6 text-corama-teal" />
                    <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl uppercase tracking-wider">Admin: Contract Visibility</h1>
                  </div>
                  <p className="text-gray-400 font-poppins text-sm">Hide or show contracts to normal users</p>
                </div>
                <button
                  onClick={() => loadContracts()}
                  disabled={loading}
                  className="flex items-center gap-2 bg-corama-teal/20 text-corama-teal font-poppins px-4 py-2 rounded-lg hover:bg-corama-teal/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-corama-dark/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 font-poppins text-xs mb-1">Total Contracts</p>
                  <p className="text-white font-poppins font-bold text-xl">{pagination?.total || 0}</p>
                </div>
                <div className="bg-corama-dark/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 font-poppins text-xs mb-1">Hidden</p>
                  <p className="text-red-400 font-poppins font-bold text-xl">{hiddenCount}</p>
                </div>
                <div className="bg-corama-dark/50 rounded-lg p-4 text-center">
                  <p className="text-gray-400 font-poppins text-xs mb-1">Visible</p>
                  <p className="text-green-400 font-poppins font-bold text-xl">{(pagination?.total || 0) - hiddenCount}</p>
                </div>
              </div>

              {/* Search */}
              <form onSubmit={handleSearch} className="mb-6">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search contracts by title or description..."
                      className="w-full bg-corama-dark border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white font-poppins text-sm focus:border-corama-teal focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-corama-teal text-white font-poppins px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-400 font-poppins text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-corama-teal mx-auto mb-4 animate-spin" />
                  <p className="text-gray-400 font-poppins">Loading contracts...</p>
                </div>
              )}

              {/* Contracts Table */}
              {!loading && contracts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">Title</th>
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">State</th>
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">Type</th>
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">Agency</th>
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">Status</th>
                        <th className="text-right text-gray-400 font-poppins text-sm py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((contract) => (
                        <tr key={contract.id} className="border-b border-gray-700/50 hover:bg-white/5">
                          <td className="text-white font-poppins text-sm py-4 px-2 max-w-xs truncate" title={contract.title}>
                            {contract.title}
                          </td>
                          <td className="text-gray-300 font-poppins text-sm py-4 px-2">{contract.state}</td>
                          <td className="text-gray-300 font-poppins text-sm py-4 px-2">{contract.contract_type}</td>
                          <td className="text-gray-300 font-poppins text-sm py-4 px-2 max-w-xs truncate" title={contract.agency}>
                            {contract.agency}
                          </td>
                          <td className="py-4 px-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-poppins ${
                              contract.hidden 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {contract.hidden ? 'Hidden' : 'Visible'}
                            </span>
                          </td>
                          <td className="text-right py-4 px-2">
                            <button
                              onClick={() => handleToggleVisibility(contract.id, contract.hidden)}
                              disabled={togglingId === contract.id}
                              className={`flex items-center gap-1 ml-auto font-poppins text-sm transition-colors ${
                                contract.hidden
                                  ? 'text-green-400 hover:text-green-300'
                                  : 'text-red-400 hover:text-red-300'
                              } disabled:opacity-50`}
                            >
                              {togglingId === contract.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : contract.hidden ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                              {contract.hidden ? 'Show' : 'Hide'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty State */}
              {!loading && contracts.length === 0 && !error && (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-poppins">No contracts found.</p>
                </div>
              )}

              {/* Pagination */}
              {!loading && pagination && pagination.total_pages > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p className="text-gray-400 font-poppins text-sm">
                    Page {pagination.page} of {pagination.total_pages} ({pagination.total} total contracts)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 bg-corama-dark border border-gray-700 text-white font-poppins px-3 py-1 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                        let pageNum: number
                        if (pagination.total_pages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= pagination.total_pages - 2) {
                          pageNum = pagination.total_pages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`w-8 h-8 rounded-lg font-poppins text-sm transition-colors ${
                              currentPage === pageNum
                                ? 'bg-corama-teal text-white'
                                : 'bg-corama-dark border border-gray-700 text-gray-400 hover:bg-gray-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === pagination.total_pages}
                      className="flex items-center gap-1 bg-corama-dark border border-gray-700 text-white font-poppins px-3 py-1 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminContracts

import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { Phone, Mail, Globe, Users, Calendar, ChevronLeft, ChevronRight, Filter, Briefcase } from 'lucide-react'
import { api, DirectoryCompany } from '../services/api'

interface Company {
  id: number
  name: string
  contactName: string
  description: string
  phone: string
  email: string
  website: string
  employees: string
  yearsInBusiness: number
  logo?: string
}

const CoramaDirectory = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCompanies, setTotalCompanies] = useState(0)
  const [_totalPages, setTotalPages] = useState(1)
  const [companies, setCompanies] = useState<Company[]>([])
  const [_loading, setLoading] = useState(true)
  const companiesPerPage = 10
  const startItem = totalCompanies > 0 ? (currentPage - 1) * companiesPerPage + 1 : 0
  const endItem = Math.min(currentPage * companiesPerPage, totalCompanies)

  useEffect(() => {
    loadDirectory()
  }, [currentPage])

  const loadDirectory = async () => {
    setLoading(true)
    try {
      const data = await api.getDirectory(currentPage, searchQuery)
      if (data.success && data.companies) {
        const transformedCompanies: Company[] = data.companies.map((c: DirectoryCompany, index: number) => ({
          id: index + 1,
          name: c.name,
          contactName: c.contactName || 'N/A',
          description: c.description || 'No description available',
          phone: c.phone || 'N/A',
          email: c.email || 'N/A',
          website: c.website || 'N/A',
          employees: c.employees || 'N/A',
          yearsInBusiness: c.yearsInBusiness || 0,
          logo: c.logo
        }))
        setCompanies(transformedCompanies)
        setTotalCompanies(data.total || transformedCompanies.length)
        setTotalPages(data.total_pages || 1)
      }
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadDirectory()
  }

  return (
    <div className="flex min-h-screen bg-corama-dark">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header credits={5} />
        
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          <div className="card-gradient rounded-xl p-3 sm:p-4 lg:p-6">
            {/* Page Title */}
            <div className="mb-4 lg:mb-6">
              <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl uppercase tracking-wider">CORAMA Partner Directory</h1>
              <p className="text-gray-400 font-poppins text-sm">Search Companies</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-4 lg:mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                className="w-full bg-white border border-gray-200 rounded-lg py-2 sm:py-3 px-3 sm:px-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm sm:text-base"
              />
            </form>

            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 lg:mb-6">
              <h2 className="text-white font-poppins font-semibold text-sm sm:text-base">Available Companies</h2>
              <div className="flex items-center gap-3 sm:gap-4">
                <button className="text-gray-400 hover:text-white">
                  <Filter size={18} />
                </button>
                <div className="flex items-center gap-2 text-gray-400 font-poppins text-xs sm:text-sm">
                  <span>{startItem}-{endItem} of {totalCompanies}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1 hover:text-white"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-1 hover:text-white"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Company Cards */}
            <div className="space-y-4 lg:space-y-6">
              {companies.map((company) => (
                <div key={company.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 pb-4 lg:pb-6 border-b border-corama-darker/50">
                  {/* Company Logo Placeholder */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-gray-300 rounded-lg flex-shrink-0 mx-auto sm:mx-0"></div>

                  {/* Company Details */}
                  <div className="flex-1">
                    <h3 className="text-white font-poppins font-bold text-base sm:text-lg lg:text-xl mb-1 text-center sm:text-left">{company.name}</h3>
                    <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-2 text-center sm:text-left">{company.contactName}</p>
                    <p className="text-gray-300 font-poppins text-xs sm:text-sm mb-3 lg:mb-4">{company.description}</p>

                    {/* Contact Info - Stack on mobile */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-4 lg:gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-corama-teal/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Phone size={12} className="text-corama-teal" />
                        </div>
                        <span className="text-gray-300 font-poppins text-xs sm:text-sm">{company.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-corama-teal/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Mail size={12} className="text-corama-teal" />
                        </div>
                        <span className="text-corama-teal font-poppins text-xs sm:text-sm break-all">{company.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-corama-teal/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Globe size={12} className="text-corama-teal" />
                        </div>
                        <span className="text-gray-300 font-poppins text-xs sm:text-sm">{company.website}</span>
                      </div>
                    </div>

                    {/* Company Stats */}
                    <div className="flex items-center gap-4 sm:gap-6 mt-3 lg:mt-4">
                      <div className="flex items-center gap-2 text-gray-400 font-poppins text-xs sm:text-sm">
                        <Users size={14} />
                        <span>{company.employees}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 font-poppins text-xs sm:text-sm">
                        <Calendar size={14} />
                        <span>{company.yearsInBusiness} years</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Join the List CTA */}
            <div className="mt-6 lg:mt-8 flex justify-center">
              <button className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 card-gradient border border-corama-teal/30 rounded-xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4 hover:bg-corama-darker transition-colors w-full sm:w-auto">
                <div className="text-center sm:text-left">
                  <h3 className="text-white font-poppins font-bold text-base sm:text-lg">Join the list</h3>
                  <p className="text-gray-400 font-poppins text-xs sm:text-sm">Increase your visibility and connect with businesses.</p>
                </div>
                <Briefcase size={28} className="text-corama-teal flex-shrink-0" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default CoramaDirectory

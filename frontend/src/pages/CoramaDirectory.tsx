import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { Briefcase } from 'lucide-react'
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
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCompanies, setTotalCompanies] = useState(0)
  const [_totalPages, setTotalPages] = useState(1)
  const [companies, setCompanies] = useState<Company[]>([])
  const [_loading, setLoading] = useState(true)
  const [hasDirectoryProfile, setHasDirectoryProfile] = useState<boolean | null>(null)
  const companiesPerPage = 10
  const startItem = totalCompanies > 0 ? (currentPage - 1) * companiesPerPage + 1 : 0
  const endItem = Math.min(currentPage * companiesPerPage, totalCompanies)

  useEffect(() => {
    loadDirectory()
    checkDirectoryProfile()
  }, [currentPage])

  const checkDirectoryProfile = async () => {
    try {
      const data = await api.getDirectoryProfile()
      if (data.success && data.profile) {
        setHasDirectoryProfile(data.profile.listed === true)
      } else {
        setHasDirectoryProfile(false)
      }
    } catch (error) {
      console.error('Failed to check directory profile:', error)
      setHasDirectoryProfile(false)
    }
  }

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
    <div className="min-h-screen bg-corama-dark">
      {/* Header spans full width at top */}
      <Header />
      
      {/* Sidebar + Content row below header */}
      <div className="flex">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
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
                placeholder="Search by company name, services, or description..."
                className="w-full bg-white border border-gray-200 rounded-full py-2 sm:py-3 px-4 sm:px-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm sm:text-base"
              />
            </form>

            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 lg:mb-6">
              <h2 className="text-corama-teal font-poppins font-semibold text-sm sm:text-base">Available Companies</h2>
              <div className="flex items-center gap-3 sm:gap-4">
                <button className="hover:opacity-80">
                  <img src="/static/app/dashboard/Filter.svg" alt="Filter" className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-gray-400 font-poppins text-xs sm:text-sm">
                  <span>{startItem}-{endItem} of {totalCompanies}</span>
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

            {/* Company Cards */}
            <div className="space-y-4 lg:space-y-6">
              {companies.map((company) => (
                <div key={company.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6">
                  {/* Company Logo and Stats Column */}
                  <div className="flex flex-col items-center sm:items-start">
                    {/* Company Logo */}
                    <div className="w-40 h-40 sm:w-44 sm:h-44 lg:w-48 lg:h-48 bg-white rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center border-2 border-corama-teal/30">
                      {company.logo ? (
                        <img src={company.logo} alt={`${company.name} logo`} className="w-full h-full object-contain" />
                      ) : (
                        <Briefcase size={32} className="text-gray-400" />
                      )}
                    </div>
                    {/* Company Stats - Below logo */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2 text-gray-400 font-poppins text-xs sm:text-sm">
                        <img src="/static/app/dashboard/Employees.svg" alt="" className="w-4 h-4" />
                        <span>{company.employees}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 font-poppins text-xs sm:text-sm">
                        <img src="/static/app/dashboard/YearsInBusiness.svg" alt="" className="w-4 h-4" />
                        <span>{company.yearsInBusiness} years</span>
                      </div>
                    </div>
                  </div>

                  {/* Company Details */}
                  <div className="flex-1">
                    <h3 className="text-white font-poppins font-bold text-base sm:text-lg lg:text-xl mb-1 text-center sm:text-left">{company.name}</h3>
                    <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-2 text-center sm:text-left">{company.contactName}</p>
                    <p className="text-gray-300 font-poppins text-xs sm:text-sm mb-3 lg:mb-4">{company.description}</p>

                    {/* Contact Info */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 lg:gap-6">
                      <div className="flex items-center gap-2">
                        <img src="/static/app/dashboard/Phone.svg" alt="" className="w-5 h-5" />
                        <span className="text-gray-300 font-poppins text-xs sm:text-sm">{company.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <img src="/static/app/dashboard/Email.svg" alt="" className="w-5 h-5" />
                        <a href={`mailto:${company.email}`} className="text-corama-teal font-poppins text-xs sm:text-sm break-all underline hover:opacity-80">{company.email}</a>
                      </div>
                      <div className="flex items-center gap-2">
                        <img src="/static/app/dashboard/Website.svg" alt="" className="w-5 h-5" />
                        <span className="text-gray-300 font-poppins text-xs sm:text-sm">{company.website}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Join the List / Edit Profile CTA */}
            <div className="mt-6 lg:mt-8 flex justify-center">
              {hasDirectoryProfile ? (
                <button 
                  onClick={() => navigate('/edit-directory-profile')}
                  className="flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white"
                  style={{ backgroundColor: 'rgb(28, 66, 98)' }}
                >
                  <div className="text-left">
                    <p className="font-bold text-sm sm:text-base">Edit Profile</p>
                    <p className="text-xs sm:text-sm text-gray-300">Click to edit your registration.</p>
                  </div>
                  <img src="/static/app/dashboard/EditProfile.svg" alt="" className="w-6 h-6 flex-shrink-0" />
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/edit-directory-profile')}
                  className="flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white"
                  style={{ backgroundColor: 'rgb(28, 66, 98)' }}
                >
                  <div className="text-left">
                    <p className="font-bold text-sm sm:text-base">Join the list</p>
                    <p className="text-xs sm:text-sm text-gray-300">Increase your visibility and connect with businesses seeking your expertise.</p>
                  </div>
                  <img src="/static/app/dashboard/JoinTheList.svg" alt="" className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </main>
        </div>
      </div>
    </div>
  )
}

export default CoramaDirectory

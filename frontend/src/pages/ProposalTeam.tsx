import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../services/api'

// SVG asset paths
const CheckIcon = '/static/app/contract-analysis/Check.svg'
const EmptyCheckIcon = '/static/app/contract-analysis/EmptyCheck.svg'
const ContinueIcon = '/static/app/contract-analysis/Continue.svg'
const FromCORAMADirectoryIcon = '/static/app/team-builder/FromCORAMADirectory.svg'
const ManualEntryIcon = '/static/app/team-builder/ManualEntry.svg'
const FromSiteIcon = '/static/app/team-builder/FromSite.svg'
const AddIcon = '/static/app/team-builder/Add.svg'
const CancelIcon = '/static/app/team-builder/Cancel.svg'
const EmailIcon = '/static/app/team-builder/Email.svg'
const EmployeesIcon = '/static/app/team-builder/Employees.svg'
const FilterIcon = '/static/app/team-builder/Filter.svg'
const LeftArrowIcon = '/static/app/team-builder/LeftArrow.svg'
const PhoneIcon = '/static/app/team-builder/Phone.svg'
const RightArrowIcon = '/static/app/team-builder/RightArrow.svg'
const WebsiteIcon = '/static/app/team-builder/Website.svg'
const YearsInBusinessIcon = '/static/app/team-builder/YearsInBusiness.svg'

interface ProposalTeamState {
  contractName?: string
  contractId?: string
  contractAgency?: string
  contractCategory?: string
  aiFindings?: string
}

interface TeamMember {
  name: string
  role: string
  email?: string
  phone?: string
  website?: string
  employees?: string
  yearsInBusiness?: number
  logo?: string
}

interface DirectoryCompany {
  id: string
  name: string
  contactName: string
  description: string
  phone: string
  email: string
  website: string
  employees: string
  yearsInBusiness: number
  logo: string
  services: string
  certifications: string
}

type ViewMode = 'default' | 'addFromWebsite' | 'coramaDirectory'

const ProposalTeam = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ProposalTeamState | null
  
  // Step 1 is complete (we came from Contract Analysis)
  const step1Complete = true
  
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('default')
  
  // Selected option for adding team members (null = no default selection)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  
  // Team members list
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  
  // AI suggestions state - cached to avoid regeneration
  const [aiSuggestions, setAiSuggestions] = useState<string>('')
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  
  // Add from website state
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  
  // CORAMA Directory state
  const [directoryCompanies, setDirectoryCompanies] = useState<DirectoryCompany[]>([])
  const [directoryTotal, setDirectoryTotal] = useState(0)
  const [directoryPage, setDirectoryPage] = useState(1)
  const [directoryTotalPages, setDirectoryTotalPages] = useState(1)
  const [directorySearch, setDirectorySearch] = useState('')
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false)
  const [currentCompanyIndex, setCurrentCompanyIndex] = useState(0)
  
  // Fetch AI suggestions on mount - with caching to avoid regeneration
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!state?.aiFindings) return
      
      // Check sessionStorage cache first
      const cacheKey = state?.contractId ? `teamSuggestions:${state.contractId}` : null
      if (cacheKey) {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          setAiSuggestions(cached)
          return
        }
      }
      
      setIsLoadingSuggestions(true)
      try {
        const response = await api.getTeamSuggestions(state.aiFindings, state.contractName || 'Contract')
        if (response.success && response.suggestions) {
          setAiSuggestions(response.suggestions)
          // Cache the suggestions
          if (cacheKey) {
            sessionStorage.setItem(cacheKey, response.suggestions)
          }
        }
      } catch (error) {
        console.error('Error fetching team suggestions:', error)
      } finally {
        setIsLoadingSuggestions(false)
      }
    }
    
    fetchSuggestions()
  }, [state?.aiFindings, state?.contractName, state?.contractId])

  const handleContinue = () => {
    // Navigate to the next step (Pricing)
    navigate('/proposal-pricing', { 
      state: { 
        ...state,
        teamMembers 
      } 
    })
  }

  const handleOptionClick = (option: string) => {
    setSelectedOption(option)
    if (option === 'from-site') {
      setViewMode('addFromWebsite')
    } else if (option === 'from-directory') {
      setViewMode('coramaDirectory')
      fetchDirectory(1, '')
    }
  }
  
  // Fetch directory companies
  const fetchDirectory = async (page: number, search: string) => {
    setIsLoadingDirectory(true)
    try {
      const response = await api.getDirectory(page, search)
      if (response.success) {
        setDirectoryCompanies(response.companies)
        setDirectoryTotal(response.total)
        setDirectoryPage(response.page)
        setDirectoryTotalPages(response.total_pages)
        setCurrentCompanyIndex(0)
      }
    } catch (error) {
      console.error('Error fetching directory:', error)
    } finally {
      setIsLoadingDirectory(false)
    }
  }
  
  // Handle directory search
  const handleDirectorySearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchDirectory(1, directorySearch)
  }
  
  // Handle pagination - previous company
  const handlePrevCompany = () => {
    if (currentCompanyIndex > 0) {
      setCurrentCompanyIndex(prev => prev - 1)
    } else if (directoryPage > 1) {
      // Go to previous page and show last company
      const newPage = directoryPage - 1
      setIsLoadingDirectory(true)
      api.getDirectory(newPage, directorySearch).then(response => {
        if (response.success) {
          setDirectoryCompanies(response.companies)
          setDirectoryPage(response.page)
          setCurrentCompanyIndex(response.companies.length - 1)
        }
        setIsLoadingDirectory(false)
      })
    }
  }
  
  // Handle pagination - next company (prevent going past total)
  const handleNextCompany = () => {
    const globalIndex = (directoryPage - 1) * directoryCompanies.length + currentCompanyIndex
    if (globalIndex >= directoryTotal - 1) {
      // Already at the last company, don't go further
      return
    }
    
    if (currentCompanyIndex < directoryCompanies.length - 1) {
      setCurrentCompanyIndex(prev => prev + 1)
    } else if (directoryPage < directoryTotalPages) {
      // Go to next page and show first company
      const newPage = directoryPage + 1
      setIsLoadingDirectory(true)
      api.getDirectory(newPage, directorySearch).then(response => {
        if (response.success) {
          setDirectoryCompanies(response.companies)
          setDirectoryPage(response.page)
          setCurrentCompanyIndex(0)
        }
        setIsLoadingDirectory(false)
      })
    }
  }
  
  // Add company from directory to team members
  const handleAddFromDirectory = (company: DirectoryCompany) => {
    // Check if already added
    const alreadyAdded = teamMembers.some(m => m.name === company.name)
    if (alreadyAdded) return
    
    setTeamMembers(prev => [
      ...prev,
      {
        name: company.name,
        role: company.services || 'CORAMA Partner',
        email: company.email,
        phone: company.phone,
        website: company.website,
        employees: company.employees,
        yearsInBusiness: company.yearsInBusiness,
        logo: company.logo
      }
    ])
  }
  
  // Handle Go Back button - different behavior based on view mode
  const handleGoBack = () => {
    if (viewMode === 'coramaDirectory' || viewMode === 'addFromWebsite') {
      // Return to default view - AI suggestions are preserved
      setViewMode('default')
      setSelectedOption(null)
    } else {
      // From default view, go back to contract analysis
      navigate('/contract-analysis', { state })
    }
  }

  const handleCancelAddFromWebsite = () => {
    setViewMode('default')
    setSelectedOption(null)
    setWebsiteUrl('')
    setExtractError(null)
  }

  const handleAddFromWebsite = async () => {
    if (!websiteUrl) return
    
    setIsExtracting(true)
    setExtractError(null)
    
    try {
      const response = await api.extractCompanyFromWebsite(websiteUrl.trim())
      
      if (!response.success || !response.company_name) {
        setExtractError(response.error || 'Could not extract company info from that URL.')
        return
      }
      
      // Add the extracted company to team members
      setTeamMembers(prev => [
        ...prev,
        {
          name: response.company_name || 'Unknown Company',
          role: response.services_area || 'Partner from website',
          email: response.email,
          phone: response.contact_number
        }
      ])
      
      // Return to default view - AI suggestions are preserved
      setViewMode('default')
      setSelectedOption(null)
      setWebsiteUrl('')
    } catch (error) {
      console.error('Error extracting company info:', error)
      setExtractError('Something went wrong extracting company info.')
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="h-screen bg-corama-dark flex flex-col overflow-hidden">
      {/* Header spans full width at top */}
      <Header credits={5} />
      
      {/* Sidebar + Content row below header */}
      <div className="flex flex-1 overflow-hidden">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        
        <Sidebar onGoBack={handleGoBack} />
      
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-hidden flex flex-col">
            {/* Page Title */}
            <div className="text-center mb-4 flex-shrink-0">
              <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl mb-3">Build Your Team</h1>
              
              {/* Progress Circles - Check for step 1, empty for steps 2 and 3 */}
              <div className="flex justify-center gap-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="relative">
                    {step === 1 && step1Complete ? (
                      // Step 1 complete - show check with glow animation
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-corama-teal/50 animate-pulse blur-md" />
                        <img src={CheckIcon} alt="Step 1 Complete" className="w-14 h-14 relative z-10" />
                      </div>
                    ) : (
                      // Steps 2 and 3 show empty check (no numbers)
                      <img src={EmptyCheckIcon} alt={`Step ${step}`} className="w-14 h-14" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content Container with border */}
            <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden rounded-2xl border border-white p-4">
              {viewMode === 'default' ? (
                <>
                  {/* AI Suggestions Section - White card, taller and scrollable */}
                  <div className="bg-white rounded-xl p-4 flex-1 min-h-0 flex flex-col">
                    <h2 className="text-gray-800 font-poppins font-semibold text-lg mb-2 flex-shrink-0">AI Suggestions For a Wise Team Selection</h2>
                    <div className="text-gray-600 font-poppins text-sm overflow-y-auto flex-1">
                      {isLoadingSuggestions ? (
                        <p className="text-gray-500 italic">Loading AI suggestions...</p>
                      ) : aiSuggestions ? (
                        <ReactMarkdown
                          components={{
                            p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
                            ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="ml-2">{children}</li>,
                            strong: ({children}) => <strong className="font-semibold text-gray-800">{children}</strong>,
                            em: ({children}) => <em className="italic">{children}</em>,
                            h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-gray-800">{children}</h1>,
                            h2: ({children}) => <h2 className="text-base font-bold mb-2 text-gray-800">{children}</h2>,
                            h3: ({children}) => <h3 className="text-sm font-bold mb-1 text-gray-800">{children}</h3>,
                          }}
                        >
                          {aiSuggestions}
                        </ReactMarkdown>
                      ) : (
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam turpis dolor, mollis vel lacinia in, suscipit suscipit odio. In tristique metus velit, vitae fermentum enim maximus et. Donec in sollicitudin justo, vitae euismod dolor. Curabitur at nisl sit amet nibh dignissim viverra quis non tellus.</p>
                      )}
                    </div>
                  </div>

                  {/* Option Cards - Three teal cards in a row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
                    {/* From CORAMA Directory */}
                    <div 
                      onClick={() => handleOptionClick('from-directory')}
                      className={`relative rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg min-h-[140px] ${
                        selectedOption === 'from-directory' ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: '#99C8CA' }}
                    >
                      <h3 className="text-white font-poppins font-semibold text-base mb-2">From CORAMA Directory</h3>
                      <p className="text-gray-100 font-poppins text-sm">Find partners from the CORAMA network</p>
                      <img src={FromCORAMADirectoryIcon} alt="" className="absolute bottom-3 right-3 w-10 h-10 opacity-70" />
                    </div>

                    {/* Manual Entry */}
                    <div 
                      onClick={() => handleOptionClick('manual-entry')}
                      className={`relative rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg min-h-[140px] ${
                        selectedOption === 'manual-entry' ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: '#99C8CA' }}
                    >
                      <h3 className="text-white font-poppins font-semibold text-base mb-2">Manual Entry</h3>
                      <p className="text-gray-100 font-poppins text-sm">Enter subcontractor details manually</p>
                      <img src={ManualEntryIcon} alt="" className="absolute bottom-3 right-3 w-10 h-10 opacity-70" />
                    </div>

                    {/* From Web Site */}
                    <div 
                      onClick={() => handleOptionClick('from-site')}
                      className={`relative rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg min-h-[140px] ${
                        selectedOption === 'from-site' ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: '#99C8CA' }}
                    >
                      <h3 className="text-white font-poppins font-semibold text-base mb-2">From Web Site</h3>
                      <p className="text-gray-100 font-poppins text-sm">Extract company info from their website</p>
                      <img src={FromSiteIcon} alt="" className="absolute bottom-3 right-3 w-10 h-10 opacity-70" />
                    </div>
                  </div>
                </>
              ) : viewMode === 'addFromWebsite' ? (
                /* Add from Website View */
                <div className="flex flex-col gap-6 flex-1">
                  <div>
                    <h2 className="text-white font-poppins font-semibold text-lg">Add from Website</h2>
                    <p className="text-white font-poppins text-sm mt-1">Company Website URL</p>
                  </div>

                  <input
                    type="url"
                    className="w-full rounded-full px-6 py-3 bg-white text-gray-800 outline-none font-poppins"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    disabled={isExtracting}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleCancelAddFromWebsite}
                      className="flex items-center justify-center gap-3 px-6 py-3 rounded-full font-poppins font-semibold text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#99C8CA' }}
                      disabled={isExtracting}
                    >
                      <span>Cancel</span>
                      <img src={CancelIcon} alt="" className="w-7 h-7" />
                    </button>

                    <button
                      type="button"
                      onClick={handleAddFromWebsite}
                      className="flex items-center justify-center gap-3 px-6 py-3 rounded-full font-poppins font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: '#99C8CA' }}
                      disabled={isExtracting || !websiteUrl}
                    >
                      <span>{isExtracting ? 'Extracting...' : 'Add to team'}</span>
                      <img src={AddIcon} alt="" className="w-7 h-7" />
                    </button>
                  </div>

                  {extractError && (
                    <p className="text-red-400 text-sm">{extractError}</p>
                  )}
                </div>
              ) : (
                /* CORAMA Partner Directory View */
                <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                  {/* Header */}
                  <div>
                    <h2 className="text-white font-poppins font-bold text-lg uppercase tracking-wide">CORAMA Partner Directory</h2>
                    <p className="text-white font-poppins text-sm mt-1">Search Companies</p>
                  </div>

                  {/* Search Input */}
                  <form onSubmit={handleDirectorySearch} className="flex-shrink-0">
                    <input
                      type="text"
                      className="w-full rounded-full px-6 py-3 bg-white text-gray-800 outline-none font-poppins"
                      placeholder="Search by company name, services, or description..."
                      value={directorySearch}
                      onChange={e => setDirectorySearch(e.target.value)}
                    />
                  </form>

                  {/* Available Companies Header with Filter and Pagination */}
                  <div className="flex items-center justify-between flex-shrink-0">
                    <h3 className="text-white font-poppins font-semibold">Available Companies</h3>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-white opacity-70 hover:opacity-100">
                        <img src={FilterIcon} alt="Filter" className="w-4 h-4" />
                      </button>
                      <span className="text-white font-poppins text-sm">
                        {directoryTotal > 0 ? `${(directoryPage - 1) * directoryCompanies.length + currentCompanyIndex + 1}-${Math.min((directoryPage - 1) * directoryCompanies.length + currentCompanyIndex + 2, directoryTotal)} of ${directoryTotal}` : '0 of 0'}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={handlePrevCompany}
                          disabled={directoryPage === 1 && currentCompanyIndex === 0}
                          className="p-1 hover:opacity-80 disabled:opacity-30"
                        >
                          <img src={LeftArrowIcon} alt="Previous" className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={handleNextCompany}
                          disabled={(directoryPage - 1) * directoryCompanies.length + currentCompanyIndex >= directoryTotal - 1}
                          className="p-1 hover:opacity-80 disabled:opacity-30"
                        >
                          <img src={RightArrowIcon} alt="Next" className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Company Card */}
                  {isLoadingDirectory ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-white font-poppins">Loading companies...</p>
                    </div>
                  ) : directoryCompanies.length > 0 && directoryCompanies[currentCompanyIndex] ? (
                    <div 
                      className="flex gap-4 p-4 rounded-xl cursor-pointer hover:bg-gray-700/30 transition-colors"
                      style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
                      onClick={() => handleAddFromDirectory(directoryCompanies[currentCompanyIndex])}
                    >
                      {/* Company Logo */}
                      <div className="w-40 h-40 flex-shrink-0 bg-gray-300 rounded-lg overflow-hidden">
                        {directoryCompanies[currentCompanyIndex].logo ? (
                          <img 
                            src={directoryCompanies[currentCompanyIndex].logo} 
                            alt={directoryCompanies[currentCompanyIndex].name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300" />
                        )}
                      </div>

                      {/* Company Info */}
                      <div className="flex-1 flex flex-col">
                        <h4 className="text-white font-poppins font-bold text-lg">{directoryCompanies[currentCompanyIndex].name}</h4>
                        <p className="text-gray-300 font-poppins text-sm">{directoryCompanies[currentCompanyIndex].contactName}</p>
                        <p className="text-gray-400 font-poppins text-sm mt-2 line-clamp-2">
                          {directoryCompanies[currentCompanyIndex].description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam turpis dolor, mollis vel lacinia in, suscipit suscipit odio. In tristique metus velit.'}
                        </p>

                        {/* Contact Info Row */}
                        <div className="flex flex-wrap gap-4 mt-4">
                          {directoryCompanies[currentCompanyIndex].phone && (
                            <div className="flex items-center gap-2">
                              <img src={PhoneIcon} alt="" className="w-8 h-8" />
                              <span className="text-white font-poppins text-sm">{directoryCompanies[currentCompanyIndex].phone}</span>
                            </div>
                          )}
                          {directoryCompanies[currentCompanyIndex].email && (
                            <div className="flex items-center gap-2">
                              <img src={EmailIcon} alt="" className="w-8 h-8" />
                              <a href={`mailto:${directoryCompanies[currentCompanyIndex].email}`} className="text-white font-poppins text-sm underline">
                                {directoryCompanies[currentCompanyIndex].email}
                              </a>
                            </div>
                          )}
                          {directoryCompanies[currentCompanyIndex].website && (
                            <div className="flex items-center gap-2">
                              <img src={WebsiteIcon} alt="" className="w-8 h-8" />
                              <a href={directoryCompanies[currentCompanyIndex].website.startsWith('http') ? directoryCompanies[currentCompanyIndex].website : `https://${directoryCompanies[currentCompanyIndex].website}`} target="_blank" rel="noopener noreferrer" className="text-white font-poppins text-sm">
                                {directoryCompanies[currentCompanyIndex].website.replace(/^https?:\/\//, '')}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-gray-400 font-poppins">No companies found</p>
                    </div>
                  )}

                  {/* Bottom Info Row - Employees and Years in Business */}
                  {directoryCompanies.length > 0 && directoryCompanies[currentCompanyIndex] && (
                    <div className="flex gap-6 flex-shrink-0">
                      {directoryCompanies[currentCompanyIndex].employees && (
                        <div className="flex items-center gap-2">
                          <img src={EmployeesIcon} alt="" className="w-5 h-5" />
                          <span className="text-white font-poppins text-sm">{directoryCompanies[currentCompanyIndex].employees}</span>
                        </div>
                      )}
                      {directoryCompanies[currentCompanyIndex].yearsInBusiness > 0 && (
                        <div className="flex items-center gap-2">
                          <img src={YearsInBusinessIcon} alt="" className="w-5 h-5" />
                          <span className="text-white font-poppins text-sm">{directoryCompanies[currentCompanyIndex].yearsInBusiness} years</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Team Members Section - Dark background with white border */}
            <div className="rounded-2xl border border-white p-4 flex-shrink-0 mt-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)' }}>
              <h3 className="text-white font-poppins font-semibold text-lg mb-2">Team Members</h3>
              
              {teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="font-poppins font-medium text-white">{member.name}</p>
                        <p className="font-poppins text-sm text-gray-400">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4">
                  <p className="text-gray-300 font-poppins text-sm">No team members added yet</p>
                  <p className="text-gray-500 font-poppins text-xs mt-1">Click one of the options above to add team members</p>
                </div>
              )}
            </div>

            {/* Continue Button - Fixed at bottom */}
            <div className="flex-shrink-0 pt-4 flex justify-center">
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-8 py-3 rounded-full font-poppins text-base font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#99C8CA', color: 'white' }}
              >
                Continue
                <img src={ContinueIcon} alt="" className="w-6 h-6" />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ProposalTeam

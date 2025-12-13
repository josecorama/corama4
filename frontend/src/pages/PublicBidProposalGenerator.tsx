import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

// Icons
const SaveIcon = '/static/app/dashboard/SaveIcon.svg'
const DocxIcon = '/static/app/dashboard/Docx.svg'
const DashboardIcon = '/static/app/dashboard/DashboardIcon.svg'
const ReloadIcon = '/static/app/dashboard/Reload.svg'

interface ProposalGeneratorState {
  contractId?: string
  contractName?: string
  aiFindings?: string
  aiSuggestions?: string
  aiStrategy?: string
  teamMembers?: Array<{name: string; role: string; email?: string; phone?: string}>
  laborCosts?: Array<{id: string; role: string; hours: number; rate: number; cost: number}>
  materials?: Array<{id: string; item: string; quantity: number; unit_cost: number; cost: number}>
  profitMarginPct?: string
  riskReservePct?: string
  laborTotal?: number
  materialsTotal?: number
  subtotal?: number
  profitMargin?: number
  riskReserve?: number
  totalBidAmount?: number
}

// Section card component
interface SectionCardProps {
  number: number
  title: string
  progress: number
}

const SectionCard = ({ number, title, progress }: SectionCardProps) => {
  return (
    <div className="rounded-2xl border border-white p-3 flex items-center gap-3" style={{ backgroundColor: '#333c4d' }}>
      {/* Progress Circle */}
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="#1a2332"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="#99C8CA"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${progress * 1.256} 125.6`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-white font-poppins text-xs font-semibold">
          {progress.toFixed(1)}%
        </span>
      </div>
      
      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className="text-white font-poppins text-sm font-medium leading-tight block">
          {number}. {title}
        </span>
      </div>
      
      {/* Menu dots */}
      <button className="text-white opacity-70 hover:opacity-100 flex-shrink-0">
        <span className="text-lg">...</span>
      </button>
    </div>
  )
}

const PublicBidProposalGenerator = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ProposalGeneratorState | null

  const handleGoBack = () => {
    navigate('/proposal-summary', { state })
  }

  const handleDashboard = () => {
    navigate('/dashboard')
  }

  // 8 proposal sections
  const sections = [
    { number: 1, title: 'Cover Letter & Executive Summary' },
    { number: 2, title: 'Administrative & Compliance' },
    { number: 3, title: 'Technical Approach' },
    { number: 4, title: 'Management & Staffing Plan' },
    { number: 5, title: 'Corporate Experience' },
    { number: 6, title: 'Quality Assurance' },
    { number: 7, title: 'Price/Cost Proposal (Draft)' },
    { number: 8, title: 'Attachments Documentation Index' },
  ]

  return (
    <div className="h-screen bg-corama-dark flex flex-col overflow-hidden">
      <Header credits={5} />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        
        <Sidebar onGoBack={handleGoBack} />
      
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col">
            {/* Page Title */}
            <div className="text-center mb-3 flex-shrink-0">
              <h1 className="text-corama-teal font-poppins font-bold text-xl lg:text-2xl">Public Bid Proposal Generator</h1>
              <p className="text-gray-400 font-poppins text-sm">AI-powered 8-section proposal generation</p>
            </div>

            {/* Important Disclaimer */}
            <div className="bg-white rounded-2xl p-4 mb-4 flex-shrink-0">
              <h2 className="text-gray-800 font-poppins font-semibold text-base mb-2">Important Disclaimer</h2>
              <p className="text-gray-600 font-poppins text-sm leading-relaxed">
                This tool generates a DRAFT proposal using AI. The output is NOT a final, complete, or legally 
                binding document. All content must be thoroughly reviewed, edited, and approved by 
                qualified personnel before any official use or submission.
              </p>
            </div>

            {/* Section Cards Grid - 2 rows of 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 flex-shrink-0">
              {sections.map((section) => (
                <SectionCard
                  key={section.number}
                  number={section.number}
                  title={section.title}
                  progress={0}
                />
              ))}
            </div>

            {/* How To Use This Draft */}
            <div className="bg-white rounded-2xl p-4 mb-4 flex-shrink-0">
              <h2 className="text-gray-800 font-poppins font-semibold text-base mb-2">How To Use This Draft</h2>
              <ol className="text-gray-600 font-poppins text-sm space-y-1 list-decimal list-inside">
                <li>Review: Carefully read each section for accuracy and completeness.</li>
                <li>Edit: Replace placeholders marked with [brackets] and refine the language.</li>
                <li>Validate: Verify all pricing, compliance statements, and technical claims.</li>
                <li>Approve: Obtain necessary internal legal/compliance approvals.</li>
                <li>Finalize: Download the DOCX file, edit in your word processor, and prepare for submission.</li>
              </ol>
            </div>

            {/* Toolbar */}
            <div className="rounded-2xl p-3 mb-4 flex justify-center gap-10 flex-shrink-0" style={{ backgroundColor: '#333c4d' }}>
              <button className="text-white hover:opacity-80 transition-opacity">
                <img src={SaveIcon} alt="Save" className="w-6 h-6" />
              </button>
              <button className="text-white hover:opacity-80 transition-opacity">
                <img src={ReloadIcon} alt="Regenerate" className="w-6 h-6" />
              </button>
              <button className="text-white hover:opacity-80 transition-opacity">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            </div>

            {/* Large Content Area */}
            <div className="bg-white rounded-2xl flex-1 min-h-[300px] mb-4">
              {/* Empty content area for generated proposal */}
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4 flex-shrink-0">
              <button
                className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-poppins font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#99C8CA' }}
              >
                <div className="flex flex-col items-start">
                  <span className="text-base">Regenerate Proposal</span>
                  <span className="text-xs opacity-80">You can get a second chance</span>
                </div>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              <button
                className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-poppins font-semibold text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="text-base">Download DRAFT</span>
                  <span className="text-xs text-gray-500">Download your draft on DOCX</span>
                </div>
                <img src={DocxIcon} alt="DOCX" className="w-8 h-8" />
              </button>
            </div>

            {/* Dashboard Button */}
            <div className="flex justify-center flex-shrink-0">
              <button
                onClick={handleDashboard}
                className="flex items-center justify-center gap-3 px-8 py-3 rounded-2xl font-poppins font-semibold text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="text-base">Dashboard</span>
                  <span className="text-xs text-gray-500">Return to the dashboard</span>
                </div>
                <img src={DashboardIcon} alt="Dashboard" className="w-6 h-6" />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default PublicBidProposalGenerator

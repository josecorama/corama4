import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

// SVG asset paths
const CheckIcon = '/static/app/contract-analysis/Check.svg'
const EmptyCheckIcon = '/static/app/contract-analysis/EmptyCheck.svg'
const ContinueIcon = '/static/app/contract-analysis/Continue.svg'
const FromCORAMADirectoryIcon = '/static/app/team-builder/FromCORAMADirectory.svg'
const ManualEntryIcon = '/static/app/team-builder/ManualEntry.svg'
const FromSiteIcon = '/static/app/team-builder/FromSite.svg'

interface ProposalTeamState {
  contractName?: string
  contractId?: string
  contractAgency?: string
  contractCategory?: string
  aiFindings?: string
}

const ProposalTeam = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ProposalTeamState | null
  
  // Current step in the guided process (1 = Contract Analysis, 2 = Team, 3 = Pricing)
  const currentStep = 2
  // Step 1 is complete (we came from Contract Analysis)
  const step1Complete = true
  
  // Selected option for adding team members
  const [selectedOption, setSelectedOption] = useState<string | null>('from-site')
  
  // Team members list (empty for now)
  const [teamMembers] = useState<Array<{ name: string; role: string }>>([])

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
  }

  return (
    <div className="h-screen bg-corama-dark flex flex-col overflow-hidden">
      {/* Header spans full width at top */}
      <Header credits={5} />
      
      {/* Sidebar + Content row below header */}
      <div className="flex flex-1 overflow-hidden">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        
        <Sidebar />
      
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-hidden flex flex-col">
            {/* Page Title */}
            <div className="text-center mb-4 flex-shrink-0">
              <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl mb-3">Build Your Team</h1>
              
              {/* Progress Circles */}
              <div className="flex justify-center gap-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="relative">
                    {step === 1 && step1Complete ? (
                      // Step 1 complete - show check with glow animation
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-corama-teal/50 animate-pulse blur-md" />
                        <img src={CheckIcon} alt="Step 1 Complete" className="w-14 h-14 relative z-10" />
                      </div>
                    ) : currentStep === step ? (
                      <div className="w-14 h-14 rounded-full bg-corama-teal flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{step}</span>
                      </div>
                    ) : (
                      <img src={EmptyCheckIcon} alt={`Step ${step}`} className="w-14 h-14" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Suggestions Section */}
            <div className="text-center mb-4 flex-shrink-0">
              <h2 className="text-white font-poppins font-semibold text-lg mb-2">AI Suggestions For a Wise Team Selection</h2>
              <p className="text-gray-300 font-poppins text-sm max-w-2xl mx-auto">
                Based on the contract requirements, we recommend building a team with expertise in the relevant areas. 
                Add team members using one of the options below.
              </p>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
              {/* Option Cards - Three options in a row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
                {/* From CORAMA Directory */}
                <div 
                  onClick={() => handleOptionClick('from-directory')}
                  className={`bg-white rounded-2xl p-6 flex flex-col items-center cursor-pointer transition-all hover:shadow-lg ${
                    selectedOption === 'from-directory' ? 'ring-2 ring-corama-teal' : ''
                  }`}
                >
                  <img src={FromCORAMADirectoryIcon} alt="From CORAMA Directory" className="w-16 h-16 mb-3" />
                  <h3 className="text-gray-800 font-poppins font-semibold text-base text-center">From CORAMA Directory</h3>
                  <p className="text-gray-500 font-poppins text-xs text-center mt-1">Search our network of professionals</p>
                </div>

                {/* Manual Entry */}
                <div 
                  onClick={() => handleOptionClick('manual-entry')}
                  className={`bg-white rounded-2xl p-6 flex flex-col items-center cursor-pointer transition-all hover:shadow-lg ${
                    selectedOption === 'manual-entry' ? 'ring-2 ring-corama-teal' : ''
                  }`}
                >
                  <img src={ManualEntryIcon} alt="Manual Entry" className="w-16 h-16 mb-3" />
                  <h3 className="text-gray-800 font-poppins font-semibold text-base text-center">Manual Entry</h3>
                  <p className="text-gray-500 font-poppins text-xs text-center mt-1">Add team members manually</p>
                </div>

                {/* From Web Site */}
                <div 
                  onClick={() => handleOptionClick('from-site')}
                  className={`bg-white rounded-2xl p-6 flex flex-col items-center cursor-pointer transition-all hover:shadow-lg ${
                    selectedOption === 'from-site' ? 'ring-2 ring-corama-teal' : ''
                  }`}
                >
                  <img src={FromSiteIcon} alt="From Web Site" className="w-16 h-16 mb-3" />
                  <h3 className="text-gray-800 font-poppins font-semibold text-base text-center">From Web Site</h3>
                  <p className="text-gray-500 font-poppins text-xs text-center mt-1">Import from LinkedIn or company site</p>
                </div>
              </div>

              {/* Team Members Section */}
              <div className="bg-white rounded-2xl p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
                <h3 className="text-gray-800 font-poppins font-semibold text-lg mb-3 flex-shrink-0">Team Members</h3>
                
                {teamMembers.length > 0 ? (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="font-poppins font-medium text-gray-800">{member.name}</p>
                          <p className="font-poppins text-sm text-gray-500">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400 font-poppins text-sm">No team members added yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button - Fixed at bottom */}
            <div className="flex-shrink-0 pt-4 flex justify-center">
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-8 py-3 rounded-full font-poppins text-base font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#99C8CA', color: '#1a2744' }}
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

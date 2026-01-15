import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { api } from '../services/api'
import { useTranslation } from '../i18n'

// Icons
const DocxIcon = '/static/app/dashboard/Docx.svg'
const DashboardIcon = '/static/app/dashboard/DashboardIcon.svg'
const SaveIcon = '/static/app/dashboard/Save.svg'
const ReloadIcon = '/static/app/dashboard/Reload.svg'
const FolderIcon = '/static/app/dashboard/Folder.svg'
const RegenerateProposalIcon = '/static/app/dashboard/RegenerateProposal.svg'

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
  draftId?: string
}

type SectionStatus = 'pending' | 'generating' | 'completed' | 'error'

// Section card component
interface SectionCardProps {
  number: number
  title: string
  progress: number
  status: SectionStatus
}

const SectionCard = ({ number, title, progress, status }: SectionCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'generating': return '#6BB4B5'
      case 'completed': return '#6BB4B5'
      case 'error': return '#e74c3c'
      default: return '#1a2332'
    }
  }

  return (
    <div 
      className="rounded-2xl border border-white p-3 flex items-center gap-3 transition-all duration-300"
      style={{ backgroundColor: '#192c46' }}
    >
      {/* Progress Circle with spinning animation */}
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg 
          className={`w-12 h-12 ${status === 'generating' ? 'animate-spin' : ''}`}
          style={{ transformOrigin: 'center' }}
        >
          {/* Background circle */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="#1a2332"
            strokeWidth="4"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke={getStatusColor()}
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${progress * 1.256} 125.6`}
            strokeLinecap="round"
            className="transition-all duration-500"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        {/* Percentage counter in center */}
        <span className="absolute inset-0 flex items-center justify-center text-white font-poppins text-xs font-semibold">
          {`${Math.round(progress)}%`}
        </span>
      </div>
      
      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className="text-white font-poppins text-sm font-medium leading-tight block">
          {number}. {title}
        </span>
        <span className={`text-xs font-poppins`} style={{
          color: status === 'completed' ? '#6BB4B5' : 
                 status === 'error' ? '#e74c3c' : 
                 status === 'generating' ? '#6BB4B5' : 
                 '#9ca3af'
        }}>
          {status === 'completed' ? 'Completed' : 
           status === 'error' ? 'Error' : 
           status === 'generating' ? 'Generating...' : 
           'Pending'}
        </span>
      </div>
    </div>
  )
}

// Discard Changes Popup Component
interface DiscardChangesPopupProps {
  isOpen: boolean
  onStayHere: () => void
  onDiscard: () => void
}

const DiscardChangesPopup = ({ isOpen, onStayHere, onDiscard }: DiscardChangesPopupProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onStayHere}
      />
      <div 
        className="relative rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none w-full sm:w-auto mx-4 border border-white/20"
        style={{ backgroundColor: 'rgb(11, 44, 72)', minHeight: '200px' }}
      >
        <button 
          className="absolute top-4 right-4 hover:opacity-80 transition-opacity"
          onClick={onStayHere}
        >
          <img src="/static/app/proposal-summary/ClosePopupButton.svg" alt="Close" className="w-6 h-6" />
        </button>
        <div className="flex-shrink-0">
          <img 
            src="/static/app/proposal-summary/WarnIcon.svg" 
            alt="Warning" 
            className="w-16 h-16 sm:w-20 sm:h-20"
          />
        </div>
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-white font-poppins font-bold text-lg sm:text-xl mb-1">
              Discard unsaved changes?
            </h3>
            <p className="text-gray-300 font-poppins text-xs sm:text-sm">
              You're in the middle of a workflow.<br />
              If you go back now, your progress in this page will not be saved.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onStayHere}
              className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'rgb(92, 191, 192)' }}
            >
              Stay Here
            </button>
            <button
              onClick={onDiscard}
              className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'rgb(39, 69, 110)' }}
            >
              Discard & Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const PublicBidProposalGenerator = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ProposalGeneratorState | null
  
  // Discard changes popup state
  const [showDiscardPopup, setShowDiscardPopup] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  
  // State for generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(state?.draftId || null)
  const [fullProposal, setFullProposal] = useState<string>('')
  const [sectionStatuses, setSectionStatuses] = useState<SectionStatus[]>(
    Array(8).fill('pending')
  )
  const [sectionProgress, setSectionProgress] = useState<number[]>(
    Array(8).fill(0)
  )
  const [progressText, setProgressText] = useState('Initializing proposal generation...')
  
  // Ref to prevent double generation on mount
  const hasStartedGeneration = useRef(false)

  // 8 proposal sections
  const sectionTitles = [
    'Cover Letter & Executive Summary',
    'Administrative & Compliance',
    'Technical Approach',
    'Management & Staffing Plan',
    'Corporate Experience',
    'Quality Assurance',
    'Price/Cost Proposal (Draft)',
    'Attachments Documentation Index',
  ]

  const handleGoBack = () => {
    navigate('/proposal-summary', { state })
  }

  const handleDashboard = () => {
    navigate('/dashboard')
  }
  
  // Handle staying on the page
  const handleStayHere = () => {
    setShowDiscardPopup(false)
    setPendingNavigation(null)
  }
  
  // Handle discarding changes and navigating away
  const handleDiscard = () => {
    setShowDiscardPopup(false)
    if (pendingNavigation) {
      navigate(pendingNavigation)
    } else {
      navigate(-1)
    }
  }

  const handleDownload = () => {
    if (draftId) {
      api.downloadProposalDocx(draftId)
    }
  }

  // Ref for polling interval cleanup
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Helper function to poll job status for proposal generation progress
  const pollProposalStatus = (jobId: string) => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Poll every 2.5 seconds for progress updates
    const pollInterval = setInterval(async () => {
      try {
        const statusResult = await api.getProposalJobStatus(jobId)
        
        if (!statusResult.success) {
          // Job not found or error fetching
          clearInterval(pollInterval)
          pollingIntervalRef.current = null
          setError(statusResult.error || 'Failed to get job status')
          setSectionStatuses(Array(8).fill('error'))
          setProgressText('Error generating proposal')
          setIsGenerating(false)
          return
        }

        // Update section progress based on sections_completed array
        const sectionsCompleted = statusResult.sections_completed || []
        const totalSections = statusResult.sections_total || 8
        
        // Update UI for completed sections
        setSectionStatuses(prev => {
          const newStatuses = [...prev]
          sectionsCompleted.forEach((sectionNum: number) => {
            const sectionIndex = sectionNum - 1 // Convert 1-indexed to 0-indexed
            if (sectionIndex >= 0 && sectionIndex < 8) {
              newStatuses[sectionIndex] = 'completed'
            }
          })
          return newStatuses
        })
        
        setSectionProgress(prev => {
          const newProgress = [...prev]
          sectionsCompleted.forEach((sectionNum: number) => {
            const sectionIndex = sectionNum - 1
            if (sectionIndex >= 0 && sectionIndex < 8) {
              newProgress[sectionIndex] = 100
            }
          })
          return newProgress
        })
        
        setProgressText(`${sectionsCompleted.length}/${totalSections} sections complete`)

        // Check if job is completed
        if (statusResult.status === 'completed') {
          clearInterval(pollInterval)
          pollingIntervalRef.current = null
          
          if (statusResult.full_proposal) {
            setFullProposal(statusResult.full_proposal)
          }
          
          setGenerationComplete(true)
          setSectionStatuses(Array(8).fill('completed'))
          setSectionProgress(Array(8).fill(100))
          setProgressText('All 8 sections generated successfully!')
          setIsGenerating(false)
          return
        }

        // Check if job failed
        if (statusResult.status === 'error') {
          clearInterval(pollInterval)
          pollingIntervalRef.current = null
          setError(statusResult.error || 'Generation failed')
          setSectionStatuses(Array(8).fill('error'))
          setProgressText('Error generating proposal')
          setIsGenerating(false)
          return
        }

        // Job still running, continue polling
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        
        // Check if this is a rate limit error (429)
        const isRateLimitError = errorMessage.includes('429') || 
                                 errorMessage.includes('rate_limit') || 
                                 errorMessage.includes('Rate limit')
        
        // Silently continue polling for rate limit errors - loading animation is already showing
        if (!isRateLimitError) {
          console.error('Error polling job status:', err)
        }
        // Don't stop polling on errors, just continue
      }
    }, 2500) // Poll every 2.5 seconds

    pollingIntervalRef.current = pollInterval
  }

  // Initialize draft and generate proposal on mount
  useEffect(() => {
    const initializeAndGenerate = async () => {
      // Prevent double execution
      if (hasStartedGeneration.current) return
      hasStartedGeneration.current = true

      // Check if we have the required data
      const contractId = state?.contractId || sessionStorage.getItem('currentContractId')
      
      if (!contractId) {
        setError('No contract ID available. Please go back and select a contract.')
        return
      }

      // Start generation process
      setIsGenerating(true)
      setError(null)
      setSectionStatuses(Array(8).fill('generating'))
      setSectionProgress(Array(8).fill(0))
      setProgressText('Initializing proposal draft...')

      try {
        // Step 1: Initialize the draft
        const initResult = await api.initializeProposalDraft({
          contract_id: contractId,
          contract_name: state?.contractName || sessionStorage.getItem('currentContractName') || 'Contract',
          ai_findings: state?.aiFindings || sessionStorage.getItem('currentAiFindings') || '',
          ai_suggestions: state?.aiSuggestions || sessionStorage.getItem('currentAiSuggestions') || '',
          ai_strategy: state?.aiStrategy || '',
          team_members: state?.teamMembers || JSON.parse(sessionStorage.getItem('currentTeamMembers') || '[]'),
          labor_costs: state?.laborCosts || [],
          materials: state?.materials || [],
          margin_risk: {
            profit_margin_pct: parseFloat(state?.profitMarginPct || '15'),
            risk_reserve_pct: parseFloat(state?.riskReservePct || '5')
          }
        })

        if (!initResult.success || !initResult.draft_id) {
          throw new Error(initResult.error || 'Failed to initialize draft')
        }

        setDraftId(initResult.draft_id)
        setProgressText('Generating 8 sections in parallel using AI...')

        // Send team assignment notification emails to team members added from Corama Directory
        const teamMembers = state?.teamMembers || JSON.parse(sessionStorage.getItem('currentTeamMembers') || '[]')
        const contractName = state?.contractName || sessionStorage.getItem('currentContractName') || 'Contract'
        if (teamMembers.length > 0) {
          // Send emails in background - don't block proposal generation
          api.sendTeamAssignmentEmails({
            team_members: teamMembers,
            contract_name: contractName
          }).then(result => {
            if (result.success && result.emails_sent && result.emails_sent > 0) {
              console.log(`[Team Assignment] Sent ${result.emails_sent} notification email(s)`)
            }
          }).catch(err => {
            console.error('[Team Assignment] Error sending notification emails:', err)
          })
        }

        // Step 2: Start the proposal generation job (returns immediately with job_id)
        const generateResult = await api.generateProposalSections(initResult.draft_id)

        if (!generateResult.success || !generateResult.job_id) {
          throw new Error(generateResult.error || 'Failed to start proposal generation')
        }

        // Step 3: Start polling for progress updates (replaces SSE to avoid Gunicorn timeouts)
        pollProposalStatus(generateResult.job_id)

      } catch (err) {
        console.error('Error generating proposal:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate proposal')
        setSectionStatuses(Array(8).fill('error'))
        setSectionProgress(Array(8).fill(0))
        setProgressText('Error generating proposal')
        setIsGenerating(false)
      }
    }

    initializeAndGenerate()
    
    // Cleanup polling interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [state])

  // Regenerate proposal
  const handleRegenerate = async () => {
    if (!draftId) {
      setError('No draft ID available. Please go back and try again.')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGenerationComplete(false)
    setSectionStatuses(Array(8).fill('generating'))
    setSectionProgress(Array(8).fill(0))
    setProgressText('Regenerating 8 sections in parallel using AI...')

    try {
      // Start the proposal generation job (returns immediately with job_id)
      const generateResult = await api.generateProposalSections(draftId)

      if (!generateResult.success || !generateResult.job_id) {
        throw new Error(generateResult.error || 'Failed to start proposal regeneration')
      }

      // Start polling for progress updates (replaces SSE to avoid Gunicorn timeouts)
      pollProposalStatus(generateResult.job_id)

    } catch (err) {
      console.error('Error regenerating proposal:', err)
      setError(err instanceof Error ? err.message : 'Failed to regenerate proposal')
      setSectionStatuses(Array(8).fill('error'))
      setSectionProgress(Array(8).fill(0))
      setProgressText('Error regenerating proposal')
      setIsGenerating(false)
    }
  }

  // Calculate overall progress
  const overallProgress = sectionStatuses.filter(s => s === 'completed').length * 12.5

  return (
    <div className="h-screen bg-corama-dark flex flex-col overflow-hidden">
      {/* Discard Changes Popup */}
      <DiscardChangesPopup
        isOpen={showDiscardPopup}
        onStayHere={handleStayHere}
        onDiscard={handleDiscard}
      />
      
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
        
        <Sidebar 
          onGoBack={handleGoBack}
          onBeforeNavigate={(to) => {
            const workflowPages = ['/ai-assistant', '/team-builder', '/proposal-summary', '/proposal-generator', '/contract-analysis', '/proposal-team', '/public-bid-proposal-generator']
            const isLeavingWorkflow = !workflowPages.some(page => to.startsWith(page))
            
            if (isLeavingWorkflow) {
              setPendingNavigation(to)
              setShowDiscardPopup(true)
              return false
            }
            return true
          }}
        />
      
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-y-auto flex flex-col">
            {/* Page Title */}
            <div className="text-center mb-3 flex-shrink-0">
              <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl">Public Bid Proposal Generator</h1>
              <p className="text-white font-poppins text-sm">AI-powered 8-section proposal generation</p>
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

            {/* Progress Bar */}
            <div className="mb-4 flex-shrink-0">
              <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-corama-teal h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-center text-gray-400 font-poppins text-sm mt-2">{progressText}</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-2xl p-4 mb-4 flex-shrink-0">
                <p className="text-red-400 font-poppins text-sm">{error}</p>
              </div>
            )}

            {/* Section Cards Grid - 2 rows of 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 flex-shrink-0">
              {sectionTitles.map((title, index) => (
                <SectionCard
                  key={index}
                  number={index + 1}
                  title={title}
                  progress={sectionProgress[index]}
                  status={sectionStatuses[index]}
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

            {/* Preview Area with Toolbar - wrapped in flex container for proper centering */}
            <div className="w-full flex justify-center mb-12">
              <div className="w-full max-w-[800px] min-h-[400px] max-h-[70vh] flex flex-col rounded-2xl overflow-hidden border-2 min-h-0" style={{ borderColor: '#333c4d' }}>
              {/* Toolbar */}
              <div className="p-3 flex justify-center gap-16 flex-shrink-0" style={{ backgroundColor: '#333c4d' }}>
                <button 
                  onClick={handleDownload}
                  disabled={!generationComplete || isGenerating}
                  className="hover:opacity-80 transition-opacity disabled:opacity-50" 
                  title="Save/Download"
                >
                  <img src={SaveIcon} alt="Save" className="w-6 h-6" />
                </button>
                <button 
                  className="hover:opacity-80 transition-opacity disabled:opacity-50" 
                  title="Regenerate"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                >
                  <img src={ReloadIcon} alt="Reload" className="w-6 h-6" />
                </button>
                <button className="hover:opacity-80 transition-opacity" title="Folder">
                  <img src={FolderIcon} alt="Folder" className="w-6 h-6" />
                </button>
              </div>

              {/* Content Area - Shows generated proposal */}
              <div className="bg-white flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden">
              {isGenerating ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corama-teal mx-auto mb-4"></div>
                    <p className="text-gray-600 font-poppins">Generating your proposal...</p>
                    <p className="text-gray-400 font-poppins text-sm mt-2">This may take 1-2 minutes</p>
                  </div>
                </div>
              ) : generationComplete && fullProposal ? (
                <div className="font-mono text-sm text-gray-800 whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>
                  {fullProposal}
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-red-500 font-poppins mb-4">{error}</p>
                    <button
                      onClick={() => {
                        hasStartedGeneration.current = false
                        window.location.reload()
                      }}
                      className="px-4 py-2 bg-corama-teal text-white rounded-lg font-poppins hover:opacity-90"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 font-poppins">Proposal content will appear here once generated</p>
                </div>
              )}
              </div>
            </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-8 mb-8 flex-shrink-0 mx-auto" style={{ maxWidth: '800px', width: '100%' }}>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-poppins font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 border-2 border-white"
                style={{ backgroundColor: '#2d4160' }}
              >
                <div className="flex flex-col items-start">
                  <span className="text-base">Regenerate Proposal</span>
                  <span className="text-xs opacity-80">You can get a second chance</span>
                </div>
                <img src={RegenerateProposalIcon} alt="Regenerate" className="w-8 h-8" />
              </button>

              <button
                onClick={handleDownload}
                disabled={!generationComplete || isGenerating}
                className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-poppins font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed border-2 border-white"
                style={{ backgroundColor: '#2d4160' }}
              >
                <div className="flex flex-col items-start">
                  <span className="text-base">Download DRAFT</span>
                  <span className="text-xs opacity-80">Download your draft on DOCX</span>
                </div>
                <img src={DocxIcon} alt="DOCX" className="w-8 h-8" />
              </button>
            </div>

            {/* Dashboard Button */}
            <div className="flex justify-center flex-shrink-0 mb-8 mx-auto" style={{ maxWidth: '800px', width: '100%' }}>
              <button
                onClick={handleDashboard}
                className="flex items-center justify-center gap-3 px-8 py-3 rounded-2xl font-poppins font-semibold text-white hover:opacity-90 transition-opacity border-2 border-white"
                style={{ backgroundColor: '#2d4160' }}
              >
                <div className="flex flex-col items-start">
                  <span className="text-base">Dashboard</span>
                  <span className="text-xs opacity-80">Return to the dashboard</span>
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

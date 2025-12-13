import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { api } from '../services/api'

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
      case 'generating': return '#99C8CA'
      case 'completed': return '#27ae60'
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
        <span className={`text-xs font-poppins ${
          status === 'completed' ? 'text-green-400' : 
          status === 'error' ? 'text-red-400' : 
          status === 'generating' ? 'text-corama-teal' : 
          'text-gray-400'
        }`}>
          {status === 'completed' ? 'Completed' : 
           status === 'error' ? 'Error' : 
           status === 'generating' ? 'Generating...' : 
           'Pending'}
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
  
  // Refs for progress animation intervals
  const progressIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([])

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

  const handleDownload = () => {
    if (draftId) {
      api.downloadProposalDocx(draftId)
    }
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
      
      // Clear any existing progress intervals
      progressIntervalsRef.current.forEach(interval => clearInterval(interval))
      progressIntervalsRef.current = []
      
      // Start progress animations for each section with different speeds
      // Each section will animate from 0 to ~95% at different rates
      const sectionDurations = [8000, 10000, 12000, 9000, 11000, 7000, 13000, 6000] // Different durations for each section
      sectionDurations.forEach((duration, index) => {
        const stepMs = 100
        const steps = duration / stepMs
        const incrementPerStep = 95 / steps // Go up to 95%, final 5% when complete
        
        const interval = setInterval(() => {
          setSectionProgress(prev => {
            const newProgress = [...prev]
            if (newProgress[index] < 95) {
              newProgress[index] = Math.min(95, newProgress[index] + incrementPerStep)
            }
            return newProgress
          })
        }, stepMs)
        
        progressIntervalsRef.current.push(interval)
      })

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

        // Step 2: Generate the proposal sections
        const generateResult = await api.generateProposalSections(initResult.draft_id)

        if (!generateResult.success) {
          throw new Error(generateResult.error || 'Failed to generate proposal')
        }

        // Success! Clear progress intervals and complete all sections
        progressIntervalsRef.current.forEach(interval => clearInterval(interval))
        progressIntervalsRef.current = []
        
        // Animate each section to 100% with staggered completion
        const completionDelays = [0, 200, 400, 100, 300, 500, 600, 700] // Staggered completion times
        completionDelays.forEach((delay, index) => {
          setTimeout(() => {
            setSectionProgress(prev => {
              const newProgress = [...prev]
              newProgress[index] = 100
              return newProgress
            })
            setSectionStatuses(prev => {
              const newStatuses = [...prev]
              newStatuses[index] = 'completed'
              return newStatuses
            })
          }, delay)
        })
        
        // Final state update after all animations complete
        setTimeout(() => {
          setFullProposal(generateResult.full_proposal || '')
          setGenerationComplete(true)
          setProgressText('All 8 sections generated successfully!')
          setIsGenerating(false)
        }, 800)

      } catch (err) {
        console.error('Error generating proposal:', err)
        // Clear progress intervals on error
        progressIntervalsRef.current.forEach(interval => clearInterval(interval))
        progressIntervalsRef.current = []
        setError(err instanceof Error ? err.message : 'Failed to generate proposal')
        setSectionStatuses(Array(8).fill('error'))
        setSectionProgress(Array(8).fill(0))
        setProgressText('Error generating proposal')
        setIsGenerating(false)
      }
    }

    initializeAndGenerate()
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
    
    // Clear any existing progress intervals
    progressIntervalsRef.current.forEach(interval => clearInterval(interval))
    progressIntervalsRef.current = []
    
    // Start progress animations for each section with different speeds
    const sectionDurations = [8000, 10000, 12000, 9000, 11000, 7000, 13000, 6000]
    sectionDurations.forEach((duration, index) => {
      const stepMs = 100
      const steps = duration / stepMs
      const incrementPerStep = 95 / steps
      
      const interval = setInterval(() => {
        setSectionProgress(prev => {
          const newProgress = [...prev]
          if (newProgress[index] < 95) {
            newProgress[index] = Math.min(95, newProgress[index] + incrementPerStep)
          }
          return newProgress
        })
      }, stepMs)
      
      progressIntervalsRef.current.push(interval)
    })

    try {
      const generateResult = await api.generateProposalSections(draftId)

      if (!generateResult.success) {
        throw new Error(generateResult.error || 'Failed to regenerate proposal')
      }

      // Clear progress intervals and complete all sections
      progressIntervalsRef.current.forEach(interval => clearInterval(interval))
      progressIntervalsRef.current = []
      
      // Animate each section to 100% with staggered completion
      const completionDelays = [0, 200, 400, 100, 300, 500, 600, 700]
      completionDelays.forEach((delay, index) => {
        setTimeout(() => {
          setSectionProgress(prev => {
            const newProgress = [...prev]
            newProgress[index] = 100
            return newProgress
          })
          setSectionStatuses(prev => {
            const newStatuses = [...prev]
            newStatuses[index] = 'completed'
            return newStatuses
          })
        }, delay)
      })
      
      setTimeout(() => {
        setFullProposal(generateResult.full_proposal || '')
        setGenerationComplete(true)
        setProgressText('All 8 sections regenerated successfully!')
        setIsGenerating(false)
      }, 800)

    } catch (err) {
      console.error('Error regenerating proposal:', err)
      progressIntervalsRef.current.forEach(interval => clearInterval(interval))
      progressIntervalsRef.current = []
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

            {/* Preview Area with Toolbar */}
            <div className="flex-1 min-h-[300px] mb-4 flex flex-col rounded-2xl overflow-hidden border-2" style={{ borderColor: '#333c4d', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
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
                  <img src={ReloadIcon} alt="Reload" className={`w-6 h-6 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
                <button className="hover:opacity-80 transition-opacity" title="Folder">
                  <img src={FolderIcon} alt="Folder" className="w-6 h-6" />
                </button>
              </div>

              {/* Content Area - Shows generated proposal */}
              <div className="bg-white flex-1 p-4 overflow-y-auto">
              {isGenerating ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corama-teal mx-auto mb-4"></div>
                    <p className="text-gray-600 font-poppins">Generating your proposal...</p>
                    <p className="text-gray-400 font-poppins text-sm mt-2">This may take 1-2 minutes</p>
                  </div>
                </div>
              ) : generationComplete && fullProposal ? (
                <div className="font-mono text-sm text-gray-800 whitespace-pre-wrap">
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

            {/* Bottom Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4 flex-shrink-0" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-poppins font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#2d4160' }}
              >
                <div className="flex flex-col items-start">
                  <span className="text-base">Regenerate Proposal</span>
                  <span className="text-xs opacity-80">You can get a second chance</span>
                </div>
                <img src={RegenerateProposalIcon} alt="Regenerate" className={`w-8 h-8 ${isGenerating ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleDownload}
                disabled={!generationComplete || isGenerating}
                className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-poppins font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="flex justify-center flex-shrink-0" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <button
                onClick={handleDashboard}
                className="flex items-center justify-center gap-3 px-8 py-3 rounded-2xl font-poppins font-semibold text-white hover:opacity-90 transition-opacity"
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

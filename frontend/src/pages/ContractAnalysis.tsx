import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Lottie from 'lottie-react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { InlineLoading } from '../components/ThinkingPopup'
import checkAnimation from '../assets/CheckAnimation.json'
import EmptyCheckSvg from '../assets/EmptyCheck.svg'
import { api } from '../services/api'
import { useTranslation } from '../i18n'

// PDF Viewer imports
import { Viewer, Worker } from '@react-pdf-viewer/core'
import { highlightPlugin, Trigger, RenderHighlightsProps } from '@react-pdf-viewer/highlight'
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/highlight/lib/styles/index.css'

// SVG asset paths
const UploadContractPDFIcon = '/static/app/contract-analysis/UploadContractPDF.svg'
const AIFindingsIcon = '/static/app/contract-analysis/AIFindings.svg'
const ContinueIcon = '/static/app/contract-analysis/Continue.svg'

// Error Popup Component (for PDF drop errors)
interface ErrorPopupProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

const ErrorPopup = ({ isOpen, message, onClose }: ErrorPopupProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="relative rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none w-full sm:w-auto mx-4 border border-white/20 animate-popup-pop"
        style={{ backgroundColor: 'rgb(11, 44, 72)', minHeight: '180px' }}
      >
        <button 
          className="absolute top-4 right-4 hover:opacity-80 transition-opacity"
          onClick={onClose}
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
              Invalid File Type
            </h3>
            <p className="text-gray-300 font-poppins text-xs sm:text-sm">
              {message}
            </p>
          </div>
          <div className="flex justify-center sm:justify-start">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'rgb(92, 191, 192)' }}
            >
              OK
            </button>
          </div>
        </div>
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
        className="relative rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none w-full sm:w-auto mx-4 border border-white/20 animate-popup-pop"
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

// Types for structured findings
interface FindingCoordinate {
  page: number
  left: number
  top: number
  width: number
  height: number
  not_found?: boolean
  all_rects?: number[][] // Array of [x0, y0, x1, y1] for multi-line highlighting
  page_width?: number
  page_height?: number
}

interface StructuredFinding {
  id: string
  type: string
  title: string
  quote: string
  page_hint: number
  rationale: string
  severity?: string
  coordinates?: FindingCoordinate[]
}

interface FindingManifest {
  [key: string]: FindingCoordinate
}

// Generate a unique ID for contracts that don't have one
const generateContractId = () => {
  return `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

interface ContractAnalysisState {
  contractName?: string
  contractId?: string
  contractAgency?: string
  contractCategory?: string
  contractDetailLink?: string
}

const ContractAnalysis = () => {
  const { t: _t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ContractAnalysisState | null
  const contractName = state?.contractName || 'Contract'
  
  // Generate a stable contractId - use provided one, or generate a new one
  // useMemo ensures the same ID is used throughout the component lifecycle
  const contractId = useMemo(() => {
    const fromState = state?.contractId
    const fromStorage = sessionStorage.getItem('currentContractId')
    
    // If we have a valid ID from state, use it
    if (fromState && fromState.trim()) {
      sessionStorage.setItem('currentContractId', fromState)
      return fromState
    }
    
    // If we have a valid ID from storage, use it
    if (fromStorage && fromStorage.trim()) {
      return fromStorage
    }
    
    // Generate a new ID and store it
    const newId = generateContractId()
    sessionStorage.setItem('currentContractId', newId)
    return newId
  }, [state?.contractId])
  
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [aiFindings, setAiFindings] = useState<string | null>(null)
  const [isGeneratingFindings, setIsGeneratingFindings] = useState(false)
  const [headerKey, setHeaderKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // New state for structured findings and click-to-navigate
  const [structuredFindings, setStructuredFindings] = useState<StructuredFinding[]>([])
  const [manifest, setManifest] = useState<FindingManifest>({})
  const [annotatedPdfUrl, _setAnnotatedPdfUrl] = useState<string | null>(null)
  const WATCH_LIST = [
    "https://cookcountyil.bonfirehub.com",
    "https://www.demandstar.com",
    "https://www.bidnetdirect.com",
    "https://vendors.planetbids.com",
    "https://www.publicpurchase.com",
    "https://iq.govwin.com",
    "https://ha.internationaleprocurement.com",
    "https://business.metro.net",
    "https://smart.gep.com"
  ]
  const [thirdPartyTarget, setThirdPartyTarget] = useState<string | null>(null)
  const [showThirdPartyPopup, setShowThirdPartyPopup] = useState(false)
  const handleExternalLink = (href?: string, e?: React.MouseEvent) => {
    if (!href) return
    const isWatch = WATCH_LIST.some(prefix => href.startsWith(prefix))
    if (isWatch) {
      if (e) e.preventDefault()
      setThirdPartyTarget(href)
      setShowThirdPartyPopup(true)
    } else {
      window.open(href, '_blank')
    }
  }
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null)
  
  // Animation state for first checkmark - triggers when AI findings load
  const [showFirstCheckAnimation, setShowFirstCheckAnimation] = useState(false)
  const firstAnimationShown = useRef(false)

  // Discard changes popup state
  const [showDiscardPopup, setShowDiscardPopup] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Error popup state (for invalid file type)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Track if step 1 is complete (findings generated)
  const step1Complete = !!aiFindings
  
  // PDF viewer plugins
  const pageNavigationPluginInstance = pageNavigationPlugin()
  const { jumpToPage } = pageNavigationPluginInstance
  
  // Render highlights function for the highlight plugin
  // Uses all_rects for multi-line highlighting when available
  const renderHighlights = useCallback((props: RenderHighlightsProps) => {
    const pageHighlights = Object.entries(manifest)
      .filter(([_, coord]) => coord.page === props.pageIndex && !coord.not_found && coord.width > 0)
    
    return (
      <div>
        {pageHighlights.map(([findingId, coord]) => {
          const isActive = activeFindingId === findingId
          const highlightClass = `absolute transition-all duration-300 ${
            isActive 
              ? 'bg-yellow-400/60 ring-2 ring-yellow-500' 
              : 'bg-yellow-300/40 hover:bg-yellow-400/50'
          }`
          
          // If we have all_rects, render multiple rectangles for better multi-line highlighting
          // Otherwise fall back to the single bounding box
          if (coord.all_rects && coord.all_rects.length > 0 && coord.page_width && coord.page_height) {
            return (
              <div key={findingId} data-finding-id={findingId}>
                {coord.all_rects.map((rect, idx) => {
                  // Convert PDF coordinates to percentages
                  // rect is [x0, y0, x1, y1] in PDF points
                  const left = (rect[0] / coord.page_width!) * 100
                  const top = (rect[1] / coord.page_height!) * 100
                  const width = ((rect[2] - rect[0]) / coord.page_width!) * 100
                  const height = ((rect[3] - rect[1]) / coord.page_height!) * 100
                  
                  return (
                    <div
                      key={`${findingId}-${idx}`}
                      className={highlightClass}
                      style={props.getCssProperties({
                        pageIndex: coord.page,
                        left,
                        top,
                        width,
                        height,
                      }, props.rotation)}
                    />
                  )
                })}
              </div>
            )
          }
          
          // Fallback to single bounding box
          return (
            <div
              key={findingId}
              data-finding-id={findingId}
              className={highlightClass}
              style={props.getCssProperties({
                pageIndex: coord.page,
                left: coord.left,
                top: coord.top,
                width: coord.width,
                height: coord.height,
              }, props.rotation)}
            />
          )
        })}
      </div>
    )
  }, [manifest, activeFindingId])
  
  const highlightPluginInstance = highlightPlugin({
    renderHighlights,
    trigger: Trigger.None,
  })
  
  // Click-to-navigate handler
  const handleFindingClick = useCallback((findingId: string) => {
    const coord = manifest[findingId]
    if (!coord) return
    
    setActiveFindingId(findingId)
    
    // Jump to the page
    jumpToPage(coord.page)
    
    // After a short delay, scroll to the highlight element
    setTimeout(() => {
      const highlightElement = document.querySelector(`[data-finding-id="${findingId}"]`)
      if (highlightElement) {
        highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 300)
    
    // Clear active state after animation
    setTimeout(() => setActiveFindingId(null), 2000)
  }, [manifest, jumpToPage])
  
  // Trigger first checkmark animation when AI findings are loaded
  useEffect(() => {
    if (aiFindings && !firstAnimationShown.current) {
      firstAnimationShown.current = true
      setShowFirstCheckAnimation(true)
      const timer = setTimeout(() => setShowFirstCheckAnimation(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [aiFindings])

  // Auto-trigger AI findings generation when PDF is uploaded
  useEffect(() => {
    if (pdfFile && !aiFindings && !isGeneratingFindings) {
      handleGenerateFindings()
    }
  }, [pdfFile]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      // Create a local URL for preview
      const url = URL.createObjectURL(file)
      setPdfUrl(url)
    } else if (file) {
      setErrorMessage('Please select a PDF file. Only PDF documents are supported for contract analysis.')
      setShowErrorPopup(true)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      const url = URL.createObjectURL(file)
      setPdfUrl(url)
    } else {
      setErrorMessage('Please drop a PDF file. Only PDF documents are supported for contract analysis.')
      setShowErrorPopup(true)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  // State for async job progress
  const [jobProgress, setJobProgress] = useState<string>('')
  const jobPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (jobPollingRef.current) {
        clearInterval(jobPollingRef.current)
      }
    }
  }, [])

  const handleGenerateFindings = async () => {
    if (!pdfFile) {
      alert('Please upload a contract PDF first')
      return
    }

    setIsGeneratingFindings(true)
    setJobProgress('Uploading PDF...')
    
    try {
      // Create async job for contract analysis
      const formData = new FormData()
      formData.append('file', pdfFile)
      formData.append('contractName', contractName)
      
      const createResponse = await api.createContractAnalysisJob(formData)
      
      if (!createResponse.success || !createResponse.job_id) {
        throw new Error(createResponse.error || 'Failed to create analysis job')
      }
      
      const jobId = createResponse.job_id
      setJobProgress('Processing contract...')
      
      // Poll for job completion
      const pollJob = async (): Promise<void> => {
        try {
          const statusResponse = await api.getContractAnalysisJob(jobId)
          
          if (!statusResponse.success) {
            throw new Error(statusResponse.error || 'Failed to get job status')
          }
          
          // Update progress message
          if (statusResponse.progress) {
            setJobProgress(statusResponse.progress)
          }
          
          if (statusResponse.status === 'completed') {
            // Job completed successfully
            if (jobPollingRef.current) {
              clearInterval(jobPollingRef.current)
              jobPollingRef.current = null
            }
            
            const result = statusResponse.result
            if (result) {
              setAiFindings(result.markdown_summary || '')
              
              if (result.findings) {
                setStructuredFindings(result.findings)
                // Build manifest from findings
                const newManifest: FindingManifest = {}
                result.findings.forEach((finding: StructuredFinding) => {
                  if (finding.coordinates && finding.coordinates.length > 0) {
                    newManifest[finding.id] = finding.coordinates[0]
                  }
                })
                setManifest(newManifest)
              }
            }
            
            // Force Header to refresh credits
            setHeaderKey(k => k + 1)
            setIsGeneratingFindings(false)
            setJobProgress('')
            
          } else if (statusResponse.status === 'error') {
            // Job failed
            if (jobPollingRef.current) {
              clearInterval(jobPollingRef.current)
              jobPollingRef.current = null
            }
            throw new Error(statusResponse.error || 'Contract analysis failed')
            
          }
          // If status is 'queued' or 'running', continue polling
          
        } catch (pollError) {
          const errorMessage = pollError instanceof Error ? pollError.message : String(pollError)
          
          // Check if this is a rate limit error (429)
          const isRateLimitError = errorMessage.includes('429') || 
                                   errorMessage.includes('rate_limit') || 
                                   errorMessage.includes('Rate limit')
          
          if (isRateLimitError) {
            // Silently continue polling for rate limit errors - loading animation is already showing
            // The interval will retry automatically
            return
          }
          
          // For other errors, stop polling and show error
          console.error('Error polling job:', pollError)
          if (jobPollingRef.current) {
            clearInterval(jobPollingRef.current)
            jobPollingRef.current = null
          }
          setIsGeneratingFindings(false)
          setJobProgress('')
          alert(errorMessage || 'Failed to get analysis results')
        }
      }
      
      // Start polling every 8 seconds (increased from 4s to reduce 429 rate limit errors)
      jobPollingRef.current = setInterval(pollJob, 8000)
      // Also poll immediately
      pollJob()
      
    } catch (error) {
      console.error('Error generating findings:', error)
      setIsGeneratingFindings(false)
      setJobProgress('')
      alert(error instanceof Error ? error.message : 'Failed to generate AI findings. Please try again.')
    }
  }

  const handleContinue = () => {
    // Navigate to the next step (Team Builder)
    // Note: Don't include /app prefix since Router basename already adds it
    navigate('/proposal-team', { 
      state: { 
        contractName, 
        contractId,
        contractAgency: state?.contractAgency,
        contractCategory: state?.contractCategory,
        aiFindings 
      } 
    })
  }

  // Handle go back - show discard popup if there's unsaved work
  const handleGoBack = () => {
    if (pdfFile || aiFindings) {
      setShowDiscardPopup(true)
    } else {
      navigate(-1)
    }
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

  return (
    <div className="h-screen bg-corama-dark flex flex-col overflow-hidden">
      {/* Error Popup for invalid file type */}
      <ErrorPopup
        isOpen={showErrorPopup}
        message={errorMessage}
        onClose={() => setShowErrorPopup(false)}
      />

      {/* Discard Changes Popup */}
      <DiscardChangesPopup
        isOpen={showDiscardPopup}
        onStayHere={handleStayHere}
        onDiscard={handleDiscard}
      />
      
      {/* Header spans full width at top */}
      <Header key={headerKey} />
      
      {/* Sidebar + Content row below header */}
      <div className="flex flex-1 overflow-hidden">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
        
        <Sidebar 
          onGoBack={handleGoBack}
          onBeforeNavigate={(to) => {
            // Define workflow pages that should NOT show the discard popup
            const workflowPages = ['/ai-assistant', '/team-builder', '/proposal-summary', '/proposal-generator', '/contract-analysis', '/proposal-team', '/public-bid-proposal-generator']
            const isLeavingWorkflow = !workflowPages.some(page => to.startsWith(page))
            
            // If user is leaving the workflow and has unsaved work, show popup
            if (isLeavingWorkflow && (pdfFile || aiFindings)) {
              setPendingNavigation(to)
              setShowDiscardPopup(true)
              return false
            }
            return true
          }}
        />
      
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-hidden flex flex-col">
            {/* Page Title */}
            <div className="text-center mb-3 flex-shrink-0 animate-fade-in">
              <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl mb-3">Contract Analysis</h1>
              
                            {/* Progress Circles - All empty until step is complete, then show check with animation */}
                            <div className="flex justify-center gap-4 mb-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="relative">
                    {step === 1 && step1Complete ? (
                      // Step 1 complete - show Lottie check animation
                      <div className="relative">
                        <div className={`absolute inset-0 rounded-full bg-corama-teal/50 blur-md ${
                          showFirstCheckAnimation ? 'animate-ping' : ''
                        }`} />
                        <div className="w-14 h-14 relative z-10">
                          <Lottie 
                            animationData={checkAnimation} 
                            loop={false}
                            autoplay={true}
                          />
                        </div>
                      </div>
                    ) : (
                      // All other steps show empty check (no numbers)
                      <img src={EmptyCheckSvg} alt={`Step ${step}`} className="w-14 h-14" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content - Two Cards Side by Side - Fixed height with scrollable content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 mb-3 animate-fade-in-up animate-delay-100">
              {/* Left Card - Upload PDF / View Contract */}
              <div className="bg-white rounded-2xl p-4 flex flex-col min-h-0 overflow-hidden">
                <h2 className="text-gray-800 font-poppins font-semibold text-lg mb-1 flex-shrink-0">Upload PDF</h2>
                <p className="text-gray-600 font-poppins text-sm mb-3 flex-shrink-0">Contract Document</p>
                
                {pdfUrl ? (
                  <div className="flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden">
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                      <Viewer
                        fileUrl={pdfUrl}
                        plugins={[
                          highlightPluginInstance,
                          pageNavigationPluginInstance,
                        ]}
                      />
                    </Worker>
                  </div>
                ) : (
                  <div 
                    className="flex-1 min-h-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-corama-teal transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <div className="w-full flex items-center justify-center cursor-pointer mb-3" onClick={handleUploadClick}>
                      <img src={UploadContractPDFIcon} alt="Upload Contract" className="h-24 sm:h-32 lg:h-40" />
                    </div>
                    <p className="text-gray-500 font-poppins text-sm">Click or drag to upload PDF</p>
                    {state?.contractDetailLink && (
                      <p className="text-gray-500 font-poppins text-sm mt-2">
                        Missing the file?{' '}
                        <a href={state.contractDetailLink} onClick={(e) => handleExternalLink(state.contractDetailLink, e)} target="_blank" rel="noopener noreferrer" className="text-corama-teal underline">
                          Download the Contract here
                        </a>
                      </p>
                    )}
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {pdfFile && (
                  <p className="mt-2 text-gray-600 font-poppins text-sm flex-shrink-0">
                    Uploaded: {pdfFile.name}
                  </p>
                )}
              </div>

              {/* Right Card - AI Findings */}
              <div className="bg-white rounded-2xl p-4 flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h2 className="text-gray-800 font-poppins font-semibold text-lg">Contract Insights</h2>
                  {annotatedPdfUrl && (
                    <a
                      href={annotatedPdfUrl}
                      download="annotated_contract.pdf"
                      className="px-3 py-1 rounded-full font-poppins text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#6bb4b5' }}
                    >
                      Download Annotated PDF
                    </a>
                  )}
                </div>
                
                {aiFindings ? (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {/* Markdown Summary */}
                    <div className="font-poppins text-sm text-gray-700 mb-4">
                      <ReactMarkdown
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="ml-2">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                        }}
                      >
                        {aiFindings}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Findings as paragraphs with hyperlinks to PDF locations */}
                    {/* Filter out Strategic Recommendations and Risk Assessment since they're suggestions, not contract content */}
                    {structuredFindings.filter(f => 
                      !f.type.toLowerCase().includes('strategic') && 
                      !f.type.toLowerCase().includes('recommendation') && 
                      !f.type.toLowerCase().includes('risk assessment')
                    ).length > 0 && (
                      <div className="space-y-4 border-t border-gray-200 pt-4">
                        <p className="text-xs text-gray-500 font-poppins font-semibold uppercase tracking-wide">Source References</p>
                        {structuredFindings
                          .filter(f => 
                            !f.type.toLowerCase().includes('strategic') && 
                            !f.type.toLowerCase().includes('recommendation') && 
                            !f.type.toLowerCase().includes('risk assessment')
                          )
                          .map((finding) => {
                          const coord = manifest[finding.id]
                          const hasLocation = coord && !coord.not_found && coord.width > 0
                          return (
                            <div key={finding.id} className="font-poppins">
                              <p className="text-sm font-semibold text-gray-800 mb-1">{finding.title}</p>
                              <p className="text-sm text-gray-600 mb-1">{finding.rationale}</p>
                              {hasLocation && (
                                <button
                                  onClick={() => handleFindingClick(finding.id)}
                                  className={`text-sm font-medium transition-colors ${
                                    activeFindingId === finding.id
                                      ? 'text-yellow-600 underline'
                                      : 'text-corama-teal hover:text-corama-teal/80 hover:underline'
                                  }`}
                                >
                                  View in PDF (Page {coord.page + 1}) →
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                                ): isGeneratingFindings ? (
                                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                                    <InlineLoading text={jobProgress || 'Processing'} size="large" />
                                  </div>
                                ) : (
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                    <img src={AIFindingsIcon} alt="Contract Insights" className="h-32 sm:h-48 lg:h-[356px] mb-3" />
                    <p className="text-gray-500 font-poppins text-sm">Upload a PDF to generate insights</p>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button - Centered horizontally */}
            <div className="flex-shrink-0 flex justify-center">
              <button
                onClick={handleContinue}
                disabled={!aiFindings}
                className="relative flex items-center justify-center rounded-full font-poppins text-base font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity overflow-hidden"
                style={{ backgroundColor: '#6BA4A7', color: 'white', width: '414px', height: '48px' }}
              >
                <span className="text-center">Continue</span>
                <img src={ContinueIcon} alt="" className="absolute right-0 top-0 h-full" />
              </button>
            </div>
          {/* Third-Party Provider Confirmation Popup */}
          {showThirdPartyPopup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowThirdPartyPopup(false)} />
              <div className="relative rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none w-full sm:w-auto mx-4 border border-white/20 animate-popup-pop" style={{ backgroundColor: 'rgb(11, 44, 72)', minHeight: '200px' }}>
                <button className="absolute top-4 right-4 hover:opacity-80 transition-opacity" onClick={() => setShowThirdPartyPopup(false)}>
                  <img src="/static/app/proposal-summary/ClosePopupButton.svg" alt="Close" className="w-6 h-6" />
                </button>
                <div className="flex-shrink-0">
                  <img src="/static/app/proposal-summary/WarnIcon.svg" alt="Warning" className="w-16 h-16 sm:w-20 sm:h-20" />
                </div>
                <div className="flex flex-col gap-4 text-center sm:text-left">
                  <div>
                    <h3 className="text-white font-poppins font-bold text-lg sm:text-xl mb-1">Third-Party Contract</h3>
                    <p className="text-gray-300 font-poppins text-xs sm:text-sm">This contract is managed by a third-party provider. You will need to create an account on their site, where additional service fees may apply.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => { if (thirdPartyTarget) window.open(thirdPartyTarget, '_blank'); setShowThirdPartyPopup(false) }} className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'rgb(92, 191, 192)' }}>
                      Continue to Provider
                    </button>
                    <button onClick={() => setShowThirdPartyPopup(false)} className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'rgb(39, 69, 110)' }}>
                      Select Another Contract
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default ContractAnalysis

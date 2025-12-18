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

// Types for structured findings
interface FindingCoordinate {
  page: number
  left: number
  top: number
  width: number
  height: number
  not_found?: boolean
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
}

const ContractAnalysis = () => {
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
  const [annotatedPdfUrl, setAnnotatedPdfUrl] = useState<string | null>(null)
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null)
  
  // Animation state for first checkmark - triggers when AI findings load
  const [showFirstCheckAnimation, setShowFirstCheckAnimation] = useState(false)
  const firstAnimationShown = useRef(false)

  // Track if step 1 is complete (findings generated)
  const step1Complete = !!aiFindings
  
  // PDF viewer plugins
  const pageNavigationPluginInstance = pageNavigationPlugin()
  const { jumpToPage } = pageNavigationPluginInstance
  
  // Render highlights function for the highlight plugin
  const renderHighlights = useCallback((props: RenderHighlightsProps) => {
    const pageHighlights = Object.entries(manifest)
      .filter(([_, coord]) => coord.page === props.pageIndex && !coord.not_found && coord.width > 0)
    
    return (
      <div>
        {pageHighlights.map(([findingId, coord]) => (
          <div
            key={findingId}
            data-finding-id={findingId}
            className={`absolute transition-all duration-300 ${
              activeFindingId === findingId 
                ? 'bg-yellow-400/60 ring-2 ring-yellow-500' 
                : 'bg-yellow-300/40 hover:bg-yellow-400/50'
            }`}
            style={props.getCssProperties({
              pageIndex: coord.page,
              left: coord.left,
              top: coord.top,
              width: coord.width,
              height: coord.height,
            }, props.rotation)}
          />
        ))}
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
    } else {
      alert('Please select a PDF file')
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
      alert('Please drop a PDF file')
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleGenerateFindings = async () => {
    if (!pdfFile) {
      alert('Please upload a contract PDF first')
      return
    }

    setIsGeneratingFindings(true)
    try {
      // Call backend API to analyze the PDF
      const formData = new FormData()
      formData.append('file', pdfFile)
      formData.append('contractName', contractName)
      
      const response = await api.generateContractAnalysis(formData)
      
      if (response.success && response.findings) {
        setAiFindings(response.findings)
        
        // Store structured findings and manifest for click-to-navigate
        if (response.structured_findings) {
          setStructuredFindings(response.structured_findings)
        }
        if (response.manifest) {
          setManifest(response.manifest)
        }
        if (response.annotated_pdf_url) {
          setAnnotatedPdfUrl(response.annotated_pdf_url)
        }
        
        // Force Header to refresh credits
        setHeaderKey(k => k + 1)
      } else {
        alert(response.error || 'Failed to generate AI findings. Please try again.')
      }
    } catch (error) {
      console.error('Error generating findings:', error)
      alert('Failed to generate AI findings. Please try again.')
    } finally {
      setIsGeneratingFindings(false)
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

  return (
    <div className="h-screen bg-corama-dark flex flex-col overflow-hidden">
      {/* Header spans full width at top */}
      <Header key={headerKey} credits={5} />
      
      {/* Sidebar + Content row below header */}
      <div className="flex flex-1 overflow-hidden">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        
        <Sidebar />
      
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-hidden flex flex-col">
            {/* Page Title */}
            <div className="text-center mb-3 flex-shrink-0">
              <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl mb-3">Contract Analysis</h1>
              
              {/* Progress Circles - All empty until step is complete, then show check with animation */}
              <div className="flex justify-center gap-4">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 mb-3">
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
                    className="flex-1 min-h-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-corama-teal transition-colors"
                    onClick={handleUploadClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <img src={UploadContractPDFIcon} alt="Upload Contract" style={{ height: '308px' }} className="mb-3" />
                    <p className="text-gray-500 font-poppins text-sm">Click or drag to upload PDF</p>
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
                    {/* Clickable Structured Findings */}
                    {structuredFindings.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <p className="text-xs text-gray-500 font-poppins mb-2">Click a finding to navigate to its location in the PDF:</p>
                        {structuredFindings.map((finding) => {
                          const coord = manifest[finding.id]
                          const hasLocation = coord && !coord.not_found && coord.width > 0
                          return (
                            <button
                              key={finding.id}
                              onClick={() => hasLocation && handleFindingClick(finding.id)}
                              disabled={!hasLocation}
                              className={`w-full text-left p-2 rounded-lg border transition-all ${
                                activeFindingId === finding.id
                                  ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300'
                                  : hasLocation
                                    ? 'border-gray-200 hover:border-corama-teal hover:bg-gray-50 cursor-pointer'
                                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                                  finding.type === 'risk' ? 'bg-red-100 text-red-700' :
                                  finding.type === 'deadline' ? 'bg-orange-100 text-orange-700' :
                                  finding.type === 'requirement' ? 'bg-blue-100 text-blue-700' :
                                  finding.type === 'compliance' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {finding.type}
                                </span>
                                {hasLocation && (
                                  <span className="text-xs text-gray-400">Page {coord.page + 1}</span>
                                )}
                              </div>
                              <p className="font-poppins text-sm font-medium text-gray-800 mt-1">{finding.title}</p>
                              {finding.quote && (
                                <p className="font-poppins text-xs text-gray-500 mt-1 italic line-clamp-2">"{finding.quote}"</p>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    
                    {/* Markdown Summary */}
                    <div className="font-poppins text-sm text-gray-700">
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
                  </div>
                ) : isGeneratingFindings ? (
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                    <InlineLoading text="Generating" size="large" />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                    <img src={AIFindingsIcon} alt="Contract Insights" style={{ height: '356px' }} className="mb-3" />
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
                className="relative flex items-center justify-between px-8 py-3 rounded-full font-poppins text-base font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity min-w-[200px]"
                style={{ backgroundColor: '#99C8CA', color: '#1a2744' }}
              >
                <span className="flex-1 text-center">Continue</span>
                <img src={ContinueIcon} alt="" className="h-full absolute right-3 top-1/2 -translate-y-1/2" style={{ height: 'calc(100% - 8px)' }} />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ContractAnalysis

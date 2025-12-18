import { useState, useRef, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Lottie from 'lottie-react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { InlineLoading } from '../components/ThinkingPopup'
import checkAnimation from '../assets/CheckAnimation.json'
import EmptyCheckSvg from '../assets/EmptyCheck.svg'
import { api } from '../services/api'

// SVG asset paths
const UploadContractPDFIcon = '/static/app/contract-analysis/UploadContractPDF.svg'
const AIFindingsIcon = '/static/app/contract-analysis/AIFindings.svg'
const ContinueIcon = '/static/app/contract-analysis/Continue.svg'

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
  
  // Animation state for first checkmark - triggers when AI findings load
  const [showFirstCheckAnimation, setShowFirstCheckAnimation] = useState(false)
  const firstAnimationShown = useRef(false)

  // Track if step 1 is complete (findings generated)
  const step1Complete = !!aiFindings
  
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
  const autoGenerateTriggered = useRef(false)
  useEffect(() => {
    if (pdfFile && !aiFindings && !isGeneratingFindings && !autoGenerateTriggered.current) {
      autoGenerateTriggered.current = true
      handleGenerateFindings()
    }
  }, [pdfFile])

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
                    <iframe 
                      src={pdfUrl} 
                      className="w-full h-full"
                      title="Contract PDF"
                    />
                  </div>
                ) : (
                  <div 
                    className="flex-1 min-h-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-corama-teal transition-colors"
                    onClick={handleUploadClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <img src={UploadContractPDFIcon} alt="Upload Contract" className="w-48 h-36 mb-3" />
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
                <h2 className="text-gray-800 font-poppins font-semibold text-lg mb-3 flex-shrink-0">AI Findings</h2>
                
                {aiFindings ? (
                  <div className="flex-1 min-h-0 overflow-y-auto">
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
                    <img src={AIFindingsIcon} alt="AI Findings" className="w-40 h-52 mb-3" />
                    <button
                      onClick={handleGenerateFindings}
                      disabled={isGeneratingFindings || !pdfFile}
                      className="px-6 py-2 rounded-full font-poppins text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: '#6bb4b5' }}
                    >
                      Generate AI Findings
                    </button>
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

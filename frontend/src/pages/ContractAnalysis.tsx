import { useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { ChevronRight } from 'lucide-react'
import { api } from '../services/api'

// SVG asset paths
const UploadContractPDFIcon = '/static/app/contract-analysis/UploadContractPDF.svg'
const AIFindingsIcon = '/static/app/contract-analysis/AIFindings.svg'
const EmptyCheckIcon = '/static/app/contract-analysis/EmptyCheck.svg'

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
  const contractId = state?.contractId || ''
  
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [aiFindings, setAiFindings] = useState<string | null>(null)
  const [isGeneratingFindings, setIsGeneratingFindings] = useState(false)
  const [headerKey, setHeaderKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Current step in the guided process (1 = Contract Analysis, 2 = Team, 3 = Pricing)
  const [currentStep] = useState(1)

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
    <div className="min-h-screen bg-corama-dark">
      {/* Header spans full width at top */}
      <Header key={headerKey} credits={5} />
      
      {/* Sidebar + Content row below header */}
      <div className="flex">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        
        <Sidebar />
      
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden flex flex-col">
            {/* Page Title */}
            <div className="text-center mb-6">
              <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl mb-4">Contract Analysis</h1>
              
              {/* Progress Circles */}
              <div className="flex justify-center gap-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="relative">
                    {currentStep === step ? (
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

            {/* Main Content - Two Cards Side by Side - Larger cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 mb-6">
              {/* Left Card - Upload PDF / View Contract */}
              <div className="bg-white rounded-2xl p-6 flex flex-col min-h-[500px]">
                <h2 className="text-gray-800 font-poppins font-semibold text-lg mb-1">Upload PDF</h2>
                <p className="text-gray-600 font-poppins text-sm mb-4">Contract Document</p>
                
                {pdfUrl ? (
                  <div className="flex-1 min-h-[400px] border border-gray-200 rounded-lg overflow-hidden">
                    <iframe 
                      src={pdfUrl} 
                      className="w-full h-full"
                      title="Contract PDF"
                    />
                  </div>
                ) : (
                  <div 
                    className="flex-1 min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-corama-teal transition-colors"
                    onClick={handleUploadClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <img src={UploadContractPDFIcon} alt="Upload Contract" className="w-80 h-60 mb-4" />
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
                  <p className="mt-3 text-gray-600 font-poppins text-sm">
                    Uploaded: {pdfFile.name}
                  </p>
                )}
              </div>

              {/* Right Card - AI Findings */}
              <div className="bg-white rounded-2xl p-6 flex flex-col min-h-[500px]">
                <h2 className="text-gray-800 font-poppins font-semibold text-lg mb-4">AI Findings</h2>
                
                {aiFindings ? (
                  <div className="flex-1 min-h-[400px] overflow-y-auto">
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
                ) : (
                  <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center">
                    <img src={AIFindingsIcon} alt="AI Findings" className="w-64 h-80 mb-4" />
                    <button
                      onClick={handleGenerateFindings}
                      disabled={isGeneratingFindings || !pdfFile}
                      className="px-6 py-2 rounded-full font-poppins text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: '#6bb4b5' }}
                    >
                      {isGeneratingFindings ? 'Generating...' : 'Generate AI Findings'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button - At bottom of page */}
            <div className="mt-auto pt-6 flex justify-end">
              <button
                onClick={handleContinue}
                disabled={!aiFindings}
                className="flex items-center gap-2 px-8 py-3 rounded-full font-poppins text-base font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#6bb4b5' }}
              >
                Continue
                <ChevronRight size={20} />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ContractAnalysis

import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { Check } from 'lucide-react'
import { api, CapabilityStatementData } from '../services/api'

interface ImportResult {
  success: boolean
  error?: string
  data?: CapabilityStatementData
}

interface ColorPreset {
  primary: string
  secondary: string
  bgClass: string
}

// Industry Focus dropdown options
const INDUSTRY_OPTIONS = [
  'Information Technology Services',
  'Construction & Engineering',
  'Professional Services',
  'Healthcare Services',
  'Logistics & Transportation',
  'Manufacturing',
  'Management Consulting',
  'Research & Development',
]

const CapabilityBuilder = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const imagesInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    contactName: '',
    title: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    industryFocus: '',
    coreCompetencies: '',
    keyDifferentiators: '',
    companyDescription: '',
    ueiCode: '',
    cageCode: '',
    naicsCodes: '',
    certifications: '',
    clientAgency: '',
    contractValue: '',
    projectDescription: '',
    primaryColor: '#FF0000',
    secondaryColor: '#FFFF00',
  })

  const [importUrl, setImportUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [imagesFile, setImagesFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  // Compute step completion based on form data
  const section1HasData = !!(
    formData.companyName ||
    formData.website ||
    formData.contactName ||
    formData.title ||
    formData.phone ||
    formData.email ||
    formData.address ||
    formData.city ||
    formData.state ||
    formData.zipCode
  )

  const section2HasData = !!(
    formData.industryFocus ||
    formData.coreCompetencies ||
    formData.keyDifferentiators ||
    formData.companyDescription
  )

  const section3HasData = !!(
    formData.ueiCode ||
    formData.cageCode ||
    formData.naicsCodes ||
    formData.certifications ||
    formData.clientAgency ||
    formData.contractValue ||
    formData.projectDescription
  )

  const stepsCompleted = [section1HasData, section2HasData, section3HasData]
  const [isDragOver, setIsDragOver] = useState(false)
  const [importingUrl, setImportingUrl] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const colorPresets: ColorPreset[] = [
    { primary: '#22C55E', secondary: '#86EFAC', bgClass: 'bg-green-500' },
    { primary: '#EC4899', secondary: '#F9A8D4', bgClass: 'bg-pink-500' },
    { primary: '#F97316', secondary: '#FDBA74', bgClass: 'bg-orange-500' },
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleColorPresetClick = (preset: ColorPreset) => {
    setFormData(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
    }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadError('')
    }
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
    }
  }

  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImagesFile(file)
    }
  }

  // Helper function to convert array to newline-separated string
  const arrayToString = (arr?: string[]): string => {
    if (!arr || arr.length === 0) return ''
    return arr.join('\n')
  }

  // Helper function to map imported data to form fields
  const mapImportedDataToForm = (data: CapabilityStatementData) => {
    setFormData(prev => ({
      ...prev,
      companyName: data.companyName || prev.companyName,
      website: data.website || prev.website,
      contactName: data.contactName || prev.contactName,
      title: data.contactTitle || prev.title,
      phone: data.phone || prev.phone,
      email: data.email || prev.email,
      address: data.address || prev.address,
      city: data.city || prev.city,
      state: data.state || prev.state,
      zipCode: data.zipCode || prev.zipCode,
      companyDescription: data.companyDescription || prev.companyDescription,
      industryFocus: data.industryFocus || prev.industryFocus,
      ueiCode: data.ueiCode || prev.ueiCode,
      cageCode: data.cageCode || prev.cageCode,
      coreCompetencies: arrayToString(data.competencies) || prev.coreCompetencies,
      keyDifferentiators: arrayToString(data.differentiators) || prev.keyDifferentiators,
      naicsCodes: arrayToString(data.naicsCodes) || prev.naicsCodes,
      certifications: arrayToString(data.certifications) || prev.certifications,
    }))
  }

  const handleImportFile = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      const result: ImportResult = await api.importCapabilityFromFile(selectedFile)
      console.log('[CS Import File] Full result:', result)
      console.log('[CS Import File] Data fields:', result.data ? Object.keys(result.data) : 'no data')
      console.log('[CS Import File] Data values:', result.data)
      if (result.success && result.data) {
        mapImportedDataToForm(result.data)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setUploadError(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('[CS Import File] Error:', error)
      setUploadError('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setUploadError('Please enter a URL')
      return
    }

    setImportingUrl(true)
    setUploadError('')

    try {
      const result: ImportResult = await api.importCapabilityFromUrl(importUrl)
      console.log('[CS Import URL] Full result:', result)
      console.log('[CS Import URL] Data fields:', result.data ? Object.keys(result.data) : 'no data')
      console.log('[CS Import URL] Data values:', result.data)
      if (result.success && result.data) {
        mapImportedDataToForm(result.data)
        setImportUrl('')
      } else {
        setUploadError(result.error || 'URL import failed')
      }
    } catch (error) {
      console.error('[CS Import URL] Error:', error)
      setUploadError('Failed to import from URL. Please try again.')
    } finally {
      setImportingUrl(false)
    }
  }

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setUploadError('')
    } else {
      setUploadError('Please drop a PDF file')
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  // Helper function to convert newline-separated string to array
  const stringToArray = (str: string): string[] => {
    if (!str || str.trim() === '') return []
    return str.split('\n').map(s => s.trim()).filter(s => s.length > 0)
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true)
    try {
      // Build FormData for /generate-enhanced-pdf endpoint
      const pdfFormData = new FormData()
      
      // Scalar fields
      pdfFormData.append('companyName', formData.companyName || '')
      pdfFormData.append('ueiCode', formData.ueiCode || '')
      pdfFormData.append('cageCode', formData.cageCode || '')
      pdfFormData.append('contactName', formData.contactName || '')
      pdfFormData.append('contactTitle', formData.title || '')
      pdfFormData.append('phone', formData.phone || '')
      pdfFormData.append('email', formData.email || '')
      pdfFormData.append('address', formData.address || '')
      pdfFormData.append('city', formData.city || '')
      pdfFormData.append('state', formData.state || '')
      pdfFormData.append('zipCode', formData.zipCode || '')
      pdfFormData.append('website', formData.website || '')
      pdfFormData.append('companyDescription', formData.companyDescription || '')
      pdfFormData.append('primaryColor', formData.primaryColor || '#2E4C8B')
      pdfFormData.append('secondaryColor', formData.secondaryColor || '#A8D5E2')
      
      // Array fields as JSON strings
      pdfFormData.append('competencies', JSON.stringify(stringToArray(formData.coreCompetencies)))
      pdfFormData.append('differentiators', JSON.stringify(stringToArray(formData.keyDifferentiators)))
      pdfFormData.append('naicsCodes', JSON.stringify(stringToArray(formData.naicsCodes)))
      pdfFormData.append('certifications', JSON.stringify(stringToArray(formData.certifications)))
      
      // File uploads (if available)
      if (logoFile) {
        pdfFormData.append('logoFile', logoFile)
      }
      if (imagesFile) {
        pdfFormData.append('imageFile', imagesFile)
      }
      
      // Make request to /generate-enhanced-pdf endpoint
      // Note: Do NOT set Content-Type header - browser will set it with boundary for multipart/form-data
      const response = await fetch('/generate-enhanced-pdf', {
        method: 'POST',
        body: pdfFormData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'PDF generation failed')
      }
      
      // Handle binary PDF response
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${formData.companyName || 'Company'}_Capability_Statement.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleAiAssistant = () => {
    navigate('/dashboard')
  }

  const handleSave = () => {
    sessionStorage.setItem('capabilityBuilderData', JSON.stringify(formData))
    alert('Form data saved!')
  }

  const handleReset = () => {
    setFormData({
      companyName: '',
      website: '',
      contactName: '',
      title: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      industryFocus: '',
      coreCompetencies: '',
      keyDifferentiators: '',
      companyDescription: '',
      ueiCode: '',
      cageCode: '',
      naicsCodes: '',
      certifications: '',
      clientAgency: '',
      contractValue: '',
      projectDescription: '',
      primaryColor: '#FF0000',
      secondaryColor: '#FFFF00',
    })
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all form data?')) {
      handleReset()
      sessionStorage.removeItem('capabilityBuilderData')
    }
  }

  return (
    <div className="flex min-h-screen bg-corama-dark">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header credits={5} />
        
                <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
                  {/* Sticky Page Title and Steps */}
                  <div className="sticky top-0 z-20 bg-corama-dark pb-3 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 pt-2">
                    <div className="text-center mb-3 lg:mb-4">
                      <h1 className="text-white font-poppins font-bold text-xl sm:text-2xl mb-3 sm:mb-4">Capability Builder</h1>
                      <div className="flex justify-center gap-3 sm:gap-4">
                        {stepsCompleted.map((completed, index) => (
                          <div
                            key={index}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                              completed 
                                ? 'bg-corama-teal text-white scale-100 shadow-[0_0_12px_rgba(45,212,191,0.6)]' 
                                : 'bg-corama-darker border border-corama-teal/30 text-corama-teal scale-90'
                            }`}
                          >
                            {completed && <Check size={16} className="text-white sm:w-5 sm:h-5" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

          {/* Import Existing Capability Statement */}
          <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6 mb-4 lg:mb-6">
            <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-4 sm:mb-5">Import Existing Capability Statement</h2>
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start lg:items-center">
              {/* Upload File Section */}
              <div className="flex items-center gap-4">
                <span className="text-white font-poppins text-sm whitespace-nowrap">Upload File</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-6 cursor-pointer transition-all min-w-[280px] ${
                    isDragOver ? 'ring-2 ring-corama-teal' : ''
                  }`}
                >
                  <span className="text-gray-500 font-poppins text-sm">
                    {selectedFile ? selectedFile.name : 'Click here to browse your pdf file'}
                  </span>
                </div>
                {selectedFile && (
                  <button
                    onClick={handleImportFile}
                    disabled={uploading}
                    className="bg-corama-teal text-white rounded-lg py-2 px-4 text-sm hover:bg-corama-teal/80 transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Importing...' : 'Import'}
                  </button>
                )}
              </div>

              {/* Or Import from URL Section */}
              <div className="flex items-center gap-4 flex-1">
                <span className="text-white font-poppins text-sm whitespace-nowrap">Or Import from URL</span>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://example/capabilitystate..."
                    className="flex-1 bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-4 text-gray-900 text-sm focus:outline-none focus:border-[#1C4262]"
                  />
                  <button
                    onClick={handleImportFromUrl}
                    disabled={importingUrl || !importUrl.trim()}
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#6B9B9B' }}
                  >
                    {importingUrl ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <img src="/static/app/dashboard/ImportURL.svg" alt="" className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            {uploadError && (
              <p className="text-red-400 text-sm mt-3">{uploadError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4 lg:space-y-6">
              {/* Company Information */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Company Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Website</label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Contact Name</label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Zip Code</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Company Details */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Company Details</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Industry Focus</label>
                    <select
                      value={formData.industryFocus}
                      onChange={(e) => handleInputChange('industryFocus', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                    >
                      <option value="" className="bg-corama-darker text-gray-400">Select Industry Focus</option>
                      {INDUSTRY_OPTIONS.map((option) => (
                        <option key={option} value={option} className="bg-corama-darker text-white">
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Core Competencies</label>
                    <input
                      type="text"
                      value={formData.coreCompetencies}
                      onChange={(e) => handleInputChange('coreCompetencies', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Key Differentiators</label>
                    <input
                      type="text"
                      value={formData.keyDifferentiators}
                      onChange={(e) => handleInputChange('keyDifferentiators', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Company Description</label>
                    <input
                      type="text"
                      value={formData.companyDescription}
                      onChange={(e) => handleInputChange('companyDescription', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Company Logo & Images */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Company Logo</h2>
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoSelect}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="bg-white border-2 border-[#1C4262] rounded-xl p-6 sm:p-8 lg:p-10 text-center mb-4 sm:mb-6 cursor-pointer hover:border-[#0f2d42] transition-colors"
                >
                  <img src="/static/app/dashboard/AddFile.svg" alt="" className="mx-auto mb-2 w-8 h-8 sm:w-9 sm:h-9" />
                  <p className="text-[#1C4262] font-poppins font-bold text-sm sm:text-base">
                    {logoFile ? logoFile.name : 'Add your file'}
                  </p>
                </div>
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Company Images</h2>
                <input
                  type="file"
                  ref={imagesInputRef}
                  onChange={handleImagesSelect}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onClick={() => imagesInputRef.current?.click()}
                  className="bg-white border-2 border-[#1C4262] rounded-xl p-6 sm:p-8 lg:p-10 text-center cursor-pointer hover:border-[#0f2d42] transition-colors"
                >
                  <img src="/static/app/dashboard/AddFile.svg" alt="" className="mx-auto mb-2 w-8 h-8 sm:w-9 sm:h-9" />
                  <p className="text-[#1C4262] font-poppins font-bold text-sm sm:text-base">
                    {imagesFile ? imagesFile.name : 'Add your file'}
                  </p>
                </div>
              </div>

              {/* Color Scheme */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Color Scheme</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Primary Color (Headers/Accents)</label>
                    <div className="flex gap-2">
                      <div className="w-24 h-10 rounded" style={{ backgroundColor: formData.primaryColor }}></div>
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        className="flex-1 bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Secondary Color (Sections/Backgrounds)</label>
                    <div className="flex gap-2">
                      <div className="w-24 h-10 rounded" style={{ backgroundColor: formData.secondaryColor }}></div>
                      <input
                        type="text"
                        value={formData.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                        className="flex-1 bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Quick Color Presets</label>
                    <div className="flex gap-2">
                      {colorPresets.map((preset, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleColorPresetClick(preset)}
                          className={`w-10 h-10 rounded ${preset.bgClass} hover:ring-2 hover:ring-white transition-all`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Government Codes & Certifications */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Government Codes & Certifications</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">UEI Code</label>
                    <input
                      type="text"
                      value={formData.ueiCode}
                      onChange={(e) => handleInputChange('ueiCode', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">CAGE Code</label>
                    <input
                      type="text"
                      value={formData.cageCode}
                      onChange={(e) => handleInputChange('cageCode', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">NAICS Codes</label>
                    <input
                      type="text"
                      value={formData.naicsCodes}
                      onChange={(e) => handleInputChange('naicsCodes', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Certifications</label>
                    <input
                      type="text"
                      value={formData.certifications}
                      onChange={(e) => handleInputChange('certifications', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Past Performance */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Past Performance</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Client/Agency</label>
                    <input
                      type="text"
                      value={formData.clientAgency}
                      onChange={(e) => handleInputChange('clientAgency', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">Contract Value</label>
                    <input
                      type="text"
                      value={formData.contractValue}
                      onChange={(e) => handleInputChange('contractValue', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-white font-poppins text-sm mb-1 block">Project Description</label>
                  <input
                    type="text"
                    value={formData.projectDescription}
                    onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                    className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Preview & Actions */}
            <div className="space-y-4 lg:space-y-6">
              {/* Preview Area with Toolbar */}
              <div className="rounded-xl border-2 border-[#1C4262] overflow-hidden">
                {/* Toolbar Header */}
                <div className="bg-[#2A3F54] flex justify-around items-center px-4 py-3 rounded-t-lg">
                  <button 
                    onClick={handleSave}
                    className="hover:opacity-80 transition-opacity"
                    title="Save"
                  >
                    <img src="/static/app/dashboard/SaveIcon.svg" alt="Save" className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                  <button 
                    onClick={handleReset}
                    className="hover:opacity-80 transition-opacity"
                    title="Reload"
                  >
                    <img src="/static/app/dashboard/Reload.svg" alt="Reload" className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                  <button 
                    onClick={handleClear}
                    className="hover:opacity-80 transition-opacity"
                    title="Load"
                  >
                    <img src="/static/app/dashboard/Load.svg" alt="Load" className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                </div>
                
                {/* Preview Content Area */}
                <div className="bg-white min-h-48 sm:min-h-64 lg:min-h-96 p-4 overflow-auto">
                  {formData.companyName || formData.coreCompetencies || formData.companyDescription ? (
                    <div className="text-sm text-gray-800 space-y-4">
                      {formData.companyName && (
                        <div className="text-center">
                          <h2 className="text-xl font-bold text-[#1C4262]">{formData.companyName}</h2>
                          {formData.website && <p className="text-gray-600 text-xs">{formData.website}</p>}
                        </div>
                      )}
                      {(formData.contactName || formData.phone || formData.email) && (
                        <div className="text-center text-xs text-gray-600">
                          {formData.contactName && <span>{formData.contactName}</span>}
                          {formData.title && <span> - {formData.title}</span>}
                          {formData.phone && <span> | {formData.phone}</span>}
                          {formData.email && <span> | {formData.email}</span>}
                        </div>
                      )}
                      {(formData.address || formData.city || formData.state) && (
                        <div className="text-center text-xs text-gray-600">
                          {formData.address && <span>{formData.address}, </span>}
                          {formData.city && <span>{formData.city}, </span>}
                          {formData.state && <span>{formData.state} </span>}
                          {formData.zipCode && <span>{formData.zipCode}</span>}
                        </div>
                      )}
                      {formData.coreCompetencies && (
                        <div>
                          <h3 className="font-bold text-[#1C4262] text-sm mb-1">Core Competencies</h3>
                          <p className="text-xs">{formData.coreCompetencies}</p>
                        </div>
                      )}
                      {formData.companyDescription && (
                        <div>
                          <h3 className="font-bold text-[#1C4262] text-sm mb-1">About Us</h3>
                          <p className="text-xs">{formData.companyDescription}</p>
                        </div>
                      )}
                      {formData.keyDifferentiators && (
                        <div>
                          <h3 className="font-bold text-[#1C4262] text-sm mb-1">Differentiators</h3>
                          <p className="text-xs">{formData.keyDifferentiators}</p>
                        </div>
                      )}
                      {(formData.naicsCodes || formData.certifications) && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {formData.naicsCodes && (
                            <div>
                              <span className="font-bold text-[#1C4262]">NAICS:</span> {formData.naicsCodes}
                            </div>
                          )}
                          {formData.certifications && (
                            <div>
                              <span className="font-bold text-[#1C4262]">Certifications:</span> {formData.certifications}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center text-sm sm:text-base pt-8">Preview will appear here</p>
                  )}
                </div>
              </div>

              {/* Generate PDF Button */}
              <button
                onClick={handleGeneratePdf}
                disabled={generatingPdf}
                className="w-full card-gradient rounded-xl p-3 sm:p-4 flex items-center justify-between hover:bg-corama-darker/80 transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="text-left">
                  <h3 className="text-white font-poppins font-bold text-sm sm:text-base">
                    {generatingPdf ? 'Generating...' : 'Generate PDF'}
                  </h3>
                  <p className="text-white font-poppins text-xs sm:text-sm">Create your Capability Statement</p>
                </div>
                {generatingPdf ? (
                  <div className="w-6 h-6 border-2 border-corama-teal border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <img src="/static/app/dashboard/GeneratePDF.svg" alt="" className="w-6 h-6 flex-shrink-0" />
                )}
              </button>

              {/* AI Assistant Button */}
              <button
                onClick={handleAiAssistant}
                className="w-full card-gradient rounded-xl p-3 sm:p-4 flex items-center justify-between hover:bg-corama-darker/80 transition-colors cursor-pointer"
              >
                <div className="text-left">
                  <h3 className="text-white font-poppins font-bold text-sm sm:text-base">AI Assistant</h3>
                  <p className="text-white font-poppins text-xs sm:text-sm">Use AI to enhance your content</p>
                </div>
                <img src="/static/app/dashboard/AIAssistant.svg" alt="" className="w-6 h-6 flex-shrink-0" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default CapabilityBuilder

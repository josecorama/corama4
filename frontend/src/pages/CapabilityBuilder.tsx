import { useState, useRef, useCallback, useEffect } from 'react'
import Lottie from 'lottie-react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ThinkingPopup from '../components/ThinkingPopup'
import checkAnimation from '../assets/CheckAnimation.json'
import EmptyCheckSvg from '../assets/EmptyCheck.svg'
import { api, CapabilityStatementData } from '../services/api'
import { useTranslation, t as tGlobal } from '../i18n'

// AI Assistant Popup Component
interface AIPopupProps {
  isOpen: boolean
  type: 'success' | 'error' | 'warning'
  title: string
  message: string
  onClose: () => void
}

const AIAssistantPopup = ({ isOpen, type, title, message, onClose }: AIPopupProps) => {
  if (!isOpen) return null

  const iconSrc = type === 'success' 
    ? '/static/app/dashboard/AIAssistant.svg'
    : '/static/app/proposal-summary/WarnIcon.svg'
  
  const buttonColor = type === 'success' ? 'rgb(92, 191, 192)' : 'rgb(39, 69, 110)'

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
            src={iconSrc} 
            alt={type} 
            className="w-16 h-16 sm:w-20 sm:h-20"
          />
        </div>
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-white font-poppins font-bold text-lg sm:text-xl mb-1">
              {title}
            </h3>
            <p className="text-gray-300 font-poppins text-xs sm:text-sm">
              {message}
            </p>
          </div>
          <div className="flex justify-center sm:justify-start">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: buttonColor }}
            >
              {tGlobal('okButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ImportResult{
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

// Helper functions for tag conversion (defined outside component for reuse)
const tagStringToArray = (str: string): string[] => {
  if (!str || str.trim() === '') return []
  return str.split('\n').map(s => s.trim()).filter(s => s.length > 0)
}

const tagArrayToString = (arr: string[]): string => {
  if (!arr || arr.length === 0) return ''
  return arr.join('\n')
}

// TagInput component for chip/tag-style inputs
interface TagInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const TagInput: React.FC<TagInputProps> = ({ label, value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('')
  
  const tags = tagStringToArray(value)
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (!trimmed) return
      // Avoid duplicates
      if (!tags.includes(trimmed)) {
        onChange(tagArrayToString([...tags, trimmed]))
      }
      setInputValue('')
    }
  }
  
  const handleRemove = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index)
    onChange(tagArrayToString(newTags))
  }
  
  return (
    <div className="space-y-2">
      <label className="text-white font-poppins text-sm block">{label}</label>
      
      {/* Input for new tags */}
      <input
        type="text"
        className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#1C4262]"
        placeholder={placeholder || 'Type and press Enter to add'}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      
      {/* Tags stacked vertically */}
      {tags.length > 0 && (
        <div className="space-y-2">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-full px-4 py-1 text-xs text-white"
              style={{
                background: '#6BB4B5',
              }}
            >
              <span className="truncate mr-2 font-poppins">{tag}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.92 5.76549C15.249 7.94749 14.937 9.8595 13.795 11.7445C12.236 13.6065 10.525 14.7535 8.05399 14.9885C5.72199 15.0365 3.97799 14.4025 2.28799 12.7935C0.811994 11.2635 0.075 9.49149 0 7.35549C0.031 6.43449 0.247005 5.61149 0.561005 4.74949C0.604005 4.62649 0.64701 4.50349 0.69101 4.37749C1.42501 2.62349 3.09399 1.18249 4.80399 0.426489C6.97699 -0.309511 9.11199 -0.0515023 11.171 0.882498C12.972 1.8035 14.441 3.84049 14.92 5.76549ZM9.04999 5.0015C8.55599 5.4955 8.061 5.99049 7.552 6.49949C7.058 6.00449 6.56299 5.51049 6.05399 5.00049C5.72399 5.33049 5.39499 5.65949 5.05499 5.99949C5.54999 6.49349 6.04399 6.98849 6.55399 7.49749C6.05999 7.99149 5.565 8.48649 5.056 8.99549C5.386 9.32449 5.71599 9.6545 6.05499 9.9945C6.54899 9.5005 7.04401 9.0055 7.55301 8.4965C8.04701 8.9915 8.54199 9.48549 9.05099 9.99549C9.38099 9.66549 9.70999 9.3365 10.05 8.9965C9.55499 8.5025 9.06099 8.0075 8.55099 7.4985C9.04499 7.0045 9.54001 6.50949 10.049 6.00049C9.71901 5.67149 9.38899 5.3415 9.04999 5.0015Z" fill="white"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const CapabilityBuilder = () => {
  const { t } = useTranslation()
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
    primaryColor: '#0B2C48',
    secondaryColor: '#6BA4A7',
  })

  const [importUrl, setImportUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [imagesFile, setImagesFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [enhancingContent, setEnhancingContent] = useState(false)
  
  // AI Assistant popup state
  const [aiPopup, setAiPopup] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  })
  
  const showAiPopup = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setAiPopup({ isOpen: true, type, title, message })
  }
  
  const closeAiPopup = () => {
    setAiPopup(prev => ({ ...prev, isOpen: false }))
  }
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
  
  // Allow PDF generation as long as at least one section has data
  const canGeneratePdf = section1HasData || section2HasData || section3HasData
  
    const [isDragOver, setIsDragOver] = useState(false)
    const [importingUrl, setImportingUrl] = useState(false)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [activeColorField, setActiveColorField] = useState<'primary' | 'secondary'>('primary')
    const [selectedHue, setSelectedHue] = useState(240) // Default blue hue
    const [gradientPos, setGradientPos] = useState({ x: 0.7, y: 0.3 }) // 0-1 normalized position
    const [opacity, setOpacity] = useState(1) // 0-1 opacity value
    const [isDraggingGradient, setIsDraggingGradient] = useState(false)
    const [isDraggingHue, setIsDraggingHue] = useState(false)
    const [isDraggingOpacity, setIsDraggingOpacity] = useState(false)
    
    const gradientRef = useRef<HTMLDivElement | null>(null)
    const hueRef = useRef<HTMLDivElement | null>(null)
    const opacityRef = useRef<HTMLDivElement | null>(null)

    const colorPresets: ColorPreset[] = [
      // Row 1: pink, purple, blue, cyan, teal, yellow, orange
      { primary: '#ee4688', secondary: '#f37daa', bgClass: '' },
      { primary: '#804fd5', secondary: '#a77de8', bgClass: '' },
      { primary: '#5976f2', secondary: '#8a9ef5', bgClass: '' },
      { primary: '#42bdac', secondary: '#7dd4c8', bgClass: '' },
      { primary: '#52c977', secondary: '#85da9a', bgClass: '' },
      { primary: '#f6bd31', secondary: '#f9d06a', bgClass: '' },
      { primary: '#f67b27', secondary: '#f9a165', bgClass: '' },
      // Row 2: green, lime, teal, purple, magenta, red, green
      { primary: '#89bb2d', secondary: '#acd066', bgClass: '' },
      { primary: '#408ecf', secondary: '#79b0de', bgClass: '' },
      { primary: '#00ba83', secondary: '#4dd0a8', bgClass: '' },
      { primary: '#a144d9', secondary: '#be7ae6', bgClass: '' },
      { primary: '#e232d4', secondary: '#eb6fe1', bgClass: '' },
      { primary: '#f3495f', secondary: '#f77d8d', bgClass: '' },
      { primary: '#ef4941', secondary: '#f47d77', bgClass: '' },
    ]

    // Helper function to update gradient color from mouse position
    const updateGradientFromEvent = (clientX: number, clientY: number) => {
      if (!gradientRef.current) return
      const rect = gradientRef.current.getBoundingClientRect()
      let x = (clientX - rect.left) / rect.width
      let y = (clientY - rect.top) / rect.height
      x = Math.min(1, Math.max(0, x))
      y = Math.min(1, Math.max(0, y))
      setGradientPos({ x, y })

      const saturation = Math.round(x * 100)
      const lightness = Math.round((1 - y) * 50) + 25
      const color = `hsl(${selectedHue}, ${saturation}%, ${lightness}%)`

      const tempDiv = document.createElement('div')
      tempDiv.style.color = color
      document.body.appendChild(tempDiv)
      const computedColor = getComputedStyle(tempDiv).color
      document.body.removeChild(tempDiv)
      const rgb = computedColor.match(/\d+/g)
      if (rgb) {
        const hex = '#' + rgb.map((v) => parseInt(v, 10).toString(16).padStart(2, '0')).join('')
        setFormData(prev => ({ 
          ...prev, 
          [activeColorField === 'primary' ? 'primaryColor' : 'secondaryColor']: hex 
        }))
      }
    }

    // Helper function to update hue from mouse position
    const updateHueFromEvent = (clientX: number) => {
      if (!hueRef.current) return
      const rect = hueRef.current.getBoundingClientRect()
      let x = (clientX - rect.left) / rect.width
      x = Math.min(1, Math.max(0, x))
      setSelectedHue(Math.round(x * 360))
    }

    // Helper function to update opacity from mouse position
    const updateOpacityFromEvent = (clientX: number) => {
      if (!opacityRef.current) return
      const rect = opacityRef.current.getBoundingClientRect()
      let x = (clientX - rect.left) / rect.width
      x = Math.min(1, Math.max(0, x))
      setOpacity(x)
    }

    // Global mouse event listeners for drag functionality
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingGradient) {
          updateGradientFromEvent(e.clientX, e.clientY)
        } else if (isDraggingHue) {
          updateHueFromEvent(e.clientX)
        } else if (isDraggingOpacity) {
          updateOpacityFromEvent(e.clientX)
        }
      }

      const handleMouseUp = () => {
        if (isDraggingGradient || isDraggingHue || isDraggingOpacity) {
          setIsDraggingGradient(false)
          setIsDraggingHue(false)
          setIsDraggingOpacity(false)
        }
      }

      if (isDraggingGradient || isDraggingHue || isDraggingOpacity) {
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
      }

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }, [isDraggingGradient, isDraggingHue, isDraggingOpacity, selectedHue, activeColorField])

    const handleInputChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }))
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

    // Clear the whole form first so imported values replace the current data
    // instead of merging with (or being blocked by) what's already there.
    setFormData(prev => ({
      ...prev,
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
    }))

    try {
      const result: ImportResult = await api.importCapabilityFromUrl(importUrl)
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

  const handleGeneratePdf = async (
    template: 'default' | 'modern' | 'corporate' | 'banded' | 'rail' | 'product' = 'default'
  ) => {
    setShowTemplateModal(false)
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
      pdfFormData.append('primaryColor', formData.primaryColor || '#0B2C48')
      pdfFormData.append('secondaryColor', formData.secondaryColor || '#6BA4A7')
      pdfFormData.append('template', template)
      
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

  const handleAiAssistant = async () => {
    if (enhancingContent) return
    
    const hasContent = formData.companyDescription || formData.coreCompetencies || formData.keyDifferentiators || formData.certifications || formData.projectDescription
    if (!hasContent) {
      showAiPopup('warning', 'Content Required', 'Please fill in some content first (Company Description, Core Competencies, Differentiators, Certifications, or Past Performance) before using AI enhancement.')
      return
    }
    
    setEnhancingContent(true)
    try {
      const result = await api.enhanceCapabilityStatement({
        companyName: formData.companyName,
        companyDescription: formData.companyDescription,
        coreCompetencies: formData.coreCompetencies,
        keyDifferentiators: formData.keyDifferentiators,
        projectDescription: formData.projectDescription,
        certifications: formData.certifications,
        naicsCodes: formData.naicsCodes,
      })
      
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          companyDescription: result.data!.companyDescription || prev.companyDescription,
          coreCompetencies: result.data!.coreCompetencies || prev.coreCompetencies,
          keyDifferentiators: result.data!.keyDifferentiators || prev.keyDifferentiators,
          projectDescription: result.data!.projectDescription || prev.projectDescription,
          certifications: result.data!.certifications || prev.certifications,
        }))
        showAiPopup('success', 'Content Enhanced!', 'Your capability statement content has been successfully enhanced with AI.')
      } else {
        showAiPopup('error', 'Enhancement Failed', result.error || 'Failed to enhance content. Please try again.')
      }
    } catch (error) {
      console.error('AI enhancement error:', error)
      showAiPopup('error', 'Enhancement Failed', 'Failed to enhance content. Please try again.')
    } finally {
      setEnhancingContent(false)
    }
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

  const handleLoadPdf = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-corama-dark">
      {/* AI Assistant Popup */}
      <AIAssistantPopup
        isOpen={aiPopup.isOpen}
        type={aiPopup.type}
        title={aiPopup.title}
        message={aiPopup.message}
        onClose={closeAiPopup}
      />
      
      {/* Extracting popup for data extraction */}
      <ThinkingPopup isVisible={uploading || importingUrl} text="Extracting" />
      
      {/* Header spans full width at top */}
      <Header />
      
      {/* Sidebar + Content row below header */}
      <div className="flex">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0 max-h-[calc(100vh-4rem)]">
        
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                  {/* Sticky Page Title and Steps */}
                  <div className="sticky top-0 z-20 bg-corama-dark px-3 sm:px-4 lg:px-6 pb-3 pt-3">
            <div className="text-center mb-3 lg:mb-4 animate-fade-in">
              <h1 className="text-white font-poppins font-bold text-xl sm:text-2xl mb-3 sm:mb-4">{t('capabilityBuilder')}</h1>
              <div className="flex justify-center gap-4 sm:gap-6">
                {stepsCompleted.map((completed, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-center transition-all duration-300 ease-out ${
                      completed 
                        ? 'scale-100 drop-shadow-[0_0_20px_rgba(153,200,202,0.8)]' 
                        : 'scale-90'
                    }`}
                  >
                    {completed ? (
                      <div className="w-14 h-14 sm:w-16 sm:h-16">
                        <Lottie 
                          animationData={checkAnimation} 
                          loop={false}
                          autoplay={true}
                        />
                      </div>
                    ) : (
                      <img src={EmptyCheckSvg} alt="" className="w-14 h-14 sm:w-16 sm:h-16" />
                    )}
                  </div>
                ))}
              </div>
            </div>
                    </div>

                    {/* Content wrapper with padding */}
                    <div className="p-3 sm:p-4 lg:p-6">
                    {/* Import Existing Capability Statement */}
                    <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6 mb-4 lg:mb-6 animate-fade-in-up animate-delay-100">
            <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-4 sm:mb-5">{t('importExistingCapability')}</h2>
            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 items-stretch sm:items-center">
              {/* Upload File Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <span className="text-white font-poppins text-sm whitespace-nowrap">{t('uploadFile')}</span>
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
                  className={`bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-4 sm:px-6 cursor-pointer transition-all w-full sm:w-auto sm:min-w-[280px] ${
                    isDragOver ? 'ring-2 ring-corama-teal' : ''
                  }`}
                >
                  <span className="text-gray-500 font-poppins text-sm truncate block">
                    {selectedFile ? selectedFile.name : t('clickHereToBrowse')}
                  </span>
                </div>
                {selectedFile && (
                  <button
                    onClick={handleImportFile}
                    disabled={uploading}
                    className="bg-corama-teal text-white rounded-lg py-2 px-4 text-sm hover:bg-corama-teal/80 transition-colors disabled:opacity-50 w-full sm:w-auto"
                  >
                    {uploading ? t('importingText') : t('importBtn')}
                  </button>
                )}
              </div>

              {/* Or Import from URL Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full lg:flex-1">
                <span className="text-white font-poppins text-sm whitespace-nowrap">{t('orImportFromUrl')}</span>
                <div className="flex flex-col gap-1 w-full lg:flex-1">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && importUrl.trim() && !importingUrl) {
                          e.preventDefault()
                          handleImportFromUrl()
                        }
                      }}
                      placeholder={t('importUrlPlaceholder')}
                      className="flex-1 bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-4 text-gray-900 text-sm focus:outline-none focus:border-[#1C4262]"
                    />
                    <button
                      onClick={handleImportFromUrl}
                      disabled={importingUrl || !importUrl.trim()}
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
                      style={{ backgroundColor: '#6B9B9B' }}
                    >
                      {importingUrl ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <img src="/static/app/dashboard/ImportURL.svg" alt="" className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <span className="text-gray-300 font-poppins text-xs">{t('importUrlHint')}</span>
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
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6 animate-fade-in-up animate-delay-200">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">{t('companyInformation')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('companyName')}</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder={t('typeCompanyName')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('website')}</label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder={t('typeWebsiteUrl')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('contactName')}</label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      placeholder={t('typeContactName')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('titleLabel')}</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder={t('typeJobTitle')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('phone')}</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder={t('typePhoneNumber')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('email')}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder={t('typeEmailAddress')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('address')}</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder={t('typeStreetAddress')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('city')}</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder={t('typeCity')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('stateLabel')}</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder={t('typeState')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('zipCode')}</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder={t('typeZipCode')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Company Details */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6 animate-fade-in-up animate-delay-300">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">{t('companyDetails')}</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('industryFocus')}</label>
                    <select
                      value={formData.industryFocus}
                      onChange={(e) => handleInputChange('industryFocus', e.target.value)}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:border-[#1C4262] appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                    >
                      <option value="" className="bg-corama-darker text-gray-400">{t('selectIndustryFocus')}</option>
                      {INDUSTRY_OPTIONS.map((option) => (
                        <option key={option} value={option} className="bg-corama-darker text-white">
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <TagInput
                    label={t('coreCompetencies')}
                    value={formData.coreCompetencies}
                    onChange={(value) => handleInputChange('coreCompetencies', value)}
                    placeholder={t('typeCompetencyEnter')}
                  />
                  <TagInput
                    label={t('keyDifferentiators')}
                    value={formData.keyDifferentiators}
                    onChange={(value) => handleInputChange('keyDifferentiators', value)}
                    placeholder={t('typeDifferentiatorEnter')}
                  />
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('companyDescription')}</label>
                    <input
                      type="text"
                      value={formData.companyDescription}
                      onChange={(e) => handleInputChange('companyDescription', e.target.value)}
                      placeholder={t('typeBriefDescription')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Company Logo & Images */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">{t('companyLogo')}</h2>
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
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">{t('companyImages')}</h2>
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

                            {/* Government Codes & Certifications */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">{t('govCodesCertifications')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('ueiCode')}</label>
                    <input
                      type="text"
                      value={formData.ueiCode}
                      onChange={(e) => handleInputChange('ueiCode', e.target.value)}
                      placeholder={t('typeUeiCode')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('cageCode')}</label>
                    <input
                      type="text"
                      value={formData.cageCode}
                      onChange={(e) => handleInputChange('cageCode', e.target.value)}
                      placeholder={t('typeCageCode')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <TagInput
                    label={t('naicsCodes')}
                    value={formData.naicsCodes}
                    onChange={(value) => handleInputChange('naicsCodes', value)}
                    placeholder={t('typeNaicsCode')}
                  />
                  <TagInput
                    label={t('certifications')}
                    value={formData.certifications}
                    onChange={(value) => handleInputChange('certifications', value)}
                    placeholder={t('typeCertification')}
                  />
                </div>
              </div>

              {/* Past Performance */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">{t('pastPerformance')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('clientAgency')}</label>
                    <input
                      type="text"
                      value={formData.clientAgency}
                      onChange={(e) => handleInputChange('clientAgency', e.target.value)}
                      placeholder={t('typeClientAgency')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-white font-poppins text-sm mb-1 block">{t('contractValueLabel')}</label>
                    <input
                      type="text"
                      value={formData.contractValue}
                      onChange={(e) => handleInputChange('contractValue', e.target.value)}
                      placeholder={t('typeContractValue')}
                      className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                    />
                  </div>
                </div>
                            <div className="mt-4">
                              <label className="text-white font-poppins text-sm mb-1 block">{t('projectDescription')}</label>
                              <input
                                type="text"
                                value={formData.projectDescription}
                                onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                                placeholder={t('typeProjectDescription')}
                                className="w-full bg-white border-2 border-[#3D4F5F] rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:border-[#1C4262] placeholder:text-xs placeholder:text-gray-400"
                              />
                            </div>
                          </div>

                          {/* Color Scheme */}
                          <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                            <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">{t('colorScheme')}</h2>
                            
                            {/* Color Gradient Picker */}
                            <div className="mb-6 rounded-lg overflow-hidden">
                              <div 
                                ref={gradientRef}
                                className="h-40 w-full rounded-t-lg relative cursor-crosshair"
                                style={{
                                  background: `linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,1)), linear-gradient(to right, rgba(255,255,255,1), hsl(${selectedHue}, 100%, 50%))`,
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setIsDraggingGradient(true)
                                  updateGradientFromEvent(e.clientX, e.clientY)
                                }}
                              >
                                <div 
                                  className="absolute w-4 h-4 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-lg"
                                  style={{ left: `${gradientPos.x * 100}%`, top: `${gradientPos.y * 100}%` }}
                                />
                              </div>
                              {/* Hue Slider */}
                              <div 
                                ref={hueRef}
                                className="h-4 w-full relative cursor-pointer"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setIsDraggingHue(true)
                                  updateHueFromEvent(e.clientX)
                                }}
                              >
                                <div 
                                  className="h-full w-full"
                                  style={{
                                    background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                                  }}
                                />
                                <div 
                                  className="absolute w-3 h-6 border-2 border-white rounded-sm transform -translate-x-1/2 -translate-y-1/4 pointer-events-none shadow-lg"
                                  style={{ left: `${(selectedHue / 360) * 100}%`, top: '0' }}
                                />
                              </div>
                              {/* Opacity Slider */}
                              <div 
                                ref={opacityRef}
                                className="h-4 w-full relative cursor-pointer mt-1"
                                style={{
                                  background: `linear-gradient(to right, transparent, ${activeColorField === 'primary' ? formData.primaryColor : formData.secondaryColor}), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23ccc'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23ccc'/%3E%3C/svg%3E")`
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setIsDraggingOpacity(true)
                                  updateOpacityFromEvent(e.clientX)
                                }}
                              >
                                <div 
                                  className="absolute w-3 h-6 border-2 border-white rounded-sm transform -translate-x-1/2 -translate-y-1/4 pointer-events-none shadow-lg"
                                  style={{ left: `${opacity * 100}%`, top: '0' }}
                                />
                              </div>
                            </div>

                            {/* Primary Color Section */}
                            <div className="mb-6 flex flex-col items-center">
                              <div className="inline-block">
                                <label className="text-white font-poppins text-sm mb-2 block">{t('primaryColorHeadersAccents')}</label>
                                <div className={`bg-white rounded-xl overflow-hidden ${activeColorField === 'primary' ? 'ring-2 ring-blue-500' : ''}`}>
                                  {/* Hex Input */}
                                  <div 
                                    className="px-4 py-2 cursor-pointer border-b border-gray-100"
                                    onClick={() => setActiveColorField('primary')}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">#</span>
                                      <input
                                        type="text"
                                        value={formData.primaryColor.replace('#', '').toUpperCase()}
                                        onChange={(e) => handleInputChange('primaryColor', '#' + e.target.value.replace('#', ''))}
                                        onFocus={() => setActiveColorField('primary')}
                                        className="bg-transparent text-gray-900 focus:outline-none font-mono w-20"
                                        maxLength={6}
                                      />
                                    </div>
                                  </div>
                                  {/* Presets */}
                                  <div className="px-4 py-3">
                                    <div className="text-center mb-2">
                                      <span className="text-gray-700 text-sm font-medium">Presets</span>
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                      {colorPresets.map((preset, index) => (
                                        <button
                                          key={`primary-${index}`}
                                          type="button"
                                          onClick={() => {
                                            setActiveColorField('primary')
                                            handleInputChange('primaryColor', preset.primary)
                                          }}
                                          className={`w-8 h-8 rounded-full hover:scale-110 transition-all ${formData.primaryColor.toLowerCase() === preset.primary.toLowerCase() ? 'ring-2 ring-gray-400 ring-offset-2' : ''}`}
                                          style={{ backgroundColor: preset.primary }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Secondary Color Section */}
                            <div className="flex flex-col items-center">
                              <div className="inline-block">
                                <label className="text-white font-poppins text-sm mb-2 block">{t('secondaryColorSectionsBg')}</label>
                                <div className={`bg-white rounded-xl overflow-hidden ${activeColorField === 'secondary' ? 'ring-2 ring-blue-500' : ''}`}>
                                  {/* Hex Input */}
                                  <div 
                                    className="px-4 py-2 cursor-pointer border-b border-gray-100"
                                    onClick={() => setActiveColorField('secondary')}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">#</span>
                                      <input
                                        type="text"
                                        value={formData.secondaryColor.replace('#', '').toUpperCase()}
                                        onChange={(e) => handleInputChange('secondaryColor', '#' + e.target.value.replace('#', ''))}
                                        onFocus={() => setActiveColorField('secondary')}
                                        className="bg-transparent text-gray-900 focus:outline-none font-mono w-20"
                                        maxLength={6}
                                      />
                                    </div>
                                  </div>
                                  {/* Presets */}
                                  <div className="px-4 py-3">
                                    <div className="text-center mb-2">
                                      <span className="text-gray-700 text-sm font-medium">Presets</span>
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                      {colorPresets.map((preset, index) => (
                                        <button
                                          key={`secondary-${index}`}
                                          type="button"
                                          onClick={() => {
                                            setActiveColorField('secondary')
                                            handleInputChange('secondaryColor', preset.primary)
                                          }}
                                          className={`w-8 h-8 rounded-full hover:scale-110 transition-all ${formData.secondaryColor.toLowerCase() === preset.primary.toLowerCase() ? 'ring-2 ring-gray-400 ring-offset-2' : ''}`}
                                          style={{ backgroundColor: preset.primary }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                                                            {/* Right Column - Preview & Actions (sticky on desktop) */}
                                                <div className="space-y-4 lg:space-y-6 lg:sticky lg:top-40 lg:self-start">
              {/* Preview Area with Toolbar */}
              <div className="rounded-xl border-2 border-[#1C4262] overflow-hidden animate-fade-in">
                {/* Toolbar Header */}
                <div className="bg-[#2A3F54] flex justify-around items-center px-4 py-3 rounded-t-lg">
                  <button 
                    onClick={handleSave}
                    className="hover:opacity-80 transition-opacity"
                    title="Save"
                  >
                    <img src="/static/app/dashboard/Save.svg" alt="Save" className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                  <button 
                    onClick={handleReset}
                    className="hover:opacity-80 transition-opacity"
                    title="Reload"
                  >
                    <img src="/static/app/dashboard/Reload.svg" alt="Reload" className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                  <button 
                    onClick={handleLoadPdf}
                    className="hover:opacity-80 transition-opacity"
                    title="Load PDF"
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
                          <h3 className="font-bold text-[#1C4262] text-sm mb-1">{t('aboutUsLabel')}</h3>
                          <p className="text-xs">{formData.companyDescription}</p>
                        </div>
                      )}
                      {formData.keyDifferentiators && (
                        <div>
                          <h3 className="font-bold text-[#1C4262] text-sm mb-1">{t('differentiators')}</h3>
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
                onClick={() => setShowTemplateModal(true)}
                disabled={generatingPdf || !canGeneratePdf}
                className="w-full flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'rgb(28, 66, 98)' }}
              >
                <div className="text-left flex-1">
                  <p className="font-bold text-sm sm:text-base">
                    {generatingPdf ? 'Generating...' : 'Generate PDF'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-300">{t('createYourCapabilityStatement')}</p>
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
                disabled={enhancingContent}
                className="w-full flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'rgb(28, 66, 98)' }}
              >
                <div className="text-left flex-1">
                  <p className="font-bold text-sm sm:text-base">
                    {enhancingContent ? t('enhancingContent') : 'AI Assistant'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-300">{t('useAiToEnhance')}</p>
                </div>
                {enhancingContent ? (
                  <div className="w-6 h-6 border-2 border-corama-teal border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <img src="/static/app/dashboard/AIAssistant.svg" alt="" className="w-6 h-6 flex-shrink-0" />
                )}
              </button>
            </div>
          </div>
          </div>
        </main>
        </div>
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTemplateModal(false)}
          />
          <div
            className="relative rounded-2xl p-6 sm:p-8 max-w-4xl w-full mx-4 border border-white/20 animate-popup-pop max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'rgb(11, 44, 72)' }}
          >
            <button
              className="absolute top-4 right-4 hover:opacity-80 transition-opacity"
              onClick={() => setShowTemplateModal(false)}
            >
              <img src="/static/app/proposal-summary/ClosePopupButton.svg" alt="Close" className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <img src="/static/app/dashboard/GeneratePDF.svg" alt="" className="w-12 h-12 mx-auto mb-3" />
              <h3 className="text-white font-poppins font-bold text-lg sm:text-xl">
                {t('chooseTemplate')}
              </h3>
              <p className="text-gray-300 font-poppins text-xs sm:text-sm mt-1">
                {t('chooseTemplateDescription')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Classic Template */}
              <button
                onClick={() => handleGeneratePdf('default')}
                className="flex-1 group rounded-xl p-4 border-2 border-white/20 hover:border-[#5CBFC0] transition-all text-left"
                style={{ backgroundColor: 'rgb(28, 66, 98)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0B2C48' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-poppins font-bold text-sm">{t('classicTemplate')}</p>
                    <p className="text-gray-400 font-poppins text-xs">{t('classicTemplateDescription')}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg overflow-hidden border border-white/10" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="h-2" style={{ backgroundColor: '#0B2C48' }} />
                  <div className="p-2 space-y-1">
                    <div className="h-1.5 rounded bg-gray-300 w-3/4" />
                    <div className="h-1 rounded bg-gray-200 w-full" />
                    <div className="h-1 rounded bg-gray-200 w-5/6" />
                    <div className="flex gap-1 mt-1">
                      <div className="h-1.5 rounded-full bg-[#0B2C48] w-8" />
                      <div className="h-1.5 rounded-full bg-[#0B2C48] w-10" />
                      <div className="h-1.5 rounded-full bg-[#0B2C48] w-6" />
                    </div>
                  </div>
                </div>
              </button>

              {/* Modern Template */}
              <button
                onClick={() => handleGeneratePdf('modern')}
                className="group rounded-xl p-4 border-2 border-white/20 hover:border-[#5CBFC0] transition-all text-left"
                style={{ backgroundColor: 'rgb(28, 66, 98)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5CBFC0' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-poppins font-bold text-sm">{t('modernTemplate')}</p>
                    <p className="text-gray-400 font-poppins text-xs">{t('modernTemplateDescription')}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg overflow-hidden border border-white/10" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="flex h-16">
                    <div className="w-1/3" style={{ backgroundColor: '#5CBFC0' }}>
                      <div className="p-1.5 space-y-1">
                        <div className="h-1.5 rounded bg-white/60 w-3/4" />
                        <div className="h-1 rounded bg-white/40 w-full" />
                      </div>
                    </div>
                    <div className="w-2/3 p-1.5 space-y-1">
                      <div className="h-1.5 rounded bg-gray-300 w-2/3" />
                      <div className="h-1 rounded bg-gray-200 w-full" />
                      <div className="h-1 rounded bg-gray-200 w-4/5" />
                    </div>
                  </div>
                </div>
              </button>

              {/* Corporate Template */}
              <button
                onClick={() => handleGeneratePdf('corporate')}
                className="group rounded-xl p-4 border-2 border-white/20 hover:border-[#5CBFC0] transition-all text-left"
                style={{ backgroundColor: 'rgb(28, 66, 98)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5CBFC0' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-poppins font-bold text-sm">{t('corporateTemplate')}</p>
                    <p className="text-gray-400 font-poppins text-xs">{t('corporateTemplateDescription')}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg overflow-hidden border border-white/10" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="h-5 flex items-center px-2" style={{ backgroundColor: '#0B2C48' }}>
                    <div className="h-2 w-8 rounded bg-white/70" />
                    <div className="h-2 w-14 rounded bg-[#5CBFC0] ml-auto" />
                  </div>
                  <div className="flex h-12 p-2 gap-1">
                    <div className="w-[44%] space-y-1">
                      <div className="h-2 rounded bg-[#5CBFC0] w-full" />
                      <div className="h-1 rounded bg-gray-300 w-full" />
                      <div className="h-1 rounded bg-gray-300 w-4/5" />
                    </div>
                    <div className="w-px bg-gray-300" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 rounded bg-[#0B2C48] w-full" />
                      <div className="h-1 rounded bg-gray-300 w-11/12" />
                      <div className="h-1 rounded bg-gray-300 w-3/4" />
                    </div>
                  </div>
                </div>
              </button>

              {/* Banded Template */}
              <button
                onClick={() => handleGeneratePdf('banded')}
                className="group rounded-xl p-4 border-2 border-white/20 hover:border-[#5CBFC0] transition-all text-left"
                style={{ backgroundColor: 'rgb(28, 66, 98)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0B2C48' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-poppins font-bold text-sm">{t('bandedTemplate')}</p>
                    <p className="text-gray-400 font-poppins text-xs">{t('bandedTemplateDescription')}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg overflow-hidden border border-white/10 p-2 space-y-1" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="h-3 rounded-sm" style={{ backgroundColor: '#0B2C48' }} />
                  <div className="h-2 rounded-sm" style={{ backgroundColor: '#263F54' }} />
                  <div className="h-5 rounded-sm bg-gray-200" />
                  <div className="h-2 rounded-sm" style={{ backgroundColor: '#263F54' }} />
                  <div className="h-5 rounded-sm bg-gray-200" />
                </div>
              </button>

              {/* Rail Template */}
              <button
                onClick={() => handleGeneratePdf('rail')}
                className="group rounded-xl p-4 border-2 border-white/20 hover:border-[#5CBFC0] transition-all text-left"
                style={{ backgroundColor: 'rgb(28, 66, 98)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0B2C48' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 4v16M9 6h10M9 12h10M9 18h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-poppins font-bold text-sm">{t('railTemplate')}</p>
                    <p className="text-gray-400 font-poppins text-xs">{t('railTemplateDescription')}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg overflow-hidden border border-white/10 flex h-16" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="w-1/5 p-1 space-y-2" style={{ backgroundColor: '#0B2C48' }}>
                    <div className="h-1 rounded bg-white/70 w-full" />
                    <div className="h-1 rounded bg-white/50 w-4/5" />
                    <div className="h-1 rounded bg-white/50 w-full" />
                  </div>
                  <div className="flex-1 p-2 space-y-2">
                    <div className="h-1 rounded bg-gray-300 w-3/4" />
                    <div className="h-1 rounded bg-gray-200 w-full" />
                    <div className="h-1 rounded bg-gray-200 w-5/6" />
                    <div className="h-px bg-gray-300" />
                  </div>
                </div>
              </button>

              {/* Product Template */}
              <button
                onClick={() => handleGeneratePdf('product')}
                className="group rounded-xl p-4 border-2 border-white/20 hover:border-[#5CBFC0] transition-all text-left"
                style={{ backgroundColor: 'rgb(28, 66, 98)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5CBFC0' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16v5H4zM4 14h7v5H4zM14 14h6v5h-6z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-poppins font-bold text-sm">{t('productTemplate')}</p>
                    <p className="text-gray-400 font-poppins text-xs">{t('productTemplateDescription')}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg overflow-hidden border border-white/10" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="h-6 flex items-center px-2" style={{ backgroundColor: '#0B2C48' }}>
                    <div className="h-2 w-16 rounded bg-white/70" />
                  </div>
                  <div className="h-1" style={{ backgroundColor: '#5CBFC0' }} />
                  <div className="flex h-10 gap-2 p-2">
                    <div className="flex-1 space-y-1">
                      <div className="h-2 rounded bg-gray-400 w-3/4" />
                      <div className="h-1 rounded bg-gray-200 w-full" />
                      <div className="h-1 rounded bg-gray-200 w-5/6" />
                    </div>
                    <div className="flex-1 rounded bg-gray-200 p-1 space-y-1">
                      <div className="h-1.5 rounded bg-gray-400 w-full" />
                      <div className="h-1 rounded bg-gray-300 w-4/5" />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CapabilityBuilder

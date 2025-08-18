import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { 
  ArrowLeft, 
  Sparkles, 
  Wand2, 
  FileText, 
  Download,
  Copy,
  Check,
  Image
} from 'lucide-react'
import axios from 'axios'

interface GenerateRequest {
  company_name: string
  industry: string
  capabilities: string[]
  experience_years: number
  description: string
  template_id?: string
  duns_number?: string
  cage_code?: string
  naics_codes?: string
  certifications?: string
}

interface Template {
  id: string
  name: string
  description: string
  preview_url: string
  sections: string[]
}

const CapabilityBuilder = () => {
  const { user, token, fetchUserProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [copied, setCopied] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('professional')
  const [uploadedLogo, setUploadedLogo] = useState<File | null>(null)
  const [isMultiPage, setIsMultiPage] = useState(false)
  
  const [formData, setFormData] = useState<GenerateRequest>({
    company_name: '',
    industry: '',
    capabilities: [],
    experience_years: 0,
    description: '',
    template_id: 'professional',
    duns_number: '',
    cage_code: '',
    naics_codes: '',
    certifications: ''
  })

  const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/templates`)
      setTemplates(response.data)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'experience_years' ? parseInt(value) || 0 : value
    }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedLogo(file)
      
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        await axios.post(`${API_BASE_URL}/documents/upload`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (fetchUserProfile && token) {
          await fetchUserProfile(token)
        }
      } catch (error) {
        console.error('Failed to upload logo:', error)
      }
    }
  }

  const handleCapabilitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const capabilities = e.target.value.split(',').map(cap => cap.trim()).filter(cap => cap)
    setFormData(prev => ({
      ...prev,
      capabilities
    }))
  }

  const handleGenerate = async () => {
    if (!formData.company_name || !formData.industry || formData.capabilities.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const endpoint = isMultiPage ? '/capability-statements/generate-multipage' : '/capability-statements/generate'
      const requestData = {
        ...formData,
        template_id: selectedTemplate
      }
      
      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      setGeneratedContent(response.data.content || response.data)
      setGenerated(true)
      
      if (fetchUserProfile && token) {
        await fetchUserProfile(token)
      }
    } catch (error) {
      console.error('Failed to generate capability statement:', error)
      alert('Failed to generate capability statement. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formData.company_name}_capability_statement.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-container bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10"></div>
      
      <nav className="relative z-10 flex items-center justify-between content-container py-6 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard" className="text-white hover:text-blue-400 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Corama</span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 content-container py-8">
        <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <Wand2 className="w-8 h-8 mr-3 text-blue-400" />
            AI Capability Statement Builder
          </h1>
          <p className="text-slate-300 text-lg">
            Generate professional capability statements with AI assistance
          </p>
        </motion.div>

        {!generated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Template Selection</CardTitle>
                <CardDescription className="text-slate-300">
                  Choose a template that best fits your industry and needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTemplate === template.id
                          ? 'border-blue-400 bg-blue-400/10'
                          : 'border-white/20 bg-white/5 hover:border-white/40'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <h3 className="text-white font-semibold">{template.name}</h3>
                      <p className="text-slate-300 text-sm mt-1">{template.description}</p>
                      <div className="mt-2">
                        <p className="text-slate-400 text-xs">Sections:</p>
                        <p className="text-slate-300 text-xs">{template.sections.join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Company Logo & Branding</CardTitle>
                <CardDescription className="text-slate-300">
                  Upload your company logo for a professional appearance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                    <Image className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-white">Upload Company Logo</p>
                      <p className="text-slate-400 text-sm">PNG, JPG, SVG up to 5MB</p>
                      <input
                        type="file"
                        onChange={handleLogoUpload}
                        accept=".png,.jpg,.jpeg,.svg"
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload">
                        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                          <span>Choose Logo</span>
                        </Button>
                      </label>
                      {uploadedLogo && (
                        <p className="text-green-400 text-sm mt-2">
                          Uploaded: {uploadedLogo.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Company Information</CardTitle>
                <CardDescription className="text-slate-300">
                  Provide details about your company to generate a tailored capability statement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company_name" className="text-white">Company Name *</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                      placeholder="Enter your company name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-white">Industry *</Label>
                    <Input
                      id="industry"
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                      placeholder="e.g., Information Technology"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duns_number" className="text-white">DUNS Number</Label>
                    <Input
                      id="duns_number"
                      name="duns_number"
                      value={formData.duns_number}
                      onChange={handleInputChange}
                      placeholder="123456789"
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cage_code" className="text-white">CAGE Code</Label>
                    <Input
                      id="cage_code"
                      name="cage_code"
                      value={formData.cage_code}
                      onChange={handleInputChange}
                      placeholder="ABCD1"
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience_years" className="text-white">Years of Experience</Label>
                    <Input
                      id="experience_years"
                      name="experience_years"
                      type="number"
                      value={formData.experience_years}
                      onChange={handleInputChange}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                      placeholder="5"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="naics_codes" className="text-white">NAICS Codes</Label>
                  <Input
                    id="naics_codes"
                    name="naics_codes"
                    value={formData.naics_codes}
                    onChange={handleInputChange}
                    placeholder="e.g., 541511, 541512, 541513 (comma-separated)"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capabilities" className="text-white">Core Capabilities *</Label>
                  <Input
                    id="capabilities"
                    name="capabilities"
                    onChange={handleCapabilitiesChange}
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                    placeholder="e.g., Software Development, Cloud Computing, Cybersecurity (comma-separated)"
                    required
                  />
                  <p className="text-xs text-slate-400">Separate multiple capabilities with commas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications" className="text-white">Certifications</Label>
                  <Input
                    id="certifications"
                    name="certifications"
                    value={formData.certifications}
                    onChange={handleInputChange}
                    placeholder="e.g., ISO 9001, CMMI Level 3, SOC 2 (comma-separated)"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Company Description</Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="flex min-h-[100px] w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Brief description of your company's mission, values, and unique strengths..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="multipage"
                    checked={isMultiPage}
                    onChange={(e) => setIsMultiPage(e.target.checked)}
                    className="rounded border-white/20 bg-white/10"
                  />
                  <Label htmlFor="multipage" className="text-white">
                    Generate Multi-Page Document (10 credits)
                  </Label>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={loading || !user || user.credits < (isMultiPage ? 10 : 5)}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Capability Statement ({isMultiPage ? '10' : '5'} credits)
                    </>
                  )}
                </Button>
                
                {user && user.credits < (isMultiPage ? 10 : 5) && (
                  <p className="text-red-400 text-sm text-center">
                    Insufficient credits. You need {isMultiPage ? '10' : '5'} credits to generate a capability statement.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-400" />
                  Generated Capability Statement
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Your AI-generated capability statement is ready
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-800/50 rounded-lg p-6 mb-4">
                  <pre className="text-white text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {generatedContent}
                  </pre>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download as Text
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setGenerated(false)
                      setGeneratedContent('')
                      setFormData({
                        company_name: '',
                        industry: '',
                        capabilities: [],
                        experience_years: 0,
                        description: '',
                        template_id: 'professional',
                        duns_number: '',
                        cage_code: '',
                        naics_codes: '',
                        certifications: ''
                      })
                    }}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        </div>
      </main>
    </div>
  )
}

export default CapabilityBuilder

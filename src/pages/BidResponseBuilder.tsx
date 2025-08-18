import React, { useState } from 'react'
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
  FileText, 
  Upload,
  Download,
  Copy,
  Check,
  Zap,
  AlertCircle
} from 'lucide-react'
import axios from 'axios'

interface BidRequest {
  contract_id: string
  company_info: string
  requirements: string[]
  additional_context: string
}

const BidResponseBuilder = () => {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [copied, setCopied] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  
  const [formData, setFormData] = useState<BidRequest>({
    contract_id: '',
    company_info: '',
    requirements: [],
    additional_context: ''
  })

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRequirementsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const requirements = e.target.value.split('\n').map(req => req.trim()).filter(req => req)
    setFormData(prev => ({
      ...prev,
      requirements
    }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const handleGenerate = async () => {
    if (!formData.contract_id || !formData.company_info) {
      alert('Please fill in required fields')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(
        `${API_BASE_URL}/bid-responses/generate`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      setGeneratedContent(response.data.content)
      setGenerated(true)
    } catch (error) {
      console.error('Failed to generate bid response:', error)
      alert('Failed to generate bid response. Please try again.')
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
    a.download = `bid_response_${formData.contract_id}.txt`
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
        <div className="flex items-center space-x-4">
          <div className="text-white text-sm">
            Credits: <span className="font-bold text-yellow-400">{user?.credits || 0}</span>
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
            <Zap className="w-8 h-8 mr-3 text-purple-400" />
            AI Bid Response Builder
          </h1>
          <p className="text-slate-300 text-lg">
            Generate compelling bid responses with AI assistance and fine-tuned recommendations
          </p>
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center text-yellow-400">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="text-sm">This feature requires 10 AI credits per generation</span>
            </div>
          </div>
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
                <CardTitle className="text-white">Contract Information</CardTitle>
                <CardDescription className="text-slate-300">
                  Provide details about the contract opportunity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="contract_id" className="text-white">Contract ID / Solicitation Number *</Label>
                  <Input
                    id="contract_id"
                    name="contract_id"
                    value={formData.contract_id}
                    onChange={handleInputChange}
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                    placeholder="e.g., W52P1J-24-R-0001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_info" className="text-white">Company Information *</Label>
                  <textarea
                    id="company_info"
                    name="company_info"
                    value={formData.company_info}
                    onChange={handleInputChange}
                    className="flex min-h-[100px] w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Brief overview of your company's capabilities, experience, and qualifications relevant to this contract..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements" className="text-white">Contract Requirements</Label>
                  <textarea
                    id="requirements"
                    onChange={handleRequirementsChange}
                    className="flex min-h-[120px] w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="List key requirements from the solicitation (one per line):&#10;- Minimum 5 years experience in software development&#10;- Security clearance required&#10;- Agile development methodology&#10;- Cloud infrastructure expertise"
                    rows={6}
                  />
                  <p className="text-xs text-slate-400">Enter each requirement on a new line</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_context" className="text-white">Additional Context</Label>
                  <textarea
                    id="additional_context"
                    name="additional_context"
                    value={formData.additional_context}
                    onChange={handleInputChange}
                    className="flex min-h-[80px] w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Any additional context, special considerations, or strategic approach notes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Supporting Documents</CardTitle>
                <CardDescription className="text-slate-300">
                  Upload capability statements or other relevant documents (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-white">Upload supporting documents</p>
                    <p className="text-slate-400 text-sm">PDF, DOC, DOCX up to 10MB</p>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                        <span>Choose File</span>
                      </Button>
                    </label>
                    {uploadedFile && (
                      <p className="text-green-400 text-sm mt-2">
                        Uploaded: {uploadedFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleGenerate}
              disabled={loading || !user?.credits || user.credits < 10}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Bid Response...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Bid Response (10 credits)
                </>
              )}
            </Button>
            
            {(!user?.credits || user.credits < 10) && (
              <div className="text-center">
                <p className="text-yellow-400 text-sm mb-2">
                  Insufficient credits. You need 10 credits to generate a bid response.
                </p>
                <Link to="/pricing">
                  <Button variant="outline" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/10">
                    Purchase Credits
                  </Button>
                </Link>
              </div>
            )}
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
                  Generated Bid Response
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Your AI-generated bid response is ready for review and customization
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
                        contract_id: '',
                        company_info: '',
                        requirements: [],
                        additional_context: ''
                      })
                      setUploadedFile(null)
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Zap className="w-4 h-4 mr-2" />
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

export default BidResponseBuilder

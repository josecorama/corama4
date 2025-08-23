import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import { 
  FileText, 
  Search, 
  Upload, 
  BarChart3, 
  Plus, 
  Sparkles, 
  LogOut,
  User,
  Settings,
  Zap,
  CreditCard,
  Target,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Coins,
  ExternalLink
} from 'lucide-react'
import axios from 'axios'

interface DashboardStats {
  capability_statements: number
  active_searches: number
  contract_matches: number
  documents_uploaded: number
}

interface Contract {
  id: string
  title: string
  agency: string
  description: string
  deadline: string
  value: string
  requirements: string[]
  match_score?: number
  apply_url?: string
  match_details?: {
    score: number
    factors: Array<{
      name: string
      weight: number
      value: number
      contribution: number
      evidence: string[]
    }>
    notes?: string
  }
}

interface CompetitiveAnalysis {
  contract_id: string
  match_score: number
  strengths: string[]
  gaps: string[]
  recommendations: string[]
  bid_strategy: string
}

const Dashboard = () => {
  const { user, logout, token } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [hasCompanyProfile, setHasCompanyProfile] = useState<boolean | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [embeddingLoading, setEmbeddingLoading] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [competitiveAnalysis] = useState<CompetitiveAnalysis | null>(null)
  const [showContracts, setShowContracts] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [bidLoading, setBidLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        setStats(response.data)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    const checkCompanyProfile = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/company-profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        setHasCompanyProfile(true)
        console.log('Company profile found:', response.data)
      } catch (error) {
        if (error.response?.status === 404) {
          setHasCompanyProfile(false)
          console.log('No company profile found')
        } else {
          console.error('Error checking company profile:', error)
        }
      }
    }

    const fetchInitialContracts = async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/contracts/search`, {
          query: user?.company || "government contracts",
          limit: 10
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        setContracts(response.data || [])
        setShowContracts(true)
      } catch (error) {
        console.error('Failed to fetch initial contracts:', error)
      }
    }

    if (token) {
      fetchStats()
      checkCompanyProfile()
      fetchInitialContracts()
    }
  }, [token, user?.company])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const response = await axios.post(`${API_BASE_URL}/contracts/search`, {
        query: user?.company || "government contracts",
        limit: 10
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setContracts(response.data || [])
      setShowContracts(true)
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
      alert('Failed to fetch contracts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const analyzeContract = async (contract: Contract) => {
    if (!hasCompanyProfile) {
      setError('Please complete your company profile to get competitive analysis')
      return
    }

    setError(null)
    setSelectedContract(contract)
    setAnalysisLoading(true)
    
    try {
      navigate(`/contracts/${contract.id}/analyze`)
    } catch (error) {
      console.error('Failed to navigate to contract analysis:', error)
      setError('Unable to open analysis. Please try again.')
      setAnalysisLoading(false)
    }
  }

  const createBidResponse = async () => {
    if (!selectedContract || !competitiveAnalysis) return
    
    setBidLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/bid-responses/generate`, {
        contract_title: selectedContract.title,
        contract_description: selectedContract.description,
        requirements: selectedContract.requirements.join(', '),
        company_info: `${user?.company} - ${user?.name}`,
        additional_context: competitiveAnalysis.bid_strategy
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      alert('Bid response generated successfully!')
    } catch (error) {
      console.error('Failed to create bid response:', error)
      alert('Failed to create bid response. Please try again.')
    } finally {
      setBidLoading(false)
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setUploadLoading(true)
      setError(null)
      
      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          
          await axios.post(`${API_BASE_URL}/documents/upload`, formData, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          })
          
          return file
        })
        
        const uploadedFilesList = await Promise.all(uploadPromises)
        setUploadedFiles(prev => [...prev, ...uploadedFilesList])
        
      } catch (error) {
        console.error('Failed to upload document:', error)
        setError('Failed to upload document. Please try again.')
      } finally {
        setUploadLoading(false)
      }
    }
  }

  const handleApplyToContract = (contract: Contract) => {
    if (!hasCompanyProfile) {
      setError('Please complete your company profile first')
      return
    }
    
    if (!contract.apply_url) {
      return
    }
    window.open(contract.apply_url, "_blank", "noopener,noreferrer")
  }

  const handleUploadCapabilityStatement = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setUploadLoading(true)
        setError(null)
        try {
          const formData = new FormData()
          formData.append('file', file)
          
          await axios.post(`${API_BASE_URL}/api/company-profile/upload`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          })
          
          setEmbeddingLoading(true)
          await axios.post(`${API_BASE_URL}/api/company-profile/embedding`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          setHasCompanyProfile(true)
          setEmbeddingLoading(false)
          
          await fetchContracts()
          
        } catch (error) {
          console.error('Failed to upload capability statement:', error)
          setError('Failed to upload capability statement. Please try again.')
        } finally {
          setUploadLoading(false)
        }
      }
    }
    input.click()
  }

  const fetchMatchDetails = async (contractId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/contracts/${contractId}/match`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      return response.data
    } catch (error) {
      console.error('Failed to fetch match details:', error)
      return null
    }
  }

  const generateMockMatchDetails = (score: number) => {
    return {
      score,
      factors: [
        { 
          name: "Vector similarity (capability ↔ contract)", 
          weight: 0.55, 
          value: 0.89, 
          contribution: 0.489, 
          evidence: ["operator interface", "inspect", "report"] 
        },
        { 
          name: "NAICS overlap", 
          weight: 0.20, 
          value: 1.00, 
          contribution: 0.20, 
          evidence: ["561720"] 
        },
        { 
          name: "Keyword fit", 
          weight: 0.15, 
          value: 0.80, 
          contribution: 0.12, 
          evidence: ["overhaul", "electronic", "USCG"] 
        },
        { 
          name: "Geography", 
          weight: 0.05, 
          value: 1.00, 
          contribution: 0.05, 
          evidence: ["Nationwide eligible"] 
        },
        { 
          name: "Set-aside", 
          weight: 0.05, 
          value: 0.60, 
          contribution: 0.03, 
          evidence: ["Small Business eligible"] 
        }
      ],
      notes: "Weights adjustable in Admin → Matching."
    }
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="w-full h-16 flex items-center justify-center px-[clamp(16px,3vw,40px)]">
          <div className="w-full max-w-7xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Corama</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2 border border-white/20">
              <CreditCard className="w-5 h-5 text-yellow-400" />
              <span className="text-white">Credits:</span>
              <span className="font-bold text-yellow-400">{user?.credits || 0}</span>
              <Link to="/pricing">
                <Button size="sm" className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white ml-2">
                  Buy More
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-2 text-white">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{user?.name}</span>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700">
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="text-white hover:bg-slate-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full">
        <div className="w-full py-6 flex justify-center px-[clamp(16px,3vw,40px)]">
          <div className="w-full max-w-7xl">
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-[clamp(28px,2.2vw,36px)] font-bold text-white mb-2">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-slate-300 text-[clamp(16px,1.1vw,18px)]">
              Manage your capability statements and discover new contract opportunities
            </p>
          </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid gap-[clamp(12px,1.2vw,24px)] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8"
            >
              <Card className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] p-5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[clamp(12px,.8vw,14px)] font-medium text-white">
                    Capability Statements
                  </CardTitle>
                  <FileText className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-[clamp(22px,1.6vw,28px)] font-bold text-white">{stats?.capability_statements || 0}</div>
                  <p className="text-[clamp(11px,.7vw,12px)] text-slate-400">
                    +2 from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] p-5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[clamp(12px,.8vw,14px)] font-medium text-white">
                    Active Searches
                  </CardTitle>
                  <Search className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-[clamp(22px,1.6vw,28px)] font-bold text-white">{stats?.active_searches || 0}</div>
                  <p className="text-[clamp(11px,.7vw,12px)] text-slate-400">
                    +1 from last week
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] p-5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[clamp(12px,.8vw,14px)] font-medium text-white">
                    Contract Matches
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-[clamp(22px,1.6vw,28px)] font-bold text-white">{stats?.contract_matches || 0}</div>
                  <p className="text-[clamp(11px,.7vw,12px)] text-slate-400">
                    +5 new this week
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] p-5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[clamp(12px,.8vw,14px)] font-medium text-white">
                    Available Credits
                  </CardTitle>
                  <Coins className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-[clamp(22px,1.6vw,28px)] font-bold text-white">{user?.credits || 0}</div>
                  <p className="text-[clamp(11px,.7vw,12px)] text-slate-400">
                    Use for AI features
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid gap-[clamp(12px,1.2vw,24px)] grid-cols-1 lg:grid-cols-12"
            >
              <Card className="lg:col-span-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] p-5 h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center text-[clamp(16px,1.1vw,18px)]">
                    <FileText className="w-5 h-5 mr-2 text-blue-400" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-[clamp(14px,.95vw,16px)]">
                    Get started with your most common tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Link to="/capability-builder">
                    <Button className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white justify-start text-[clamp(14px,.95vw,16px)]">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Capability Statement
                    </Button>
                  </Link>
                  <Button 
                    onClick={fetchContracts}
                    variant="secondary"
                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 justify-start font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-[clamp(14px,.95vw,16px)]"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Browse Available Contracts
                  </Button>
                  <Link to="/bid-response">
                    <Button variant="secondary" className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 justify-start font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-[clamp(14px,.95vw,16px)]">
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Bid Response
                    </Button>
                  </Link>
                  <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-slate-200 font-medium text-[clamp(14px,.95vw,16px)]">Upload Documents</p>
                    <p className="text-xs text-slate-400 mb-3">PDF, DOC, DOCX, PNG, JPG up to 5MB</p>

                    <input 
                      id="uploadDocs" 
                      type="file" 
                      className="sr-only" 
                      multiple 
                      onChange={handleDocumentUpload}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.svg"
                      disabled={uploadLoading}
                      aria-label="Upload documents"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('uploadDocs')?.click()}
                      className="w-full h-11 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      disabled={uploadLoading}
                      aria-describedby="upload-help"
                    >
                      {uploadLoading ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose files
                        </>
                      )}
                    </button>
                    <div id="upload-help" className="sr-only">
                      Upload PDF, DOC, DOCX, PNG, or JPG files up to 5MB each
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {uploadedFiles.map((file, index) => (
                          <p key={index} className="text-green-400 text-[clamp(11px,.7vw,12px)] flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Uploaded: {file.name}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {error && (
                      <div className="mt-3 p-2 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
                        {error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] p-5 h-full overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white flex items-center text-[clamp(16px,1.1vw,18px)]">
                    <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-[clamp(14px,.95vw,16px)]">
                    Your latest platform activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[clamp(14px,.95vw,16px)] truncate">New capability statement created</p>
                        <p className="text-slate-400 text-[clamp(12px,.8vw,14px)]">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[clamp(14px,.95vw,16px)] truncate">3 new contract matches found</p>
                        <p className="text-slate-400 text-[clamp(12px,.8vw,14px)]">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[clamp(14px,.95vw,16px)] truncate">Document uploaded successfully</p>
                        <p className="text-slate-400 text-[clamp(12px,.8vw,14px)]">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Profile Gating Banner */}
            {hasCompanyProfile === false && (
              <Card className="border-amber-500/20 bg-amber-500/5 rounded-2xl ring-1 ring-amber-500/20 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] p-5 mt-6">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-amber-100 mb-2">
                        Tell us about your company to get accurate matches
                      </h3>
                      <p className="text-amber-200/80 mb-4">
                        Upload your capability statement (PDF/DOC/DOCX) or build one in 3 minutes.
                      </p>
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleUploadCapabilityStatement}
                          disabled={uploadLoading || embeddingLoading}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {uploadLoading ? 'Uploading...' : embeddingLoading ? 'Processing...' : 'Upload Capability Statement'}
                        </Button>
                        <Button 
                          onClick={() => navigate('/capability-builder')}
                          variant="outline"
                          className="border-amber-500 text-amber-100 hover:bg-amber-500/10"
                        >
                          Create Capability Statement
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {showContracts && contracts.length > 0 && (
              <Card className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] p-5 mt-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center text-[clamp(16px,1.1vw,18px)]">
                    <Target className="w-5 h-5 mr-2 text-green-400" />
                    Available Government Contracts
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-[clamp(14px,.95vw,16px)]">
                    {hasCompanyProfile ? 'AI-matched opportunities based on your company profile' : 'Browse government contracts (complete profile for match scores)'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {contracts.map((contract, index) => (
                      <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-white font-semibold text-[clamp(14px,.95vw,16px)] flex-1 min-w-0 pr-4">{contract.title}</h3>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {hasCompanyProfile && contract.match_score !== null && contract.match_score !== undefined ? (
                              <Popover>
                                <div className="flex items-center gap-2">
                                  <span className="text-emerald-400 text-[clamp(12px,.8vw,14px)] font-semibold">
                                    {Math.round(contract.match_score * 100)}% Match
                                  </span>
                                  <PopoverTrigger asChild>
                                    <button className="text-xs text-slate-400 hover:text-slate-200 underline focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded">
                                      Why this match?
                                    </button>
                                  </PopoverTrigger>
                                </div>
                                <PopoverContent className="w-96 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100">
                                  {(() => {
                                    const matchDetails = contract.match_details || generateMockMatchDetails(contract.match_score)
                                    return (
                                      <div>
                                        <h4 className="font-semibold mb-3 text-slate-200">Match Score Breakdown</h4>
                                        {matchDetails.factors.map((factor, idx) => (
                                          <div key={idx} className="mb-3">
                                            <div className="flex justify-between text-sm text-slate-200 mb-1">
                                              <span>{factor.name}</span>
                                              <span>{Math.round(factor.contribution * 100)}%</span>
                                            </div>
                                            <div className="h-2 rounded bg-slate-800 overflow-hidden">
                                              <div 
                                                className="h-2 rounded bg-gradient-to-r from-emerald-500 to-teal-500" 
                                                style={{ width: `${factor.contribution * 100}%` }} 
                                              />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-400">
                                              Evidence: {factor.evidence.join(", ")}
                                            </p>
                                          </div>
                                        ))}
                                        {matchDetails.notes && (
                                          <p className="text-xs text-slate-500 mt-3 border-t border-slate-700 pt-2">
                                            {matchDetails.notes}
                                          </p>
                                        )}
                                        {!contract.match_details && (
                                          <p className="text-xs text-slate-500 mt-3 border-t border-slate-700 pt-2">
                                            No details provided by the source. Contact support if this persists.
                                          </p>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span 
                                className="text-sm text-slate-500 cursor-help" 
                                title="Complete your company profile to see matches"
                              >
                                — Match
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-300 text-[clamp(12px,.8vw,14px)] mb-2 line-clamp-2">{contract.description}</p>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div className="text-slate-400 text-[clamp(11px,.7vw,12px)]">
                            <span className="mr-4">Agency: {contract.agency}</span>
                            <span>Deadline: {contract.deadline}</span>
                          </div>
                          <div className="flex space-x-2 flex-shrink-0">
                            <Button
                              onClick={() => analyzeContract(contract)}
                              size="sm"
                              className="h-9 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:bg-slate-600 disabled:text-slate-400"
                              disabled={!hasCompanyProfile || analysisLoading}
                              title={!hasCompanyProfile ? "Complete your company profile first" : ""}
                            >
                              {analysisLoading ? (
                                <BarChart3 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <BarChart3 className="w-4 h-4 mr-1" />
                              )}
                              Analyze
                            </Button>
                            <Button
                              onClick={() => handleApplyToContract(contract)}
                              size="sm"
                              variant="secondary"
                              className="h-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:bg-slate-800 disabled:text-slate-500"
                              disabled={!hasCompanyProfile || !contract.apply_url}
                              title={!hasCompanyProfile ? "Complete your company profile first" : !contract.apply_url ? "Apply link not provided" : "Open application in new tab"}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Apply
                            </Button>
                          </div>
                        </div>
                        {contract.requirements && contract.requirements.length > 0 && (
                          <div className="mt-2">
                            <p className="text-slate-400 text-[clamp(11px,.7vw,12px)] mb-1">Requirements:</p>
                            <div className="flex flex-wrap gap-1">
                              {contract.requirements.map((req, reqIndex) => (
                                <span key={reqIndex} className="px-2 py-1 bg-white/10 rounded text-[clamp(10px,.65vw,11px)] text-slate-300">
                                  {req}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedContract && competitiveAnalysis && (
              <Card className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] p-5 mt-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center text-[clamp(16px,1.1vw,18px)]">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                    <span className="truncate">Competitive Analysis: {selectedContract.title}</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-[clamp(14px,.95vw,16px)]">
                    AI-powered analysis of your competitive position for this contract
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Sparkles className="w-6 h-6 text-teal-400 animate-spin mr-2" />
                      <span className="text-white text-[clamp(14px,.95vw,16px)]">Analyzing contract opportunity...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center">
                          <span className="text-white text-[clamp(16px,1.1vw,18px)] font-semibold mr-2">Match Score:</span>
                          <span className="text-green-400 text-[clamp(18px,1.25vw,22px)] font-bold">
                            {Math.round(competitiveAnalysis.match_score * 100)}%
                          </span>
                        </div>
                        <Button
                          onClick={() => createBidResponse()}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex-shrink-0"
                          disabled={bidLoading}
                        >
                          {bidLoading ? (
                            <>
                              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Create Bid Response
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="grid gap-[clamp(12px,1.2vw,24px)] grid-cols-1 lg:grid-cols-2">
                        <div>
                          <h4 className="text-white font-semibold mb-2 flex items-center text-[clamp(14px,.95vw,16px)]">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                            Strengths
                          </h4>
                          <ul className="space-y-2">
                            {competitiveAnalysis.strengths?.map((strength, index) => (
                              <li key={index} className="text-slate-300 text-[clamp(12px,.8vw,14px)] flex items-start">
                                <span className="text-green-400 mr-2 flex-shrink-0">•</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-white font-semibold mb-2 flex items-center text-[clamp(14px,.95vw,16px)]">
                            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
                            Areas to Address
                          </h4>
                          <ul className="space-y-2">
                            {competitiveAnalysis.gaps?.map((gap, index) => (
                              <li key={index} className="text-slate-300 text-[clamp(12px,.8vw,14px)] flex items-start">
                                <span className="text-yellow-400 mr-2 flex-shrink-0">•</span>
                                <span>{gap}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-white font-semibold mb-2 flex items-center text-[clamp(14px,.95vw,16px)]">
                          <Lightbulb className="w-4 h-4 mr-2 text-blue-400" />
                          Strategic Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {competitiveAnalysis.recommendations?.map((rec, index) => (
                            <li key={index} className="text-slate-300 text-[clamp(12px,.8vw,14px)] flex items-start">
                              <span className="text-blue-400 mr-2 flex-shrink-0">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-white font-semibold mb-2 text-[clamp(14px,.95vw,16px)]">Bid Strategy</h4>
                        <div className="bg-white/5 p-4 rounded-lg">
                          <p className="text-slate-300 text-[clamp(12px,.8vw,14px)] leading-relaxed">{competitiveAnalysis.bid_strategy}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard

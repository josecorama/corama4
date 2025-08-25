import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
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
  Coins
} from 'lucide-react'
import axios from 'axios'

interface DashboardStats {
  capability_statements: number
  active_searches: number
  contract_matches: number
  documents_uploaded: number
}



const Dashboard = () => {
  const { user, logout, token } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasCompanyProfile, setHasCompanyProfile] = useState<boolean | null>(null)
  const [embeddingLoading, setEmbeddingLoading] = useState(false)
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
      } catch (error: any) {
        if (error.response?.status === 404) {
          setHasCompanyProfile(false)
          console.log('No company profile found')
        } else {
          console.error('Error checking company profile:', error)
        }
      }
    }


    if (token) {
      fetchStats()
      checkCompanyProfile()
    }
  }, [token, user?.company])




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
                      <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded">5 credits</span>
                    </Button>
                  </Link>
                  <Link to="/contracts">
                    <Button 
                      variant="secondary"
                      className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 justify-start font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-[clamp(14px,.95vw,16px)]"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Browse Available Contracts
                      <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded">Free</span>
                    </Button>
                  </Link>
                  <Link to="/bid-response">
                    <Button variant="secondary" className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 justify-start font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-[clamp(14px,.95vw,16px)]">
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Bid Response
                      <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded">10 credits</span>
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
                          <span className="ml-2 text-xs bg-amber-500/20 px-2 py-1 rounded">5 credits</span>
                        </Button>
                      </div>
                    </div>
                  </div>
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

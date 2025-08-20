import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  Lightbulb,
  Coins
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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [competitiveAnalysis, setCompetitiveAnalysis] = useState<CompetitiveAnalysis | null>(null)
  const [showContracts, setShowContracts] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [bidLoading, setBidLoading] = useState(false)

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

    if (token) {
      fetchStats()
    }
  }, [token])

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
    if (!user?.company) {
      alert('Please update your company profile to get competitive analysis')
      return
    }

    setSelectedContract(contract)
    setAnalysisLoading(true)
    
    try {
      const response = await axios.post(`${API_BASE_URL}/contracts/analyze`, {
        contract_id: contract.id,
        contract_title: contract.title,
        contract_description: contract.description,
        contract_requirements: contract.requirements,
        company_name: user.company,
        company_capabilities: user.name // This should be expanded with actual capabilities
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setCompetitiveAnalysis(response.data)
    } catch (error) {
      console.error('Failed to analyze contract:', error)
      alert('Failed to analyze contract. Please try again.')
    } finally {
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

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="page-container bg-slate-900">
      <nav className="relative z-10 flex items-center justify-between w-full max-w-6xl mx-auto px-6 py-6 border-b border-white/10">
        <div className="flex items-center space-x-2">
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
            <span>{user?.name}</span>
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
            Logout
          </Button>
        </div>
      </nav>

      <main className="relative z-10 w-full px-6 py-8">
        <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-300 text-lg">
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">
                    Capability Statements
                  </CardTitle>
                  <FileText className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.capability_statements || 0}</div>
                  <p className="text-xs text-slate-300">
                    +2 from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">
                    Active Searches
                  </CardTitle>
                  <Search className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.active_searches || 0}</div>
                  <p className="text-xs text-slate-300">
                    +1 from last week
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">
                    Contract Matches
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.contract_matches || 0}</div>
                  <p className="text-xs text-slate-300">
                    +5 new this week
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">
                    Available Credits
                  </CardTitle>
                  <Coins className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{user?.credits || 0}</div>
                  <p className="text-xs text-slate-300">
                    Use for AI features
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-400" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Get started with your most common tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to="/capability-builder">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Capability Statement
                    </Button>
                  </Link>
                  <Button 
                    onClick={fetchContracts}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 justify-start font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Browse Available Contracts
                  </Button>
                  <Link to="/bid-response">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 justify-start font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Bid Response
                    </Button>
                  </Link>
                  <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 justify-start font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Documents
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Your latest platform activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-white text-sm">New capability statement created</p>
                        <p className="text-slate-400 text-xs">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-white text-sm">3 new contract matches found</p>
                        <p className="text-slate-400 text-xs">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-white text-sm">Document uploaded successfully</p>
                        <p className="text-slate-400 text-xs">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {showContracts && contracts.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 mt-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="w-5 h-5 mr-2 text-green-400" />
                    Available Government Contracts
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Browse and analyze contracts pulled from government databases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contracts.map((contract, index) => (
                      <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-white font-semibold">{contract.title}</h3>
                          <div className="flex items-center space-x-2">
                            <span className="text-green-400 text-sm font-medium">
                              {Math.round((contract.match_score || 0.8) * 100)}% Match
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{contract.description}</p>
                        <div className="flex justify-between items-center">
                          <div className="text-slate-400 text-xs">
                            <span className="mr-4">Agency: {contract.agency}</span>
                            <span>Deadline: {contract.deadline}</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => analyzeContract(contract)}
                              size="sm"
                              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              <BarChart3 className="w-4 h-4 mr-1" />
                              Analyze
                            </Button>
                            <Button
                              onClick={() => createBidResponse()}
                              size="sm"
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                              disabled={bidLoading}
                            >
                              {bidLoading ? (
                                <Sparkles className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-1" />
                              )}
                              Apply
                            </Button>
                          </div>
                        </div>
                        {contract.requirements && contract.requirements.length > 0 && (
                          <div className="mt-2">
                            <p className="text-slate-400 text-xs mb-1">Requirements:</p>
                            <div className="flex flex-wrap gap-1">
                              {contract.requirements.map((req, reqIndex) => (
                                <span key={reqIndex} className="px-2 py-1 bg-white/10 rounded text-xs text-slate-300">
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
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 mt-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                    Competitive Analysis: {selectedContract.title}
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    AI-powered analysis of your competitive position for this contract
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Sparkles className="w-6 h-6 text-teal-400 animate-spin mr-2" />
                      <span className="text-white">Analyzing contract opportunity...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-white text-lg font-semibold mr-2">Match Score:</span>
                          <span className="text-green-400 text-xl font-bold">
                            {Math.round(competitiveAnalysis.match_score * 100)}%
                          </span>
                        </div>
                        <Button
                          onClick={() => createBidResponse()}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-white font-semibold mb-2 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                            Strengths
                          </h4>
                          <ul className="space-y-2">
                            {competitiveAnalysis.strengths?.map((strength, index) => (
                              <li key={index} className="text-slate-300 text-sm flex items-start">
                                <span className="text-green-400 mr-2">•</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-white font-semibold mb-2 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
                            Areas to Address
                          </h4>
                          <ul className="space-y-2">
                            {competitiveAnalysis.gaps?.map((gap, index) => (
                              <li key={index} className="text-slate-300 text-sm flex items-start">
                                <span className="text-yellow-400 mr-2">•</span>
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-white font-semibold mb-2 flex items-center">
                          <Lightbulb className="w-4 h-4 mr-2 text-blue-400" />
                          Strategic Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {competitiveAnalysis.recommendations?.map((rec, index) => (
                            <li key={index} className="text-slate-300 text-sm flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-white font-semibold mb-2">Bid Strategy</h4>
                        <div className="bg-white/5 p-4 rounded-lg">
                          <p className="text-slate-300">{competitiveAnalysis.bid_strategy}</p>
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
      </main>
    </div>
  )
}

export default Dashboard

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { 
  ArrowLeft, 
  Sparkles, 
  Search, 
  Filter,
  Calendar,
  Building,
  Star,
  ExternalLink
} from 'lucide-react'
import axios from 'axios'

interface ContractMatch {
  id: string
  title: string
  description: string
  agency: string
  deadline: string
  match_score: number
  requirements: string[]
}

const ContractSearch = () => {
  const { token } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [contracts, setContracts] = useState<ContractMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:8000'

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(
        `${API_BASE_URL}/contracts/search`,
        { query: searchQuery },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      setContracts(response.data)
      setSearched(true)
    } catch (error) {
      console.error('Failed to search contracts:', error)
      alert('Failed to search contracts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-400'
    if (score >= 0.8) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const getMatchScoreText = (score: number) => {
    if (score >= 0.9) return 'Excellent Match'
    if (score >= 0.8) return 'Good Match'
    return 'Fair Match'
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
        <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <Search className="w-8 h-8 mr-3 text-purple-400" />
            Contract Search & Matching
          </h1>
          <p className="text-slate-300 text-lg">
            Discover government contracts that match your capabilities
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Search Government Contracts</CardTitle>
              <CardDescription className="text-slate-300">
                Enter keywords related to your services or industry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                    placeholder="e.g., software development, IT services, cybersecurity..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {searched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Search Results ({contracts.length} contracts found)
              </h2>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            <div className="space-y-6">
              {contracts.map((contract, index) => (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-2">
                            {contract.title}
                          </CardTitle>
                          <div className="flex items-center space-x-4 text-sm text-slate-300">
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              {contract.agency}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Deadline: {new Date(contract.deadline).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center ${getMatchScoreColor(contract.match_score)}`}>
                            <Star className="w-4 h-4 mr-1" />
                            <span className="font-semibold">{Math.round(contract.match_score * 100)}%</span>
                          </div>
                          <p className={`text-xs ${getMatchScoreColor(contract.match_score)}`}>
                            {getMatchScoreText(contract.match_score)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-300 mb-4 leading-relaxed">
                        {contract.description}
                      </p>
                      
                      <div className="mb-4">
                        <h4 className="text-white font-medium mb-2">Key Requirements:</h4>
                        <div className="flex flex-wrap gap-2">
                          {contract.requirements.map((req, reqIndex) => (
                            <span
                              key={reqIndex}
                              className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30"
                            >
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-slate-400">
                          Contract ID: {contract.id}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {contracts.length === 0 && (
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="text-center py-12">
                  <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">No contracts found</h3>
                  <p className="text-slate-300">
                    Try adjusting your search terms or check back later for new opportunities.
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {!searched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="text-center py-12">
                <Search className="w-16 h-16 text-blue-400 mx-auto mb-6" />
                <h3 className="text-white text-xl font-medium mb-4">
                  Ready to find your next opportunity?
                </h3>
                <p className="text-slate-300 mb-6">
                  Use our AI-powered search to discover government contracts that match your company's capabilities and expertise.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Search className="w-6 h-6 text-blue-400" />
                    </div>
                    <h4 className="text-white font-medium">Smart Search</h4>
                    <p className="text-slate-400 text-sm">AI-powered contract discovery</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Star className="w-6 h-6 text-purple-400" />
                    </div>
                    <h4 className="text-white font-medium">Match Scoring</h4>
                    <p className="text-slate-400 text-sm">See how well you fit each contract</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Calendar className="w-6 h-6 text-green-400" />
                    </div>
                    <h4 className="text-white font-medium">Deadline Tracking</h4>
                    <p className="text-slate-400 text-sm">Never miss an opportunity</p>
                  </div>
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

export default ContractSearch

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ArrowLeft, BarChart3, AlertCircle } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ContractAnalysis {
  contract_id: string
  match_score: number
  ai_analysis: string
  strengths: string[]
  gaps: string[]
  recommendations: string[]
  bid_strategy: string
}

const ContractAnalysis = () => {
  const { contractId } = useParams<{ contractId: string }>()
  const { user, token, fetchUserProfile } = useAuth()
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!contractId || !token) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.post(`${API_BASE_URL}/contracts/analyze`, {
        contract_id: contractId,
        contract_title: "Government Contract",
        contract_description: "Contract analysis request",
        contract_requirements: ["Government contracting experience"],
        company_name: user?.company || "Your Company",
        company_capabilities: "Professional services"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setAnalysis(response.data)
      
      if (fetchUserProfile && token) {
        await fetchUserProfile(token)
      }
    } catch (error: any) {
      console.error('Failed to analyze contract:', error)
      setError(error.response?.data?.detail || 'Failed to analyze contract')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container bg-slate-900 min-h-screen w-full">
      <nav className="flex items-center justify-between w-full max-w-6xl mx-auto px-6 py-6 border-b border-white/10">
        <Link to="/contracts" className="text-white hover:text-blue-400 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Contract Analysis</h1>
        <div></div>
      </nav>

      <main className="w-full max-w-6xl mx-auto px-6 py-8">
        {!analysis && !loading && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Competitive Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">
                Get AI-powered competitive analysis for this contract opportunity.
              </p>
              <Button
                onClick={handleAnalyze}
                disabled={loading || !user || user.credits < 2}
                className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
              >
                {loading ? 'Analyzing...' : 'Analyze Contract (2 credits)'}
              </Button>
              {user && user.credits < 2 && (
                <p className="text-red-400 text-sm mt-2">
                  Insufficient credits. You need 2 credits for contract analysis.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="bg-red-900/20 border-red-500/20 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center text-red-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Match Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">
                  {Math.round(analysis.match_score * 100)}% Match
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 whitespace-pre-wrap">{analysis.ai_analysis}</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="text-slate-300 flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Areas to Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.gaps.map((gap, index) => (
                      <li key={index} className="text-slate-300 flex items-start">
                        <span className="text-yellow-400 mr-2">•</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Strategic Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="text-slate-300 flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Bid Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">{analysis.bid_strategy}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

export default ContractAnalysis

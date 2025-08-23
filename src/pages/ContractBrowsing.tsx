import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Search, ExternalLink, BarChart3, Building2, Calendar, DollarSign, MapPin, Award } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
  naics?: string[]
  location?: string
  set_aside?: string
}

interface MatchFactor {
  name: string
  weight: number
  value: number
  contribution: number
  evidence: string[]
}

const ContractBrowsing = () => {
  const { token } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    agency: '',
    naics: '',
    minMatch: 0
  })
  const [hasProfile, setHasProfile] = useState(false)

  const fetchContracts = async (query = '', limit = 20) => {
    try {
      setLoading(true)
      const response = await axios.post(`${API_BASE_URL}/contracts/search`, {
        query: query || 'government contracts',
        limit
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setContracts(response.data || [])
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/company-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHasProfile(!!response.data)
    } catch (error) {
      setHasProfile(false)
    }
  }

  const getMatchFactors = async (contractId: string): Promise<MatchFactor[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/contracts/${contractId}/match`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data.factors || []
    } catch (error) {
      return []
    }
  }

  useEffect(() => {
    if (token) {
      checkProfile()
      fetchContracts()
    }
  }, [token])

  const handleSearch = () => {
    fetchContracts(searchQuery)
  }

  const handleAnalyze = (contractId: string) => {
    window.location.href = `/contracts/${contractId}/analyze`
  }

  const handleApply = (applyUrl: string) => {
    if (applyUrl) {
      window.open(applyUrl, '_blank')
    }
  }

  const MatchScorePopover = ({ contract }: { contract: Contract }) => {
    const [factors, setFactors] = useState<MatchFactor[]>([])
    const [factorsLoading, setFactorsLoading] = useState(false)

    const loadFactors = async () => {
      setFactorsLoading(true)
      const matchFactors = await getMatchFactors(contract.id)
      setFactors(matchFactors)
      setFactorsLoading(false)
    }

    return (
      <Popover>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-emerald-400">
            {contract.match_score ? `${Math.round(contract.match_score * 100)}% Match` : '—'}
          </span>
          {hasProfile && contract.match_score && (
            <PopoverTrigger 
              className="text-xs underline text-slate-400 hover:text-slate-300"
              onClick={loadFactors}
            >
              Why this match?
            </PopoverTrigger>
          )}
          {!hasProfile && (
            <span className="text-xs text-slate-500" title="Complete your company profile to see matches">
              Complete profile for matches
            </span>
          )}
        </div>
        <PopoverContent className="w-96 bg-slate-900 border border-slate-700 rounded-xl p-4">
          {factorsLoading ? (
            <div className="text-center text-slate-400">Loading match details...</div>
          ) : factors.length > 0 ? (
            <>
              {factors.map((factor, index) => (
                <div key={index} className="mb-3">
                  <div className="flex justify-between text-sm text-slate-200">
                    <span>{factor.name}</span>
                    <span>{Math.round(factor.contribution * 100)}%</span>
                  </div>
                  <div className="h-2 rounded bg-slate-800 mt-1">
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
              <p className="text-xs text-slate-500 mt-2">
                Weights configurable in Admin. Scores are guidance, not guarantees.
              </p>
            </>
          ) : (
            <div className="text-sm text-slate-400">
              No details provided by the source. Contact support if this persists.
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="w-full max-w-none px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Browse Government Contracts</h1>
          <p className="text-slate-400">Discover opportunities matched to your company profile</p>
        </div>

        <div className="mb-6 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search contracts by title, agency, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-400"
            />
          </div>
          <Button 
            onClick={handleSearch}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <Input
            placeholder="Filter by agency..."
            value={filters.agency}
            onChange={(e) => setFilters(prev => ({ ...prev, agency: e.target.value }))}
            className="w-48 bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-400"
          />
          <Input
            placeholder="Filter by NAICS code..."
            value={filters.naics}
            onChange={(e) => setFilters(prev => ({ ...prev, naics: e.target.value }))}
            className="w-48 bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-400"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-slate-400">Loading contracts...</div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400">No contracts found. Try adjusting your search criteria.</div>
          </div>
        ) : (
          <div className="grid gap-6">
            {contracts.map((contract) => (
              <Card key={contract.id} className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-white mb-2">{contract.title}</CardTitle>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {contract.agency}
                        </div>
                        {contract.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Due: {new Date(contract.deadline).toLocaleDateString()}
                          </div>
                        )}
                        {contract.value && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {contract.value}
                          </div>
                        )}
                        {contract.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {contract.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <MatchScorePopover contract={contract} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 mb-4 line-clamp-3">{contract.description}</p>
                  
                  {contract.naics && contract.naics.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm text-slate-400 mb-2">NAICS Codes:</div>
                      <div className="flex flex-wrap gap-2">
                        {contract.naics.map((naics, index) => (
                          <span key={index} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                            {naics}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {contract.set_aside && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-emerald-400">{contract.set_aside}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={() => handleAnalyze(contract.id)}
                      disabled={!hasProfile}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-700 disabled:text-slate-500"
                      title={!hasProfile ? "Complete your company profile first" : "Analyze this contract"}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analyze
                    </Button>
                    <Button
                      onClick={() => handleApply(contract.apply_url || '')}
                      disabled={!hasProfile || !contract.apply_url}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-700 disabled:text-slate-500"
                      title={!hasProfile ? "Complete your company profile first" : !contract.apply_url ? "No application URL available" : "Apply for this contract"}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ContractBrowsing

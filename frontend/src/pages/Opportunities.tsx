import { useState, useEffect } from 'react'
import { Search, Calendar, DollarSign, MapPin, ExternalLink, Star } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import { FiltersPopover } from '../components/ui/filters-popover'
import { apiClient } from '../lib/api'
import type { Opportunity, Score } from '../types'

const Opportunities = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [scores, setScores] = useState<Record<number, Score>>({})
  const [advancedFilters, setAdvancedFilters] = useState({})

  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchOpportunities = async () => {
    try {
      const data = await apiClient.getOpportunities({
        source: sourceFilter || undefined,
      })
      setOpportunities(data as Opportunity[])
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScore = async (opportunityId: number) => {
    try {
      const score = await apiClient.scoreOpportunity(opportunityId)
      setScores(prev => ({ ...prev, [opportunityId]: score }))
    } catch (error) {
      console.error('Error scoring opportunity:', error)
    }
  }

  const getDayStatus = (dDayStatus?: string) => {
    const statusConfig = {
      'overdue': { color: 'bg-red-100 text-red-800', text: 'Vencido' },
      'due_today': { color: 'bg-red-100 text-red-800', text: 'Vence Hoy' },
      'd_minus_1': { color: 'bg-orange-100 text-orange-800', text: 'D-1' },
      'd_minus_3': { color: 'bg-yellow-100 text-yellow-800', text: 'D-3' },
      'd_minus_7': { color: 'bg-blue-100 text-blue-800', text: 'D-7' },
      'd_minus_14': { color: 'bg-gray-100 text-gray-800', text: 'D-14' },
      'normal': { color: 'bg-green-100 text-green-800', text: 'Normal' },
    }
    
    return statusConfig[dDayStatus as keyof typeof statusConfig] || statusConfig.normal
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success'
    if (score >= 50) return 'text-warning'
    return 'text-destructive'
  }

  const filteredOpportunities = opportunities.filter(opp =>
    opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.buyer?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pb-4 mb-6">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-2xl font-bold text-foreground">Licitaciones Michoacán</h1>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 min-w-[160px]">
            Sincronizar Fuentes
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar oportunidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
            />
          </div>
          
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
          >
            <option value="">Todas las fuentes</option>
            <option value="michoacan">Gobierno de Michoacán</option>
            <option value="morelia">Ayuntamiento de Morelia</option>
            <option value="umsnh">UMSNH</option>
            <option value="imss">IMSS/ISSSTE</option>
            <option value="private">Sector Privado</option>
          </select>

          <FiltersPopover 
            onFiltersChange={setAdvancedFilters}
            currentFilters={advancedFilters}
          />
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4 [content-visibility:auto]">
        {filteredOpportunities.map((opportunity) => {
          const dayStatus = getDayStatus(opportunity.d_day_status)
          const score = scores[opportunity.id]
          
          return (
            <div key={opportunity.id} className="bg-card rounded-lg shadow hover:shadow-md transition-shadow min-h-[88px]">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-foreground">{opportunity.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${dayStatus.color}`}>
                        {dayStatus.text}
                      </span>
                      {score && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full bg-gray-100 ${getScoreColor(score.total_score)}`}>
                          Score: {score.total_score.toFixed(1)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground mb-3">{opportunity.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <span className="font-medium">{opportunity.buyer}</span>
                      </div>
                      
                      {opportunity.budget && (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>${opportunity.budget.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {opportunity.delivery_location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{opportunity.delivery_location}</span>
                        </div>
                      )}
                      
                      {opportunity.due_date && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Vence: {new Date(opportunity.due_date).toLocaleDateString('es-ES')}</span>
                        </div>
                      )}
                    </div>
                    
                    {opportunity.naics && opportunity.naics.length > 0 && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          {opportunity.naics.map((naics, index) => (
                            <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                              NAICS {naics}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleScore(opportunity.id)}
                      className="flex items-center px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm"
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Evaluar
                    </button>
                    
                    {opportunity.docs && opportunity.docs.length > 0 && (
                      <a
                        href={opportunity.docs[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-3 py-2 border border-border rounded-lg hover:bg-muted text-sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver RFP
                      </a>
                    )}
                  </div>
                </div>
                
                {score && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Evaluación Bid/No-Bid</h4>
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Técnico:</span>
                        <span className="ml-1 font-medium">{score.breakdown.technical.toFixed(1)}/30</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Económico:</span>
                        <span className="ml-1 font-medium">{score.breakdown.economic.toFixed(1)}/25</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Operativo:</span>
                        <span className="ml-1 font-medium">{score.breakdown.operational.toFixed(1)}/15</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cumplimiento:</span>
                        <span className="ml-1 font-medium">{score.breakdown.compliance.toFixed(1)}/15</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estrategia:</span>
                        <span className="ml-1 font-medium">{score.breakdown.strategy.toFixed(1)}/15</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className={`font-medium ${
                        score.recommendation === 'BID' ? 'text-success' :
                        score.recommendation === 'REVIEW' ? 'text-warning' : 'text-destructive'
                      }`}>
                        Recomendación: {score.recommendation}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {filteredOpportunities.length === 0 && (
        <section className="flex h-[420px] items-center justify-center rounded-xl border border-border">
          <div className="text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No se encontraron oportunidades</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Intenta ajustar los filtros o sincronizar las fuentes.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

export default Opportunities

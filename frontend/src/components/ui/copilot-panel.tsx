import { useState } from 'react'
import { Bot, ChevronRight, ExternalLink, AlertCircle, CheckCircle, X, Lightbulb } from 'lucide-react'

interface CopilotPanelProps {
  isOpen: boolean
  onClose: () => void
  currentLanguage: 'es' | 'en'
  context?: {
    page: string
    data?: any
  }
}

interface Suggestion {
  id: string
  title: string
  description: string
  action: string
  confidence: 'high' | 'medium' | 'low'
  type: 'action' | 'insight' | 'warning'
}

interface Source {
  title: string
  url: string
  type: 'portal' | 'document' | 'regulation'
}

const CopilotPanel = ({ isOpen, onClose, currentLanguage, context }: CopilotPanelProps) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'sources' | 'checklist'>('suggestions')

  const t = {
    es: {
      title: 'Copiloto IA',
      tabs: {
        suggestions: 'Sugerencias',
        sources: 'Fuentes',
        checklist: 'Checklist'
      },
      confidence: {
        high: 'Alta confianza',
        medium: 'Confianza media',
        low: 'Baja confianza'
      },
      actions: {
        apply: 'Aplicar',
        viewMore: 'Ver más',
        dismiss: 'Descartar'
      },
      noData: 'No hay sugerencias disponibles',
      compliance: {
        title: 'Cumplimiento Michoacán',
        items: [
          'Registro en Padrón de Proveedores',
          'Opinión de Cumplimiento SAT',
          'Constancia IMSS/INFONAVIT',
          'Certificado de No Adeudos',
          'Póliza de Responsabilidad Civil'
        ]
      }
    },
    en: {
      title: 'AI Copilot',
      tabs: {
        suggestions: 'Suggestions',
        sources: 'Sources',
        checklist: 'Checklist'
      },
      confidence: {
        high: 'High confidence',
        medium: 'Medium confidence',
        low: 'Low confidence'
      },
      actions: {
        apply: 'Apply',
        viewMore: 'View more',
        dismiss: 'Dismiss'
      },
      noData: 'No suggestions available',
      compliance: {
        title: 'Michoacán Compliance',
        items: [
          'Supplier Registry',
          'SAT Compliance Opinion',
          'IMSS/INFONAVIT Certificate',
          'No Debt Certificate',
          'Civil Liability Policy'
        ]
      }
    }
  }

  const getSuggestions = (): Suggestion[] => {
    if (!context) return []

    switch (context.page) {
      case 'opportunities':
        return [
          {
            id: '1',
            title: 'Filtrar por Michoacán',
            description: 'Mostrar solo licitaciones del Gobierno de Michoacán y Ayuntamiento de Morelia',
            action: 'filter_michoacan',
            confidence: 'high',
            type: 'action'
          },
          {
            id: '2',
            title: 'Verificar documentos SAT',
            description: 'Asegúrate de tener tu Opinión de Cumplimiento SAT actualizada',
            action: 'check_sat',
            confidence: 'medium',
            type: 'warning'
          },
          {
            id: '3',
            title: 'Próximas juntas de aclaraciones',
            description: 'Hay 3 juntas de aclaraciones esta semana en dependencias estatales',
            action: 'view_meetings',
            confidence: 'high',
            type: 'insight'
          }
        ]
      case 'quoter':
        return [
          {
            id: '1',
            title: 'Preset para obra pública',
            description: 'Usar configuración estándar para señalética de obra pública en Michoacán',
            action: 'apply_preset',
            confidence: 'high',
            type: 'action'
          },
          {
            id: '2',
            title: 'Incluir IVA 16%',
            description: 'Agregar IVA automáticamente para cotizaciones gubernamentales',
            action: 'add_iva',
            confidence: 'high',
            type: 'action'
          }
        ]
      default:
        return []
    }
  }

  const getSources = (): Source[] => {
    return [
      {
        title: 'Portal de Compras Michoacán',
        url: 'https://compras.michoacan.gob.mx',
        type: 'portal'
      },
      {
        title: 'Sistema Municipal Morelia',
        url: 'https://morelia.gob.mx/licitaciones',
        type: 'portal'
      },
      {
        title: 'Ley de Compras Públicas Michoacán',
        url: '#',
        type: 'regulation'
      }
    ]
  }

  const suggestions = getSuggestions()
  const sources = getSources()

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-success bg-success/10'
      case 'medium': return 'text-warning bg-warning/10'
      case 'low': return 'text-destructive bg-destructive/10'
      default: return 'text-muted-foreground bg-muted'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'action': return <ChevronRight className="h-4 w-4" />
      case 'insight': return <Lightbulb className="h-4 w-4" />
      case 'warning': return <AlertCircle className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="w-full h-full bg-card shadow-lg border-l border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">{t[currentLanguage].title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex border-b border-border">
        {(['suggestions', 'sources', 'checklist'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t[currentLanguage].tabs[tab]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <div key={suggestion.id} className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow min-h-[96px]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(suggestion.type)}
                      <h3 className="font-medium text-foreground text-sm">{suggestion.title}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                      {t[currentLanguage].confidence[suggestion.confidence]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-lg hover:opacity-90 transition-colors">
                      {t[currentLanguage].actions.apply}
                    </button>
                    <button className="px-3 py-1 text-muted-foreground text-xs hover:text-foreground transition-colors">
                      {t[currentLanguage].actions.dismiss}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm">{t[currentLanguage].noData}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-3">
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground text-sm">{source.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{source.type}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
            ))}
          </div>
        )}

        {activeTab === 'checklist' && (
          <div>
            <h3 className="font-medium text-foreground mb-4">{t[currentLanguage].compliance.title}</h3>
            <div className="space-y-3">
              {t[currentLanguage].compliance.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-border rounded"></div>
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CopilotPanel

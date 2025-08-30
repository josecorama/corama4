import { useState, useEffect, useCallback } from 'react'
import { Search, FileText, Calculator, Users, BarChart3, Building2, MapPin } from 'lucide-react'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  currentLanguage: 'es' | 'en'
}

interface Command {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
  category: string
}

const CommandPalette = ({ isOpen, onClose, currentLanguage }: CommandPaletteProps) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const t = {
    es: {
      placeholder: '¿Qué necesitas hacer hoy? p. ej., Buscar licitaciones del Ayuntamiento de Morelia...',
      categories: {
        navigation: 'Navegación',
        actions: 'Acciones Rápidas',
        search: 'Búsquedas',
        templates: 'Plantillas'
      },
      commands: {
        dashboard: 'Panel Principal',
        opportunities: 'Oportunidades Michoacán',
        quoter: 'Cotizador Inteligente',
        pipeline: 'Pipeline de Ventas',
        proposals: 'Propuestas',
        settings: 'Configuración',
        searchMorelia: 'Buscar licitaciones Morelia',
        searchMichoacan: 'Buscar contratos Gobierno de Michoacán',
        quoteVinyl: 'Cotizar vinil para vehículos',
        quoteBanner: 'Cotizar lona 13 oz',
        generateCFDI: 'Generar CFDI 4.0',
        downloadBases: 'Descargar bases de licitación'
      }
    },
    en: {
      placeholder: 'What do you need to do today? e.g., Search Morelia municipality bids...',
      categories: {
        navigation: 'Navigation',
        actions: 'Quick Actions',
        search: 'Searches',
        templates: 'Templates'
      },
      commands: {
        dashboard: 'Main Dashboard',
        opportunities: 'Michoacán Opportunities',
        quoter: 'Smart Quoter',
        pipeline: 'Sales Pipeline',
        proposals: 'Proposals',
        settings: 'Settings',
        searchMorelia: 'Search Morelia bids',
        searchMichoacan: 'Search Michoacán Government contracts',
        quoteVinyl: 'Quote vehicle vinyl',
        quoteBanner: 'Quote 13 oz banner',
        generateCFDI: 'Generate CFDI 4.0',
        downloadBases: 'Download bid documents'
      }
    }
  }

  const commands: Command[] = [
    {
      id: 'dashboard',
      title: t[currentLanguage].commands.dashboard,
      subtitle: 'KPIs y métricas principales',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => window.location.href = '/',
      category: t[currentLanguage].categories.navigation
    },
    {
      id: 'opportunities',
      title: t[currentLanguage].commands.opportunities,
      subtitle: 'Licitaciones públicas y privadas',
      icon: <FileText className="h-4 w-4" />,
      action: () => window.location.href = '/opportunities',
      category: t[currentLanguage].categories.navigation
    },
    {
      id: 'quoter',
      title: t[currentLanguage].commands.quoter,
      subtitle: 'Cotizaciones instantáneas',
      icon: <Calculator className="h-4 w-4" />,
      action: () => window.location.href = '/quoter',
      category: t[currentLanguage].categories.navigation
    },
    {
      id: 'pipeline',
      title: t[currentLanguage].commands.pipeline,
      subtitle: 'Gestión de deals y seguimiento',
      icon: <Users className="h-4 w-4" />,
      action: () => window.location.href = '/pipeline',
      category: t[currentLanguage].categories.navigation
    },
    {
      id: 'search-morelia',
      title: t[currentLanguage].commands.searchMorelia,
      subtitle: 'Ayuntamiento de Morelia',
      icon: <Building2 className="h-4 w-4" />,
      action: () => console.log('Search Morelia'),
      category: t[currentLanguage].categories.search
    },
    {
      id: 'search-michoacan',
      title: t[currentLanguage].commands.searchMichoacan,
      subtitle: 'Dependencias estatales',
      icon: <MapPin className="h-4 w-4" />,
      action: () => console.log('Search Michoacán'),
      category: t[currentLanguage].categories.search
    },
    {
      id: 'quote-vinyl',
      title: t[currentLanguage].commands.quoteVinyl,
      subtitle: 'Vinil cast para rotulación',
      icon: <Calculator className="h-4 w-4" />,
      action: () => window.location.href = '/quoter?preset=vinyl',
      category: t[currentLanguage].categories.actions
    },
    {
      id: 'quote-banner',
      title: t[currentLanguage].commands.quoteBanner,
      subtitle: 'Lona para exteriores',
      icon: <Calculator className="h-4 w-4" />,
      action: () => window.location.href = '/quoter?preset=banner',
      category: t[currentLanguage].categories.actions
    }
  ]

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(query.toLowerCase()) ||
    command.subtitle?.toLowerCase().includes(query.toLowerCase())
  )

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
        break
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = []
    }
    acc[command.category].push(command)
    return acc
  }, {} as Record<string, Command[]>)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed left-1/2 top-1/4 -translate-x-1/2 w-full max-w-2xl mx-4">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center px-4 py-3 border-b border-gray-100">
            <Search className="h-5 w-5 text-gray-400 mr-3" />
            <input
              type="text"
              placeholder={t[currentLanguage].placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-lg bg-transparent outline-none placeholder-gray-400"
              autoFocus
            />
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded">
              ESC
            </kbd>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                  {category}
                </div>
                {categoryCommands.map((command) => {
                  const globalIndex = filteredCommands.indexOf(command)
                  return (
                    <button
                      key={command.id}
                      onClick={() => {
                        command.action()
                        onClose()
                      }}
                      className={`w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-b-0 ${
                        globalIndex === selectedIndex ? 'bg-blue-50 border-blue-100' : ''
                      }`}
                    >
                      <div className="mr-3 text-gray-400">
                        {command.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{command.title}</div>
                        {command.subtitle && (
                          <div className="text-sm text-gray-500">{command.subtitle}</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No se encontraron comandos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommandPalette

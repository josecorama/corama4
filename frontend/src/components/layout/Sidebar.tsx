import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Search, 
  Calculator, 
  FileText, 
  TrendingUp, 
  Settings,
  X
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  currentLanguage: 'es' | 'en'
}

const Sidebar = ({ isOpen, onClose, currentLanguage }: SidebarProps) => {
  const location = useLocation()

  const texts = {
    es: {
      dashboard: 'Panel Principal',
      opportunities: 'Licitaciones Michoacán',
      quoter: 'Cotizador Inteligente',
      proposals: 'Propuestas Gobierno',
      pipeline: 'Pipeline Ventas',
      settings: 'Configuración'
    },
    en: {
      dashboard: 'Dashboard',
      opportunities: 'Michoacán Opportunities',
      quoter: 'Smart Quoter',
      proposals: 'Government Proposals',
      pipeline: 'Sales Pipeline',
      settings: 'Settings'
    }
  }

  const t = texts[currentLanguage]

  const navigation = [
    { name: t.dashboard, href: '/', icon: LayoutDashboard },
    { name: t.opportunities, href: '/opportunities', icon: Search },
    { name: t.quoter, href: '/quoter', icon: Calculator },
    { name: t.proposals, href: '/proposals', icon: FileText },
    { name: t.pipeline, href: '/pipeline', icon: TrendingUp },
    { name: t.settings, href: '/settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 lg:hidden">
          <span className="text-lg font-semibold text-gray-900">Menu</span>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-16 lg:mt-8 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => onClose()}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}

export default Sidebar

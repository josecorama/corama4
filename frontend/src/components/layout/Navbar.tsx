import { Menu, Globe, Bell, User, Command, Bot } from 'lucide-react'
import { ThemeToggle } from '../ui/theme-toggle'

interface NavbarProps {
  onMenuClick: () => void
  onCopilotClick: () => void
  onCommandClick: () => void
  currentLanguage: 'es' | 'en'
  onLanguageChange: (lang: 'es' | 'en') => void
}

const Navbar = ({ onMenuClick, onCopilotClick, onCommandClick, currentLanguage, onLanguageChange }: NavbarProps) => {
  const texts = {
    es: {
      title: 'Impresiones Gráficas Pro',
      notifications: 'Notificaciones',
      profile: 'Perfil'
    },
    en: {
      title: 'Graphic Printing Pro',
      notifications: 'Notifications',
      profile: 'Profile'
    }
  }

  const t = texts[currentLanguage]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex-shrink-0 flex items-center ml-4 lg:ml-0">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IM</span>
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-900 hidden sm:block">
                Impresiones Morelia
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={onCommandClick}
              className="hidden sm:flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Comando rápido (Cmd/Ctrl+K)"
            >
              <Command className="h-4 w-4" />
              <span className="text-sm">⌘K</span>
            </button>
            
            <button
              onClick={onCopilotClick}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Asistente IA"
            >
              <Bot className="h-5 w-5" />
            </button>
            
            <ThemeToggle />

            <button
              onClick={() => onLanguageChange(currentLanguage === 'es' ? 'en' : 'es')}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              title="Change Language"
            >
              <Globe className="h-5 w-5" />
              <span className="ml-1 text-sm font-medium">
                {currentLanguage.toUpperCase()}
              </span>
            </button>

            <button
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative"
              title={t.notifications}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            <button
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              title={t.profile}
            >
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

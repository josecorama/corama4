import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

interface HeaderProps {
  credits?: number
}

const Header = ({ credits: propCredits }: HeaderProps) => {
  const [credits, setCredits] = useState(propCredits ?? 0)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const user = await api.getUser()
      setCredits(user.credits_balance)
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const handleLogout = () => {
    api.logout()
  }

  return (
    <header className="h-14 lg:h-16 bg-corama-dark border-b border-corama-darker flex items-center justify-between px-4 lg:px-6 ml-0 lg:ml-0">
      {/* CORAMA Logo - links to landing page */}
      <Link to="/app" className="flex items-center">
        <img 
          src="/static/app/dashboard/CoramaLogo.svg" 
          alt="CORAMA" 
          className="h-8 lg:h-10 w-auto"
        />
      </Link>
      
      {/* Search - hidden on mobile, visible on tablet+ */}
      <div className="hidden md:block flex-1 max-w-md lg:max-w-2xl mx-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="SEARCH IN CORAMA"
            className="w-full bg-corama-darker border border-corama-teal/30 rounded-full py-2 lg:py-2.5 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-corama-teal transition-colors text-sm"
          />
        </div>
      </div>
      
      {/* Mobile search icon */}
      <button className="md:hidden p-2 text-gray-400 hover:text-white">
        <Search size={20} />
      </button>
      
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        <Link to="/get-more-credits" className="flex items-center gap-1 sm:gap-2 text-white hover:text-corama-teal transition-colors">
          <img src="/static/app/dashboard/Credits.svg" alt="" className="h-5 w-5" aria-hidden="true" />
          <span className="font-poppins text-xs sm:text-sm">{credits}</span>
          <span className="hidden sm:inline font-poppins text-xs sm:text-sm">Credits</span>
        </Link>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-1 sm:gap-2 text-white hover:text-corama-teal transition-colors"
        >
          <img src="/static/app/dashboard/LogOut.svg" alt="" className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline font-poppins text-xs sm:text-sm">Log Out</span>
        </button>
        
        <button className="flex items-center gap-1 sm:gap-2 text-white hover:text-corama-teal transition-colors">
          <img src="/static/app/dashboard/settings.svg" alt="" className="h-5 w-5" aria-hidden="true" />
          <span className="hidden lg:inline font-poppins text-sm">Settings</span>
        </button>
      </div>
    </header>
  )
}

export default Header

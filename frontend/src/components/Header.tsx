import { useEffect, useState } from 'react'
import { Search, Coins, LogOut, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

interface HeaderProps {
  credits?: number
}

const Header = ({ credits: propCredits }: HeaderProps) => {
  const [credits, setCredits] = useState(propCredits ?? 0)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const user = await api.getUser()
      setCredits(user.credits_balance)
      setUserName(user.first_name || user.email.split('@')[0])
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const handleLogout = () => {
    api.logout()
  }

  return (
    <header className="h-14 lg:h-16 bg-corama-dark border-b border-corama-darker flex items-center justify-between px-4 lg:px-6 ml-0 lg:ml-0">
      {/* Spacer for mobile menu button */}
      <div className="w-10 lg:hidden"></div>
      
      {/* Search - hidden on mobile, visible on tablet+ */}
      <div className="hidden md:block flex-1 max-w-md lg:max-w-2xl">
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
        {userName && (
          <span className="hidden sm:inline text-gray-400 font-poppins text-xs sm:text-sm">
            Hi, {userName}
          </span>
        )}
        <Link to="/get-more-credits" className="flex items-center gap-1 sm:gap-2 text-white hover:text-corama-teal transition-colors">
          <Coins size={18} className="text-corama-teal" />
          <span className="font-poppins text-xs sm:text-sm">{credits}</span>
          <span className="hidden sm:inline font-poppins text-xs sm:text-sm">Credits</span>
        </Link>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-1 sm:gap-2 text-white hover:text-corama-teal transition-colors"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline font-poppins text-xs sm:text-sm">Log Out</span>
        </button>
        
        <button className="flex items-center gap-1 sm:gap-2 text-white hover:text-corama-teal transition-colors">
          <Settings size={18} />
          <span className="hidden lg:inline font-poppins text-sm">Settings</span>
        </button>
      </div>
    </header>
  )
}

export default Header

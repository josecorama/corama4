import { useEffect, useState, useRef } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

interface HeaderProps {
  credits?: number
}

const CREDITS_CACHE_KEY = 'corama_credits_cache'
const CREDITS_ANIMATED_KEY = 'corama_credits_animated'

const useCountUp = (targetValue: number | null, duration: number = 800) => {
  const [displayValue, setDisplayValue] = useState<number | null>(null)
  const hasAnimatedRef = useRef(false)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (targetValue === null) {
      setDisplayValue(null)
      return
    }

    const alreadyAnimated = sessionStorage.getItem(CREDITS_ANIMATED_KEY) === 'true'
    
    if (alreadyAnimated || hasAnimatedRef.current) {
      setDisplayValue(targetValue)
      return
    }

    hasAnimatedRef.current = true
    sessionStorage.setItem(CREDITS_ANIMATED_KEY, 'true')

    const startTime = performance.now()
    const startValue = 0

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const easeOutQuad = 1 - (1 - progress) * (1 - progress)
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuad)
      
      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetValue, duration])

  return displayValue
}

const Header = ({ credits: propCredits }: HeaderProps) => {
  const [credits, setCredits] = useState<number | null>(() => {
    if (typeof window === 'undefined') return propCredits ?? null
    const cached = sessionStorage.getItem(CREDITS_CACHE_KEY)
    if (cached !== null) {
      const parsed = parseInt(cached, 10)
      return isNaN(parsed) ? propCredits ?? null : parsed
    }
    return propCredits ?? null
  })

  const displayCredits = useCountUp(credits)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const user = await api.getUser()
      setCredits(user.credits_balance)
      sessionStorage.setItem(CREDITS_CACHE_KEY, String(user.credits_balance))
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const handleLogout = () => {
    api.logout()
  }

  return (
    <header className="sticky top-0 z-30 h-20 lg:h-16 bg-corama-dark border-b border-corama-darker">
      <div className="flex items-center h-full">
        {/* Desktop: Logo column - matches sidebar width (w-64), centered within */}
        <div className="hidden lg:flex items-center justify-center w-64 h-full shrink-0">
          <a href="/" className="inline-flex items-center">
            <img 
              src="/static/app/dashboard/CoramaLogo.svg" 
              alt="CORAMA" 
              className="h-10 w-auto"
            />
          </a>
        </div>
        
        {/* Mobile: Menu button + Logo */}
        <div className="lg:hidden flex items-center h-full pl-2">
          {/* Menu button with label - reserves space for the sidebar hamburger button */}
          <div className="flex flex-col items-center justify-center w-12 flex-shrink-0">
            {/* The actual hamburger button is rendered by the Sidebar component */}
            <div className="w-8 h-8"></div>
            <span className="text-white font-poppins text-[10px] mt-0.5">Menu</span>
          </div>
          <a href="/" className="inline-flex items-center ml-1">
            <img 
              src="/static/app/dashboard/CoramaLogo.svg" 
              alt="CORAMA" 
              className="h-7 sm:h-8 w-auto"
            />
          </a>
        </div>
        
        {/* Desktop: Main header content */}
        <div className="hidden lg:flex flex-1 items-center justify-between px-6">
          {/* Search */}
          <div className="flex flex-1 min-w-0" style={{ marginRight: '8px' }}>
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="SEARCH"
                className="w-full rounded-full py-2.5 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none transition-colors text-sm"
                style={{ backgroundColor: 'rgb(19, 41, 71)', border: '1px solid rgb(60, 87, 114)' }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6 flex-shrink-0">
            <Link to="/get-more-credits" className="flex items-center gap-2 text-white hover:text-corama-teal transition-colors">
              <img src="/static/app/dashboard/Credits.svg" alt="" className="h-5 w-5" aria-hidden="true" />
              {displayCredits !== null && (
                <span className="font-poppins text-sm">{displayCredits}</span>
              )}
              <span className="font-poppins text-sm">Credits</span>
            </Link>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-white hover:text-corama-teal transition-colors"
            >
              <img src="/static/app/dashboard/LogOut.svg" alt="" className="h-5 w-5" aria-hidden="true" />
              <span className="font-poppins text-sm">Log Out</span>
            </button>
            
            <button className="flex items-center gap-2 text-white hover:text-corama-teal transition-colors">
              <img src="/static/app/dashboard/settings.svg" alt="" className="h-5 w-5" aria-hidden="true" />
              <span className="font-poppins text-sm">Settings</span>
            </button>
          </div>
        </div>
        
        {/* Mobile: Main header content with icons and labels below */}
        <div className="lg:hidden flex flex-1 items-center justify-between px-2">
          {/* Search - centered with SEARCH IN CORAMA placeholder */}
          <div className="flex flex-1 min-w-0 mx-2">
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gray-400"></div>
              <input
                type="text"
                placeholder="SEARCH IN CORAMA"
                className="w-full rounded-full py-2 pl-10 pr-3 text-white placeholder-gray-400 focus:outline-none transition-colors text-xs font-poppins"
                style={{ backgroundColor: 'rgb(19, 41, 71)', border: '1px solid rgb(60, 87, 114)' }}
              />
            </div>
          </div>
          
          {/* Right side icons with labels below */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/get-more-credits" className="flex flex-col items-center text-white hover:text-corama-teal transition-colors">
              <img src="/static/app/dashboard/Credits.svg" alt="" className="h-6 w-6" aria-hidden="true" />
              <span className="font-poppins text-[10px] mt-0.5">
                {displayCredits !== null ? displayCredits : '0000'}
              </span>
            </Link>
            
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center text-white hover:text-corama-teal transition-colors"
            >
              <img src="/static/app/dashboard/LogOut.svg" alt="" className="h-6 w-6" aria-hidden="true" />
              <span className="font-poppins text-[10px] mt-0.5">Log Out</span>
            </button>
            
            <button className="flex flex-col items-center text-white hover:text-corama-teal transition-colors">
              <img src="/static/app/dashboard/settings.svg" alt="" className="h-6 w-6" aria-hidden="true" />
              <span className="font-poppins text-[10px] mt-0.5">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

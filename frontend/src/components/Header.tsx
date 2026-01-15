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
  const previousValueRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const isFirstLoadRef = useRef(true)

  useEffect(() => {
    if (targetValue === null) {
      setDisplayValue(null)
      return
    }

    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const alreadyAnimatedInitial = sessionStorage.getItem(CREDITS_ANIMATED_KEY) === 'true'
    
    // Determine start value for animation
    let startValue: number
    if (isFirstLoadRef.current && !alreadyAnimatedInitial) {
      // First load: animate from 0
      startValue = 0
      sessionStorage.setItem(CREDITS_ANIMATED_KEY, 'true')
    } else if (previousValueRef.current !== null && previousValueRef.current !== targetValue) {
      // Credits changed: animate from previous value
      startValue = previousValueRef.current
    } else {
      // No change or already animated initial: just set the value
      setDisplayValue(targetValue)
      previousValueRef.current = targetValue
      isFirstLoadRef.current = false
      return
    }

    isFirstLoadRef.current = false
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const easeOutQuad = 1 - (1 - progress) * (1 - progress)
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuad)
      
      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        previousValueRef.current = targetValue
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetValue, duration])

  // Update previous value when target changes without animation
  useEffect(() => {
    if (targetValue !== null && previousValueRef.current === null) {
      const alreadyAnimated = sessionStorage.getItem(CREDITS_ANIMATED_KEY) === 'true'
      if (alreadyAnimated) {
        previousValueRef.current = targetValue
      }
    }
  }, [targetValue])

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
    // Only fetch from API if we don't have cached credits
    const cached = sessionStorage.getItem(CREDITS_CACHE_KEY)
    if (cached === null) {
      loadUserData()
    }

    // Listen for credit changes from other components
    const handleCreditsChanged = (event: CustomEvent<{ credits: number }>) => {
      const newCredits = event.detail.credits
      setCredits(newCredits)
      sessionStorage.setItem(CREDITS_CACHE_KEY, String(newCredits))
    }

    window.addEventListener('creditsChanged', handleCreditsChanged as EventListener)
    
    return () => {
      window.removeEventListener('creditsChanged', handleCreditsChanged as EventListener)
    }
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
    <header className="sticky top-0 z-30 h-14 lg:h-16 bg-corama-dark border-b border-corama-darker">
      <div className="flex items-center h-full">
        {/* Left: Logo column - matches sidebar width (w-64), centered within */}
        <div className="hidden lg:flex items-center justify-center w-64 h-full shrink-0">
          <a href="/" className="inline-flex items-center">
            <img 
              src="/static/app/dashboard/CoramaLogo.svg" 
              alt="CORAMA" 
              className="h-10 w-auto"
            />
          </a>
        </div>
        
        {/* Mobile: Hamburger spacer + Logo - positioned on left with proper spacing */}
        <div className="lg:hidden flex items-center h-full">
          {/* Hamburger button spacer - reserves space for the sidebar hamburger button */}
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 ml-2">
            {/* This is a placeholder to maintain consistent header height and spacing */}
            {/* The actual hamburger button is rendered by the Sidebar component */}
          </div>
          <a href="/" className="inline-flex items-center ml-1">
            <img 
              src="/static/app/dashboard/CoramaLogo.svg" 
              alt="CORAMA" 
              className="h-7 sm:h-8 w-auto"
            />
          </a>
        </div>
        
        {/* Right: Main header content */}
        <div className="flex-1 flex items-center justify-between px-2 sm:px-4 lg:px-6">
          {/* Search - visible on all screen sizes with compact styling on mobile */}
          <div className="flex flex-1 min-w-0" style={{ marginRight: '8px' }}>
            <div className="relative w-full">
              <Search className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="SEARCH"
                className="w-full rounded-full py-1.5 sm:py-2 lg:py-2.5 pl-8 sm:pl-12 pr-2 sm:pr-4 text-white placeholder-gray-400 focus:outline-none transition-colors text-xs sm:text-sm"
                style={{ backgroundColor: 'rgb(19, 41, 71)', border: '1px solid rgb(60, 87, 114)' }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-shrink-0">
            <Link to="/get-more-credits" className="flex items-center gap-1 sm:gap-2 text-white hover:text-corama-teal transition-colors">
              <img src="/static/app/dashboard/Credits.svg" alt="" className="h-5 w-5" aria-hidden="true" />
              {displayCredits !== null && (
                <span className="font-poppins text-xs sm:text-sm">{displayCredits}</span>
              )}
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
        </div>
      </div>
    </header>
  )
}

export default Header

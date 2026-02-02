import { useEffect, useState, useRef } from 'react'
import { Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useTranslation } from '../i18n'

// Tool suggestions for the search autocomplete
const TOOL_SUGGESTIONS = [
  { id: 'top-five-contracts', label: 'Top Five Matches', labelEs: 'Cinco Mejores Coincidencias', path: '/top-five-contracts' },
  { id: 'capability-builder', label: 'Capability Builder', labelEs: 'Constructor de Capacidades', path: '/capability-builder' },
  { id: 'corama-directory', label: 'CORAMA Directory', labelEs: 'Directorio CORAMA', path: '/corama-directory' },
  { id: 'get-more-credits', label: 'Get More Credits', labelEs: 'Obtener Más Créditos', path: '/get-more-credits' },
  { id: 'support', label: 'Support', labelEs: 'Soporte', path: '/support' },
  { id: 'about-us', label: 'About Us', labelEs: 'Sobre Nosotros', path: '/about-us' },
]

interface HeaderProps {
  credits?: number
}

const CREDITS_CACHE_KEY = 'corama_credits_cache'
const CREDITS_ANIMATED_KEY = 'corama_credits_animated'
const CREDITS_LAST_VALUE_KEY = 'corama_credits_last_value'

const useCountUp = (targetValue: number | null, duration: number = 800) => {
  const [displayValue, setDisplayValue] = useState<number | null>(() => {
    // Initialize from sessionStorage to prevent flash
    if (typeof window === 'undefined') return null
    const lastValue = sessionStorage.getItem(CREDITS_LAST_VALUE_KEY)
    if (lastValue !== null) {
      const parsed = parseInt(lastValue, 10)
      return isNaN(parsed) ? null : parsed
    }
    return null
  })
  const animationRef = useRef<number | null>(null)

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
    const lastValueStr = sessionStorage.getItem(CREDITS_LAST_VALUE_KEY)
    const lastValue = lastValueStr !== null ? parseInt(lastValueStr, 10) : null
    
    // Determine start value for animation
    let startValue: number
    let shouldAnimate = false
    
    if (!alreadyAnimatedInitial) {
      // First load ever: animate from 0
      startValue = 0
      shouldAnimate = true
      sessionStorage.setItem(CREDITS_ANIMATED_KEY, 'true')
    } else if (lastValue !== null && lastValue !== targetValue) {
      // Credits changed: animate from last value
      startValue = lastValue
      shouldAnimate = true
    } else {
      // No change: just set the value without animation
      setDisplayValue(targetValue)
      sessionStorage.setItem(CREDITS_LAST_VALUE_KEY, String(targetValue))
      return
    }

    if (!shouldAnimate) {
      setDisplayValue(targetValue)
      sessionStorage.setItem(CREDITS_LAST_VALUE_KEY, String(targetValue))
      return
    }

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
        // Animation complete: save final value
        sessionStorage.setItem(CREDITS_LAST_VALUE_KEY, String(targetValue))
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
  const { t, language } = useTranslation()
  const navigate = useNavigate()
  const [credits, setCredits] = useState<number | null>(() => {
    if (typeof window === 'undefined') return propCredits ?? null
    const cached = sessionStorage.getItem(CREDITS_CACHE_KEY)
    if (cached !== null) {
      const parsed = parseInt(cached, 10)
      return isNaN(parsed) ? propCredits ?? null : parsed
    }
    return propCredits ?? null
  })

  // Search autocomplete state
  const [searchValue, setSearchValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const displayCredits = useCountUp(credits)

  // Filter suggestions based on search input
  const filteredSuggestions = searchValue.trim()
    ? TOOL_SUGGESTIONS.filter(tool => {
        const searchLower = searchValue.toLowerCase()
        const labelToSearch = language === 'es' ? tool.labelEs : tool.label
        return (
          tool.id.toLowerCase().includes(searchLower) ||
          tool.label.toLowerCase().includes(searchLower) ||
          tool.labelEs.toLowerCase().includes(searchLower) ||
          labelToSearch.toLowerCase().startsWith(searchLower)
        )
      })
    : []

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelectSuggestion(filteredSuggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // Handle selecting a suggestion
  const handleSelectSuggestion = (tool: typeof TOOL_SUGGESTIONS[0]) => {
    setSearchValue('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
    navigate(tool.path)
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    setShowSuggestions(value.trim().length > 0)
    setSelectedIndex(-1)
  }

  useEffect(() => {
    // Always fetch credits from API to ensure we have the latest value
    // The animation logic will handle whether to animate or not based on value changes
    loadUserData()

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
          <div className="flex flex-1 min-w-0" style={{ marginRight: '8px' }} ref={searchContainerRef}>
            <div className="relative w-full">
              <Search className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
              <input
                type="text"
                value={searchValue}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => searchValue.trim() && setShowSuggestions(true)}
                placeholder={t('searchInCorama')}
                className="w-full rounded-full py-1.5 sm:py-2 lg:py-2.5 pl-8 sm:pl-12 pr-2 sm:pr-4 text-white placeholder-gray-400 focus:outline-none transition-colors text-xs sm:text-sm"
                style={{ backgroundColor: 'rgb(19, 41, 71)', border: '1px solid rgb(60, 87, 114)' }}
              />
              
              {/* Search suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid transparent',
                    borderImage: 'linear-gradient(135deg, rgba(153, 200, 202, 0.6), rgba(11, 44, 72, 0.6)) 1',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div className="py-2">
                    {filteredSuggestions.map((tool, index) => (
                      <button
                        key={tool.id}
                        onClick={() => handleSelectSuggestion(tool)}
                        className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                          index === selectedIndex 
                            ? 'bg-white/20 text-white' 
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Search size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="font-poppins text-sm">
                          {language === 'es' ? tool.labelEs : tool.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 flex-shrink-0">
            {/* Credits - mobile: icon with label below, desktop: inline */}
            <Link to="/get-more-credits" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-white hover:text-corama-teal transition-colors">
              <img src="/static/app/dashboard/Credits.svg" alt="" className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
              <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-1">
                {displayCredits !== null && (
                  <span className="font-poppins text-[8px] sm:text-xs">{displayCredits}</span>
                )}
                <span className="font-poppins text-[8px] sm:text-xs">{t('credits')}</span>
              </div>
            </Link>
            
            {/* Logout - mobile: icon with label below, desktop: inline */}
            <button 
              onClick={handleLogout}
              className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-white hover:text-corama-teal transition-colors"
            >
              <img src="/static/app/dashboard/LogOut.svg" alt="" className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
              <span className="font-poppins text-[8px] sm:text-xs">{t('logOut')}</span>
            </button>
            
            {/* Settings - mobile: icon with label below, desktop: inline */}
            <Link to="/settings" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-white hover:text-corama-teal transition-colors">
              <img src="/static/app/dashboard/settings.svg" alt="" className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
              <span className="font-poppins text-[8px] sm:text-xs">{t('settings')}</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

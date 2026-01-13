import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

interface SidebarProps {
  mobileOpen?: boolean
  onMobileToggle?: () => void
  onGoBack?: () => void
}

interface MenuItem {
  path: string
  label: string
  icon: string
  badge?: boolean
  external?: boolean
}

const Sidebar = ({ mobileOpen = false, onMobileToggle, onGoBack: customGoBack }: SidebarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  
  // Swipe gesture state
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const SWIPE_THRESHOLD = 50 // Minimum swipe distance to trigger
  const EDGE_ZONE = 30 // Pixels from left edge to start swipe detection
  
  // Initialize isExpanded from localStorage to persist across page navigation
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('corama_sidebar_expanded')
    return stored === null ? true : stored === 'true'
  })
  
  // Initialize previousPath from sessionStorage to persist across component remounts
  const [previousPath, setPreviousPath] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem('corama_prev_path') || null
  })
  
  // Track navigation history using sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const current = location.pathname
    const storedCurrent = sessionStorage.getItem('corama_current_path')

    // If we had a previous "current" and it's different, that becomes the prev path
    if (storedCurrent && storedCurrent !== current) {
      sessionStorage.setItem('corama_prev_path', storedCurrent)
      setPreviousPath(storedCurrent)
    }

    // Update the current path in storage
    sessionStorage.setItem('corama_current_path', current)
  }, [location.pathname])
  
  const isDashboard = location.pathname === '/dashboard'
  const showGoBack = !isDashboard && !!previousPath
  
  const actualOpen = onMobileToggle ? mobileOpen : isOpen
  const toggleOpen = onMobileToggle || (() => setIsOpen(!isOpen))
  
  // Swipe gesture handlers for mobile
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    // Only track swipes that start from the left edge of the screen
    if (touch.clientX <= EDGE_ZONE && !actualOpen) {
      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY
    } else if (actualOpen) {
      // Track swipes anywhere when sidebar is open (for closing)
      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY
    }
  }, [actualOpen])
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current
    
    // Only consider horizontal swipes (deltaX > deltaY)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Swipe right to open (when closed and started from edge)
      if (deltaX > SWIPE_THRESHOLD && !actualOpen && touchStartX.current <= EDGE_ZONE) {
        toggleOpen()
        touchStartX.current = null
        touchStartY.current = null
      }
      // Swipe left to close (when open)
      else if (deltaX < -SWIPE_THRESHOLD && actualOpen) {
        toggleOpen()
        touchStartX.current = null
        touchStartY.current = null
      }
    }
  }, [actualOpen, toggleOpen])
  
  const handleTouchEnd = useCallback(() => {
    touchStartX.current = null
    touchStartY.current = null
  }, [])
  
  // Set up touch event listeners for swipe gestures
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Only add listeners on mobile (lg breakpoint is 1024px)
    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    
    const addListeners = () => {
      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchmove', handleTouchMove, { passive: true })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
    }
    
    const removeListeners = () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
    
    if (mediaQuery.matches) {
      addListeners()
    }
    
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        addListeners()
      } else {
        removeListeners()
      }
    }
    
    mediaQuery.addEventListener('change', handleMediaChange)
    
    return () => {
      removeListeners()
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])
  
  const handleGoBack = () => {
    if (customGoBack) {
      customGoBack()
    } else if (previousPath) {
      navigate(previousPath)
    }
  }
  
  const menuItems: MenuItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '/static/app/dashboard/Dashboard.svg' },
    { path: '/top-five-contracts', label: 'Top Five Contracts', icon: '/static/app/dashboard/TopFiveContracts.svg' },
    { path: '/capability-builder', label: 'Capability Builder', icon: '/static/app/dashboard/CapabilityBuilder.svg' },
    { path: '/corama-directory', label: 'CORAMA Directory', icon: '/static/app/dashboard/CORAMADirectory.svg' },
    { path: '/get-more-credits', label: 'Get More Credits', icon: '/static/app/dashboard/Credits.svg' },
    { path: '/support', label: 'Support', icon: '/static/app/dashboard/Support.svg' },
    { path: '/about-us', label: 'About Us', icon: '/static/app/dashboard/AboutUs.svg', external: true },
  ]

  const closeMobile = () => {
    if (onMobileToggle && mobileOpen) onMobileToggle()
    else if (!onMobileToggle) setIsOpen(false)
  }

  const toggleExpanded = () => {
    const newValue = !isExpanded
    setIsExpanded(newValue)
    // Persist to localStorage so it survives page navigation
    localStorage.setItem('corama_sidebar_expanded', String(newValue))
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={toggleOpen}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-corama-darker rounded-lg text-white"
        aria-label="Toggle menu"
      >
        <img 
          src="/static/app/dashboard/HamburgerButton.svg" 
          alt="" 
          className="w-6 h-6"
          aria-hidden="true"
        />
      </button>

      {/* Mobile Overlay */}
      {actualOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar - sticky on desktop, fixed overlay on mobile */}
      <aside 
        className={`
          fixed lg:sticky lg:relative lg:top-16 inset-y-0 left-0 z-40
          ${isExpanded ? 'w-[290px]' : 'w-[100px]'} lg:h-[calc(100vh-4rem)] h-screen bg-corama-dark flex flex-col
          transform transition-all duration-300 ease-in-out
          ${actualOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Vertical separator line: 16px from the Highlight SVG end (258px + 16px = 274px from left, so right-4 = 16px from right edge of 290px sidebar) */}
        <div
          className="hidden lg:block absolute right-4 top-0 bottom-0 w-px bg-white"
          aria-hidden="true"
        />
        
        {/* Hamburger Toggle Button */}
        <div className="hidden lg:block relative" style={{ height: '51px', marginTop: '8px' }}>
          <img 
            src="/static/app/dashboard/Highlight.svg" 
            alt="" 
            className="absolute top-0 left-0 h-[51px] object-cover object-left opacity-0"
            style={{ width: 'calc(100% - 16px)' }}
            aria-hidden="true"
          />
          <button
            onClick={toggleExpanded}
            className="relative flex items-center h-[51px] transition-all hover:opacity-80"
            style={{ paddingLeft: '16px', paddingRight: '48px', gap: '8px' }}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <img 
              src="/static/app/dashboard/HamburgerButton.svg" 
              alt="" 
              className="w-[25px] h-[25px] flex-shrink-0"
              aria-hidden="true"
            />
            {isExpanded && (
              <span className="font-poppins text-sm text-white whitespace-nowrap">Collapse Menu</span>
            )}
          </button>
        </div>
        
        <nav className="flex-1 pt-[16px] overflow-y-auto" style={{ gap: '8px' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            const isCapabilityBuilder = item.path === '/capability-builder'
            return (
              <div key={item.path} className="relative group" style={{ height: '51px' }}>
                {/* Hover background layer - controlled width, only shows on hover when not active */}
                {!isActive && (
                  <div 
                    className="absolute top-0 left-0 bottom-0 bg-corama-darker opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ width: isExpanded ? '258px' : '76px', borderRadius: '27px' }}
                    aria-hidden="true"
                  />
                )}
                {/* Active highlight - use object-right when collapsed to preserve rounded edge */}
                {isActive && (
                  <img 
                    src={isExpanded ? '/static/app/dashboard/Highlight.svg' : '/static/app/dashboard/HighlightCollapsed.svg'}
                    alt="" 
                    className={`absolute top-0 left-0 bottom-0 h-full object-cover ${isExpanded ? 'object-left' : 'object-right'}`}
                    style={{ width: isExpanded ? '258px' : '76px' }}
                    aria-hidden="true"
                  />
                )}
                {item.external ? (
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMobile}
                    className={`relative flex items-center h-full px-4 transition-all text-gray-300 group-hover:text-white`}
                    style={{ gap: '8px' }}
                  >
                    <img 
                      src={item.icon} 
                      alt="" 
                      className="w-[25px] h-[25px]" 
                      style={{ marginLeft: isCapabilityBuilder ? '4px' : '0' }}
                      aria-hidden="true" 
                    />
                    {isExpanded && (
                      <span className="font-poppins text-sm">{item.label}</span>
                    )}
                    {item.badge && (
                      <span className="ml-auto w-2 h-2 bg-corama-teal rounded-full"></span>
                    )}
                  </a>
                ) : (
                  <Link
                    to={item.path}
                    onClick={closeMobile}
                    className={`relative flex items-center h-full px-4 transition-all ${
                      isActive 
                        ? 'text-white' 
                        : 'text-gray-300 group-hover:text-white'
                    }`}
                    style={{ gap: '8px' }}
                  >
                    <img 
                      src={item.icon} 
                      alt="" 
                      className="w-[25px] h-[25px]" 
                      style={{ marginLeft: isCapabilityBuilder ? '4px' : '0' }}
                      aria-hidden="true" 
                    />
                    {isExpanded && (
                      <span className="font-poppins text-sm">{item.label}</span>
                    )}
                    {item.badge && (
                      <span className="ml-auto w-2 h-2 bg-corama-teal rounded-full"></span>
                    )}
                  </Link>
                )}
              </div>
            )
          })}
          
          {/* Go Back Button - only shown when not on Dashboard and there's a previous page */}
          {showGoBack && (
            <div className="relative mt-2 group" style={{ height: '51px' }}>
              {/* Collapsed state: use object-right to preserve rounded edge */}
              {!isExpanded && (
                <img 
                  src="/static/app/dashboard/HighlightGoBackCollapsed.svg"
                  alt="" 
                  className="absolute top-0 left-0 bottom-0 h-full object-cover object-right"
                  style={{ width: '76px' }}
                  aria-hidden="true"
                />
              )}
              <button
                onClick={handleGoBack}
                className="relative flex items-center h-full px-4 text-white transition-all hover:opacity-90"
                style={{
                  background: isExpanded ? 'linear-gradient(180deg, #1C4262 6.25%, #284165 96%)' : 'transparent',
                  width: isExpanded ? '258px' : '76px',
                  borderRadius: isExpanded ? '0 9999px 9999px 0' : '0',
                  gap: '8px'
                }}
              >
                <img src="/static/app/dashboard/GoBack.svg" alt="" className="w-[25px] h-[25px]" aria-hidden="true" />
                {isExpanded && (
                  <span className="font-poppins text-sm">Go Back</span>
                )}
              </button>
            </div>
          )}
        </nav>
        
        {/* IHCC and Social Media Section - fixed at bottom, centered */}
        {isExpanded && (
          <div className="px-4 pt-4 pb-[36px] text-center shrink-0">
            <p className="text-white text-xs mb-2">Learn More About IHCC</p>
            <a 
              href="https://ihccbusiness.net/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block mb-4"
            >
              <img 
                src="/static/app/dashboard/IHCC.svg" 
                alt="IHCC - Illinois Hispanic Chamber of Commerce" 
                className="h-24 w-auto mx-auto"
              />
            </a>
            <p className="text-white text-xs mb-3">Follow Contract Radar Maximizer</p>
            <div className="flex justify-center gap-3">
              <a 
                href="https://www.instagram.com/corama.ai/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <img src="/static/app/dashboard/InstagramLogo.svg" alt="Instagram" className="w-5 h-5" />
              </a>
              <a 
                href="https://www.facebook.com/people/Corama/61568626109717/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <img src="/static/app/dashboard/Facebook.svg" alt="Facebook" className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/company/corama-ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <img src="/static/app/dashboard/LinkedIn.svg" alt="LinkedIn" className="w-5 h-5" />
              </a>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar

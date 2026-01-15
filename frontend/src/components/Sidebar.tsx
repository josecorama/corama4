import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useTranslation } from '../i18n'

interface SidebarProps {
  mobileOpen?: boolean
  onMobileToggle?: () => void
  onGoBack?: () => void
  onBeforeNavigate?: (to: string) => boolean // Return false to prevent navigation
}

interface MenuItem {
  path: string
  label: string
  icon: string
  badge?: boolean
  external?: boolean
}

const Sidebar = ({ mobileOpen = false, onMobileToggle, onGoBack: customGoBack, onBeforeNavigate }: SidebarProps) => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Swipe gesture refs
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const sidebarRef = useRef<HTMLElement>(null)
  
  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const result = await api.checkAdminStatus()
        setIsAdmin(result.success && result.is_admin)
      } catch {
        setIsAdmin(false)
      }
    }
    checkAdmin()
  }, [])
  
  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current
    const SWIPE_THRESHOLD = 50
    const EDGE_ZONE = 30
    
    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      const actualOpen = onMobileToggle ? mobileOpen : isOpen
      
      // Swipe right from left edge to open
      if (deltaX > 0 && touchStartX.current < EDGE_ZONE && !actualOpen) {
        if (onMobileToggle) onMobileToggle()
        else setIsOpen(true)
      }
      // Swipe left to close
      else if (deltaX < 0 && actualOpen) {
        if (onMobileToggle) onMobileToggle()
        else setIsOpen(false)
      }
    }
  }, [mobileOpen, isOpen, onMobileToggle])
  
  // Add swipe gesture listeners
  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd])
  
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
  
  const handleGoBack = () => {
    if (customGoBack) {
      customGoBack()
    } else if (previousPath) {
      navigate(previousPath)
    }
  }
  
  const isDashboard = location.pathname === '/dashboard'
  const showGoBack = !isDashboard && !!previousPath
  
  const actualOpen = onMobileToggle ? mobileOpen : isOpen
  const toggleOpen = onMobileToggle || (() => setIsOpen(!isOpen))
  
  const menuItems: MenuItem[] = [
    { path: '/dashboard', label: t('dashboard'), icon: '/static/app/dashboard/Dashboard.svg' },
    { path: '/top-five-contracts', label: t('topFiveMatches'), icon: '/static/app/dashboard/TopFiveContracts.svg' },
    { path: '/capability-builder', label: t('capabilityBuilder'), icon: '/static/app/dashboard/CapabilityBuilder.svg' },
    { path: '/corama-directory', label: t('coramaDirectory'), icon: '/static/app/dashboard/CORAMADirectory.svg' },
    { path: '/get-more-credits', label: t('getMoreCredits'), icon: '/static/app/dashboard/Credits.svg' },
    { path: '/support', label: t('support'), icon: '/static/app/dashboard/Support.svg' },
    { path: '/about-us', label: t('aboutUs'), icon: '/static/app/dashboard/AboutUs.svg', external: true },
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
      {/* Mobile Menu Button - positioned at top left with Menu label, aligned with header icons */}
      {!actualOpen && (
        <button 
          onClick={toggleOpen}
          className="lg:hidden fixed top-0 left-2 z-50 h-14 w-10 flex flex-col items-center justify-center text-white"
          aria-label="Toggle menu"
        >
          <img 
            src="/static/app/dashboard/HamburgerButton.svg" 
            alt="" 
            className="w-4 h-4"
            aria-hidden="true"
          />
          <span className="font-poppins text-[8px] mt-0.5">{t('menu')}</span>
        </button>
      )}

      {/* Mobile Overlay */}
      {actualOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar - fixed on mobile (overlays content), sticky on desktop */}
      <aside 
        ref={sidebarRef}
        className={`
          fixed lg:sticky lg:relative lg:top-16 inset-y-0 left-0 z-40
          ${isExpanded ? 'w-[290px]' : 'w-[100px]'} lg:h-[calc(100vh-4rem)] h-screen bg-corama-dark flex flex-col
          transform transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden
          ${actualOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'}
        `}
      >
        {/* Vertical separator line: 16px from the Highlight SVG end (258px + 16px = 274px from left, so right-4 = 16px from right edge of 290px sidebar) */}
        <div
          className="hidden lg:block absolute right-4 top-0 bottom-0 w-px"
          style={{ backgroundColor: '#2D5170', boxShadow: '0 0 8px rgba(45, 81, 112, 0.5)' }}
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
              <span className="font-poppins text-sm text-white whitespace-nowrap">{t('collapseMenu')}</span>
            )}
          </button>
        </div>
        
        <nav className="flex-1 pt-[16px] overflow-y-auto overflow-x-hidden" style={{ gap: '8px' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            const isCapabilityBuilder = item.path === '/capability-builder'
            return (
              <div key={item.path} className="relative group" style={{ height: '51px' }}>
                      {/* Hover background layer - controlled width with smooth resize transition */}
                      <div 
                        className={`absolute top-0 left-0 bottom-0 bg-corama-darker transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${!isActive ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}
                        style={{ width: isExpanded ? '258px' : '76px', borderRadius: '27px' }}
                        aria-hidden="true"
                      />
                      {/* Active highlight - CSS gradient with smooth resize transition (teal gradient from original SVG) */}
                      <div 
                        className={`absolute top-0 left-0 bottom-0 h-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isActive ? 'opacity-100' : 'opacity-0'}`}
                        style={{ 
                          width: isExpanded ? '258px' : '76px',
                          background: 'linear-gradient(180deg, #6BB4B5 51.44%, #99C8CA 100%)',
                          borderRadius: '0 9999px 9999px 0'
                        }}
                        aria-hidden="true"
                      />
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
                    onClick={(e) => {
                      // If onBeforeNavigate is provided and returns false, prevent navigation
                      if (onBeforeNavigate && !onBeforeNavigate(item.path)) {
                        e.preventDefault()
                        return
                      }
                      closeMobile()
                    }}
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
          
          {/* Admin Link - only shown for admin users */}
          {isAdmin && (
            <div className="relative group mt-2" style={{ height: '51px' }}>
              {/* Hover background layer - smooth resize transition */}
              <div 
                className={`absolute top-0 left-0 bottom-0 bg-corama-darker transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${location.pathname !== '/admin/directory' ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}
                style={{ width: isExpanded ? '258px' : '76px', borderRadius: '27px' }}
                aria-hidden="true"
              />
              {/* Active highlight - CSS gradient with smooth resize transition (teal gradient from original SVG) */}
              <div 
                className={`absolute top-0 left-0 bottom-0 h-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${location.pathname === '/admin/directory' ? 'opacity-100' : 'opacity-0'}`}
                style={{ 
                  width: isExpanded ? '258px' : '76px',
                  background: 'linear-gradient(180deg, #6BB4B5 51.44%, #99C8CA 100%)',
                  borderRadius: '0 9999px 9999px 0'
                }}
                aria-hidden="true"
              />
              <Link
                to="/admin/directory"
                onClick={closeMobile}
                className={`relative flex items-center h-full px-4 transition-all ${
                  location.pathname === '/admin/directory'
                    ? 'text-white' 
                    : 'text-amber-400 group-hover:text-amber-300'
                }`}
                style={{ gap: '8px' }}
              >
                <svg 
                  className="w-[25px] h-[25px]" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
                {isExpanded && (
                  <span className="font-poppins text-sm">{t('adminDirectory')}</span>
                )}
              </Link>
            </div>
          )}
          
          {/* Go Back Button - only shown when not on Dashboard and there's a previous page */}
          {showGoBack && (
            <div className="relative mt-2 group" style={{ height: '51px' }}>
              {/* Single button with smooth morphing animation for width, borderRadius, and background (dark blue gradient) */}
              <button
                onClick={handleGoBack}
                className="relative flex items-center h-full px-4 text-white transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-90"
                style={{
                  background: 'linear-gradient(180deg, #1C4262 6.25%, #284165 96%)',
                  width: isExpanded ? '258px' : '76px',
                  borderRadius: isExpanded ? '0 9999px 9999px 0' : '9999px',
                  gap: '8px'
                }}
              >
                <img src="/static/app/dashboard/GoBack.svg" alt="" className="w-[25px] h-[25px]" aria-hidden="true" />
                <span 
                  className="font-poppins text-sm transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap overflow-hidden"
                  style={{ 
                    opacity: isExpanded ? 1 : 0,
                    maxWidth: isExpanded ? '200px' : '0px'
                  }}
                >
                  {t('goBack')}
                </span>
              </button>
            </div>
          )}
        </nav>
        
        {/* IHCC and Social Media Section - fixed at bottom, centered */}
        {isExpanded && (
          <div className={`px-4 pt-4 pb-[36px] text-center shrink-0 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${actualOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 lg:opacity-100 lg:translate-x-0'}`}>
            <p className="text-white text-xs mb-2">{t('learnMoreIHCC')}</p>
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
            <p className="text-white text-xs mb-3">{t('followCorama')}</p>
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

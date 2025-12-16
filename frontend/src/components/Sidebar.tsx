import { useState, useEffect } from 'react'
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
}

const Sidebar = ({ mobileOpen = false, onMobileToggle, onGoBack: customGoBack }: SidebarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
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
  
  // For mobile: use mobileOpen prop or internal state
  const actualMobileOpen = onMobileToggle ? mobileOpen : isMobileOpen
  const toggleMobile = onMobileToggle || (() => setIsMobileOpen(!isMobileOpen))
  
  // Toggle sidebar collapse (desktop)
  const toggleCollapse = () => setIsCollapsed(!isCollapsed)
  
  // Sidebar width: 290px expanded, 100px collapsed
  const sidebarWidth = isCollapsed ? 100 : 290
  
  const menuItems: MenuItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '/static/app/dashboard/Dashboard.svg' },
    { path: '/top-five-contracts', label: 'Top Five Contracts', icon: '/static/app/dashboard/TopFiveContracts.svg' },
    { path: '/capability-builder', label: 'Capability Builder', icon: '/static/app/dashboard/CapabilityBuilder.svg' },
    { path: '/corama-directory', label: 'CORAMA Directory', icon: '/static/app/dashboard/CORAMADirectory.svg' },
    { path: '/get-more-credits', label: 'Get More Credits', icon: '/static/app/dashboard/Credits.svg' },
    { path: '/support', label: 'Support', icon: '/static/app/dashboard/Support.svg' },
    { path: '/about', label: 'About Us', icon: '/static/app/dashboard/AboutUs.svg' },
  ]

  const closeMobile = () => {
    if (onMobileToggle && mobileOpen) onMobileToggle()
    else if (!onMobileToggle) setIsMobileOpen(false)
  }

  return (
    <>
      {/* Mobile Menu Button - only visible on mobile */}
      <button 
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-corama-darker rounded-lg"
        aria-label="Toggle menu"
      >
        <img 
          src="/static/app/dashboard/HamburgerButton.svg" 
          alt="Menu" 
          className="w-[35px] h-[35px]"
        />
      </button>

      {/* Mobile Overlay */}
      {actualMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar - sticky on desktop, starts below header (top-16) so horizontal line can span full width */}
      <aside 
        className={`
          relative fixed lg:sticky lg:top-16 inset-y-0 left-0 z-40
          lg:h-[calc(100vh-4rem)] h-screen bg-corama-dark flex flex-col
          transform transition-all duration-300 ease-in-out
          ${actualMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ 
          width: `${sidebarWidth}px`,
          minWidth: `${sidebarWidth}px`,
          maxWidth: `${sidebarWidth}px`
        }}
      >
        {/* Vertical separator line: runs down the sidebar right edge from top */}
        <div
          className="hidden lg:block absolute right-0 top-0 bottom-0 w-px bg-white"
          aria-hidden="true"
        />
        
        {/* Hamburger Toggle Button - Desktop only, at top of sidebar */}
        <div className="hidden lg:flex items-center px-4 py-4">
          <button
            onClick={toggleCollapse}
            className="flex items-center gap-3 transition-all hover:opacity-80"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <img 
              src="/static/app/dashboard/HamburgerButton.svg" 
              alt="" 
              className="w-[35px] h-[35px] flex-shrink-0"
              aria-hidden="true"
            />
            {!isCollapsed && (
              <span className="font-poppins text-sm text-white whitespace-nowrap">
                Hide Side Bar
              </span>
            )}
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <div 
                key={item.path} 
                className="relative"
                style={{ marginBottom: '36px' }}
              >
                {isActive && (
                  <img 
                    src="/static/app/dashboard/Highlight.svg" 
                    alt="" 
                    className="absolute top-0 left-0 bottom-0 h-full object-cover object-left"
                    style={{ width: isCollapsed ? '100%' : 'calc(100% - 16px)' }}
                    aria-hidden="true"
                  />
                )}
                <Link
                  to={item.path}
                  onClick={closeMobile}
                  className={`relative flex items-center px-4 py-2 transition-all ${
                    isCollapsed ? 'justify-center' : 'gap-3'
                  } ${
                    isActive 
                      ? 'text-white' 
                      : 'text-gray-300 hover:bg-corama-darker hover:text-white rounded-xl mx-2'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <img 
                    src={item.icon} 
                    alt="" 
                    className="w-[35px] h-[35px] flex-shrink-0" 
                    aria-hidden="true" 
                  />
                  {!isCollapsed && (
                    <span className="font-poppins text-sm whitespace-nowrap">{item.label}</span>
                  )}
                  {item.badge && !isCollapsed && (
                    <span className="ml-auto w-2 h-2 bg-corama-teal rounded-full"></span>
                  )}
                </Link>
              </div>
            )
          })}
          
          {/* Go Back Button - only shown when not on Dashboard and there's a previous page */}
          {showGoBack && (
            <div className="relative" style={{ marginTop: '8px' }}>
              <button
                onClick={handleGoBack}
                className={`flex items-center text-white rounded-r-full transition-all hover:opacity-90 ${
                  isCollapsed ? 'justify-center px-4' : 'gap-3 pl-6 pr-4'
                } py-3`}
                style={{
                  background: 'linear-gradient(180deg, #1C4262 6.25%, #284165 96%)',
                  width: isCollapsed ? '100%' : 'calc(100% - 16px)'
                }}
                title={isCollapsed ? "Go Back" : undefined}
              >
                <img 
                  src="/static/app/dashboard/GoBack.svg" 
                  alt="" 
                  className="w-[35px] h-[35px] flex-shrink-0" 
                  aria-hidden="true" 
                />
                {!isCollapsed && (
                  <span className="font-poppins text-sm">Go Back</span>
                )}
              </button>
            </div>
          )}
        </nav>
        
        {/* IHCC and Social Media Section - fixed at bottom, centered - hidden when collapsed */}
        {!isCollapsed && (
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

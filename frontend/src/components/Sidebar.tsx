import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

interface SidebarProps {
  mobileOpen?: boolean
  onMobileToggle?: () => void
}

interface MenuItem {
  path: string
  label: string
  icon: string
  badge?: boolean
}

const Sidebar = ({ mobileOpen = false, onMobileToggle }: SidebarProps) => {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  
  const actualOpen = onMobileToggle ? mobileOpen : isOpen
  const toggleOpen = onMobileToggle || (() => setIsOpen(!isOpen))
  
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
    else if (!onMobileToggle) setIsOpen(false)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={toggleOpen}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-corama-darker rounded-lg text-white"
        aria-label="Toggle menu"
      >
        {actualOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {actualOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar - sticky on desktop so IHCC section stays visible */}
      <aside className={`
        fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40
        w-64 h-screen bg-corama-dark flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${actualOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
            <div className="p-4 pt-16 lg:pt-4 flex justify-center shrink-0">
                <Link to="/app" className="inline-flex items-center" onClick={closeMobile}>
                  <img 
                    src="/static/app/dashboard/CoramaLogo.svg" 
                    alt="CORAMA" 
                    className="h-8 lg:h-10 w-auto"
                  />
                </Link>
              </div>
        
              <nav className="flex-1 px-2 py-4 overflow-y-auto">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobile}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
                        isActive 
                          ? 'bg-corama-teal/20 text-white' 
                          : 'text-gray-300 hover:bg-corama-darker hover:text-white'
                      }`}
                    >
                      <img src={item.icon} alt="" className="w-5 h-5" aria-hidden="true" />
                      <span className="font-poppins text-sm">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto w-2 h-2 bg-corama-teal rounded-full"></span>
                      )}
                    </Link>
                  )
                })}
              </nav>
        
      {/* IHCC and Social Media Section - fixed at bottom, centered */}
      <div className="p-4 text-center shrink-0">
        <p className="text-gray-400 text-xs mb-2">Learn More About IHCC</p>
        <a 
          href="https://ihccbusiness.net/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block mb-4"
        >
          <img 
            src="/static/app/dashboard/IHCC.svg" 
            alt="IHCC - Illinois Hispanic Chamber of Commerce" 
            className="h-12 w-auto mx-auto"
          />
        </a>
        <p className="text-gray-400 text-xs mb-3">Follow Contract Radar Maximizer</p>
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
    </aside>
    </>
  )
}

export default Sidebar

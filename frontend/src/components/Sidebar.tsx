import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Trophy, FileText, Users, Coins, HelpCircle, Info, ChevronLeft, Menu, X } from 'lucide-react'

interface SidebarProps {
  mobileOpen?: boolean
  onMobileToggle?: () => void
}

const Sidebar = ({ mobileOpen = false, onMobileToggle }: SidebarProps) => {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  
  const actualOpen = onMobileToggle ? mobileOpen : isOpen
  const toggleOpen = onMobileToggle || (() => setIsOpen(!isOpen))
  
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/top-five-contracts', label: 'Top Five Contracts', icon: Trophy },
    { path: '/capability-builder', label: 'Capability Builder', icon: FileText },
    { path: '/corama-directory', label: 'CORAMA Directory', icon: Users, badge: true },
    { path: '/get-more-credits', label: 'Get More Credits', icon: Coins },
    { path: '/support', label: 'Support', icon: HelpCircle },
    { path: '/about', label: 'About Us', icon: Info },
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

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 min-h-screen bg-corama-dark flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${actualOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
            <div className="p-4 pt-16 lg:pt-4">
                <Link to="/" className="flex items-center gap-2" onClick={closeMobile}>
                  <span className="text-white font-poppins font-bold text-lg">CORAMA</span>
                </Link>
              </div>
        
              <nav className="flex-1 px-2 py-4 overflow-y-auto">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobile}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                        isActive 
                          ? 'bg-corama-teal/20 text-corama-teal' 
                          : 'text-gray-300 hover:bg-corama-darker hover:text-white'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-poppins text-sm">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto w-2 h-2 bg-corama-teal rounded-full"></span>
                      )}
                    </Link>
                  )
                })}
              </nav>
        
              <div className="px-4 py-3 border-t border-corama-darker">
                <Link 
                  to="/" 
                  onClick={closeMobile}
                  className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span className="font-poppins text-sm">Go Back</span>
                </Link>
              </div>
      
      <div className="p-4 border-t border-corama-darker">
        <p className="text-gray-400 text-xs mb-2">Learn More About IHCC</p>
        <div className="text-white font-bold text-2xl mb-4">IHCC</div>
        <p className="text-gray-400 text-xs mb-3">Follow Contract Radar Maximizer</p>
        <div className="flex gap-3">
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/></svg>
          </a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
          </a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
        </div>
      </div>
    </aside>
    </>
  )
}

export default Sidebar

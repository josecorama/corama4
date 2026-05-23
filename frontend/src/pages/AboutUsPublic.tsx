import { useEffect, useRef, useState, useCallback } from 'react'

const HEADER_HEIGHT = 80
const SECTION_IDS = ['capturing', 'mission-vision']

const AboutUsPublic = () => {
  const [currentSection, setCurrentSection] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({})

  const scrollToSection = useCallback((index: number) => {
    if (index < 0 || index >= SECTION_IDS.length || isScrolling) return
    
    setIsScrolling(true)
    setCurrentSection(index)
    
    const sectionId = SECTION_IDS[index]
    const section = sectionRefs.current[sectionId]
    
    if (section && containerRef.current) {
      containerRef.current.scrollTo({
        top: section.offsetTop - HEADER_HEIGHT,
        behavior: 'smooth'
      })
    }
    
    setTimeout(() => setIsScrolling(false), 800)
  }, [isScrolling])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      if (isScrolling) return
      
      if (e.deltaY > 0) {
        scrollToSection(currentSection + 1)
      } else if (e.deltaY < 0) {
        scrollToSection(currentSection - 1)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        scrollToSection(currentSection + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        scrollToSection(currentSection - 1)
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentSection, isScrolling, scrollToSection])

  const setSectionRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el
  }

  const getSectionClass = (sectionId: string) => {
    const sectionIndex = SECTION_IDS.indexOf(sectionId)
    const isActive = currentSection === sectionIndex
    return `min-h-[calc(100vh-${HEADER_HEIGHT}px)] flex flex-col justify-center transition-opacity duration-500 ${
      isActive ? 'opacity-100' : 'opacity-70'
    }`
  }

  // Scroll-triggered fade-in animations
  useEffect(() => {
    const fadeElements = document.querySelectorAll('.scroll-fade-in')
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-visible')
          entry.target.classList.remove('fade-in-hidden')
        } else {
          entry.target.classList.remove('fade-in-visible')
          entry.target.classList.add('fade-in-hidden')
        }
      })
    }, { threshold: 0.2 })
    
    fadeElements.forEach((el) => {
      el.classList.add('fade-in-hidden')
      observer.observe(el)
    })
    
    return () => observer.disconnect()
  }, [])

  return (
    <div className="h-screen bg-[#0B0B0F] flex flex-col overflow-hidden relative">
      {/* Flicker Background */}
      <div className="prelogin-flicker-bg" />
      
      {/* Header */}
      <header className="h-16 sm:h-20 flex-shrink-0 bg-[#0B0B0F] backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-full flex items-center justify-between">
          {/* Logo Group (Left Side) */}
          <div className="flex items-center gap-3 sm:gap-5">
            <a href="/">
              <img src="/static/app/landing/corama-logo-new.png" alt="CORAMA" className="h-6 sm:h-8 lg:h-8 w-auto" />
            </a>
            <div className="h-6 w-px bg-white/20"></div>
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer">
              <img src="/static/app/dashboard/IHCC-new.png" alt="IHCC" className="h-5 sm:h-6 lg:h-6 w-auto" />
            </a>
          </div>
          
          {/* Navigation and Buttons (Right Side) */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
            <nav className="prelogin-nav flex items-center gap-2 sm:gap-4 lg:gap-6">
              <a href="/faq" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">FAQ</a>
              <a href="/about-us" className="text-white font-poppins text-[10px] sm:text-sm transition-colors">About Us</a>
              <a href="/login" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">Log In</a>
            </nav>
            <a href="/signup" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center" style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)' }}>Sign up</a>
          </div>
        </div>
      </header>

      {/* Scrollable container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide relative z-10 snap-y snap-mandatory"
        style={{ 
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
          {/* Section 1: Capturing Major State Procurement Wins */}
          <section 
            ref={setSectionRef('capturing')}
            data-section="capturing"
            className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center snap-start ${getSectionClass('capturing')}`}
          >
            <div className="max-w-7xl mx-auto text-center relative z-10 px-4 scroll-fade-in">
              <h2 className="font-poppins font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-4 sm:mb-5 leading-tight">
                Capturing Major State<br />Procurement Wins
              </h2>
              <p className="text-[#6bb4b5] font-poppins text-sm sm:text-base mb-6 max-w-3xl mx-auto px-2 leading-relaxed">
                "Each year over $17B in government contracts are awarded by the State of Illinois. However, most small businesses miss out on opportunities because of the complicated submission process, lack of capacity, and the process taking too much time, giving larger corporations advantages. Contract Radar Maximizer is an AI tool that gives small businesses a competitive advantage, making it easier and faster to submit government procurements."
              </p>
            
              {/* Hexagons decoration */}
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                <div
                  className="relative flex items-center justify-center hidden sm:flex"
                  style={{ width: '400px', height: '120px', flexShrink: 1 }}
                >
                  <div
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                    style={{
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '100%',
                      height: '100px',
                      background: 'radial-gradient(ellipse at center, rgba(107,180,181,0.35) 0%, rgba(107,180,181,0.18) 45%, rgba(107,180,181,0.05) 75%, rgba(11,11,15,0) 100%)',
                      filter: 'blur(12px)',
                      opacity: 0.75,
                    }}
                  />
                  <img
                    src="/static/app/landing/hexagons.png"
                    alt=""
                    aria-hidden="true"
                    className="relative z-10 w-full h-auto translate-y-[20px]"
                    style={{ maxWidth: '100%' }}
                  />
                </div>

                <div
                  className="relative flex items-center justify-center hidden sm:flex"
                  style={{ width: '400px', height: '120px', flexShrink: 1 }}
                >
                  <div
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                    style={{
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '100%',
                      height: '100px',
                      background: 'radial-gradient(ellipse at center, rgba(107,180,181,0.35) 0%, rgba(107,180,181,0.18) 45%, rgba(107,180,181,0.05) 75%, rgba(11,11,15,0) 100%)',
                      filter: 'blur(12px)',
                      opacity: 0.75,
                    }}
                  />
                  <img
                    src="/static/app/landing/hexagons.png"
                    alt=""
                    aria-hidden="true"
                    className="relative z-10 w-full h-auto translate-y-[20px] scale-x-[-1]"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              </div>
            </div>
          </section>

        {/* Section 3: Mission & Vision Combined */}
        <section 
          ref={setSectionRef('mission-vision')}
          data-section="mission-vision"
          className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-between snap-start ${getSectionClass('mission-vision')}`}
        >
          {/* Soft teal glow backgrounds */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-[10%] -left-32 w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.2)_0%,rgba(26,58,74,0.1)_40%,transparent_70%)] -rotate-6"></div>
            <div className="absolute bottom-[20%] -right-32 w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.2)_0%,rgba(26,58,74,0.1)_40%,transparent_70%)] -rotate-6"></div>
          </div>
          
          {/* Twinkling stars */}
          <img 
            src="/static/app/landing/left-star-img.svg" 
            alt="" 
            className="absolute top-[8%] left-[8%] w-6 h-6 animate-twinkle hidden lg:block"
            style={{ animationDelay: '0s' }}
          />
          <img 
            src="/static/app/landing/right-star-img.svg" 
            alt="" 
            className="absolute top-[45%] right-[8%] w-6 h-6 animate-twinkle hidden lg:block"
            style={{ animationDelay: '1s' }}
          />
          
          <div className="flex-1 flex flex-col justify-center py-4 lg:py-8">
            <div className="max-w-6xl mx-auto relative z-10 w-full space-y-8 lg:space-y-12">
              {/* Mission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12 items-center scroll-fade-in">
                <div className="order-2 md:order-1 flex items-center justify-center">
                  <img 
                    src="/static/app/landing/Mission.svg" 
                    alt="Mission" 
                    className="w-full max-w-[280px] lg:max-w-[320px] h-auto"
                  />
                </div>
                <div className="order-1 md:order-2 text-center md:text-left">
                  <h2 className="font-poppins font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-3 sm:mb-4">Mission</h2>
                  <p className="text-gray-400 font-poppins text-sm sm:text-base leading-relaxed">
                    To facilitate small businesses' access to government contracts using cutting-edge technology to identify opportunities and maximize the probability of securing contracts.
                  </p>
                </div>
              </div>

              {/* Vision */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12 items-center scroll-fade-in">
                <div className="text-center md:text-left">
                  <h2 className="font-poppins font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-3 sm:mb-4">Vision</h2>
                  <p className="text-gray-400 font-poppins text-sm sm:text-base leading-relaxed">
                    To empower communities through access to contracts, decentralizing the public economy by extracting value from the public-generated value.
                  </p>
                </div>
                <div className="flex justify-center order-first md:order-last">
                  <img 
                    src="/static/app/landing/Vision.svg" 
                    alt="Vision" 
                    className="w-full max-w-[280px] lg:max-w-[320px] h-auto"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <footer className="py-4 px-4 sm:px-6 relative">
            <div className="max-w-6xl mx-auto relative z-10">
              <div className="text-center mb-3">
                <p className="text-white font-poppins text-xs sm:text-sm leading-relaxed">
                  180 North Michigan Avenue Suite 500 Chicago, IL 60601
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-3 text-xs sm:text-sm">
                <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-corama-teal font-poppins transition-colors">Learn More About IHCC</a>
                <a href="/terms-of-use" className="text-white hover:text-corama-teal font-poppins transition-colors">Terms of Use</a>
                <a href="/static/docs/policy.pdf" target="_blank" className="text-white hover:text-corama-teal font-poppins transition-colors">Policy Notice</a>
                <a href="/faq" className="text-white hover:text-corama-teal font-poppins transition-colors">FAQ</a>
              </div>
              
              {/* CORAMA Logo */}
              <div className="flex justify-center">
                <img 
                  src="/static/app/landing/corama-logo.png" 
                  alt="CORAMA" 
                  className="h-10 sm:h-12 w-auto"
                />
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}

export default AboutUsPublic

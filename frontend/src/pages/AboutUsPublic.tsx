import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowRight } from 'lucide-react'

const HEADER_HEIGHT = 80
const SECTION_IDS = ['capturing', 'team', 'mission', 'vision']

// Team member data
const teamMembers = [
  {
    name: 'Adrian Rodriguez',
    role: 'Co-Founder',
    description: 'Visionary entrepreneur dedicated to empowering small businesses through innovative AI-powered solutions for government contracting.',
    imageUrl: '/static/app/about/adrian2.png',
    linkedinUrl: 'https://www.linkedin.com/in/adrianerodriguez/'
  },
  {
    name: 'Jaime Di Paulo',
    role: 'Co-Founder',
    description: "Technology leader driving Contract Radar Maximizer's AI and machine learning innovations to transform the government contracting landscape.",
    imageUrl: '/static/app/about/jaime2.png',
    linkedinUrl: 'https://www.linkedin.com/in/jaime-di-paulo-zozaya-738a7217/'
  },
  {
    name: 'Mario Ornelas',
    role: 'AI Software Engineer',
    description: "Developing the intelligent systems that power Contract Radar Maximizer's next-generation automation, analytics, and AI-driven decision tools.",
    imageUrl: '/static/app/about/mario2.png',
    linkedinUrl: 'https://www.linkedin.com/in/mario-adrian-ornelas-cortes-724589304'
  },
  {
    name: 'Armando Delgado',
    role: 'Product Engineer',
    description: 'Experience-focused engineer designing secure and intuitive user interfaces by combining UI/UX and cybersecurity backgrounds.',
    imageUrl: '/static/app/about/armando2.png',
    linkedinUrl: 'https://www.linkedin.com/in/jos%C3%A9-armando-delgado-l%C3%B3pez-00a993315'
  }
]

// LinkedIn icon SVG
const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#0077B5" viewBox="0 0 16 16">
    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.015zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
  </svg>
)

// Team member card component with 3D tilt effect
interface TeamMemberCardProps {
  name: string
  role: string
  description: string
  imageUrl: string
  linkedinUrl: string
}

const TeamMemberCard = ({ name, role, description, imageUrl, linkedinUrl }: TeamMemberCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    let bounds: DOMRect

    const rotateToMouse = (e: MouseEvent) => {
      const mouseX = e.clientX
      const mouseY = e.clientY
      const leftX = mouseX - bounds.x
      const topY = mouseY - bounds.y
      const center = {
        x: leftX - bounds.width / 2,
        y: topY - bounds.height / 2
      }
      const distance = Math.sqrt(center.x ** 2 + center.y ** 2)

      card.style.transform = `
        scale3d(1.04, 1.04, 1.04)
        rotate3d(
          ${center.y / 100},
          ${-center.x / 100},
          0,
          ${Math.log(distance) * 2}deg
        )
      `

      const glowElement = card.querySelector('.card-glow') as HTMLElement
      if (glowElement) {
        glowElement.style.backgroundImage = `
          radial-gradient(
            circle at
            ${center.x * 2 + bounds.width / 2}px
            ${center.y * 2 + bounds.height / 2}px,
            rgba(255, 255, 255, 0.15),
            transparent
          )
        `
      }
    }

    const handleMouseEnter = () => {
      bounds = card.getBoundingClientRect()
      document.addEventListener('mousemove', rotateToMouse)
    }

    const handleMouseLeave = () => {
      document.removeEventListener('mousemove', rotateToMouse)
      card.style.transform = ''
      const glowElement = card.querySelector('.card-glow') as HTMLElement
      if (glowElement) {
        glowElement.style.backgroundImage = ''
      }
    }

    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mousemove', rotateToMouse)
    }
  }, [])

  return (
    <div
      ref={cardRef}
      className="relative flex flex-col w-full max-w-[342px] h-[432px] rounded-3xl overflow-hidden cursor-grab transition-transform duration-100"
      style={{
        background: 'linear-gradient(90deg, rgba(107, 180, 181, 0.7) 9%, rgba(156, 214, 215, 0.7) 88%, rgba(133, 196, 199, 0.7) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
        transformStyle: 'preserve-3d',
        willChange: 'transform, box-shadow'
      }}
    >
      {/* Glow effect overlay */}
      <div className="card-glow absolute inset-0 pointer-events-none" />
      
      {/* Inner decorative border */}
      <div
        className="absolute pointer-events-none z-10"
        style={{
          inset: '12px',
          borderRadius: '1.25rem',
          border: '1px solid rgba(11, 44, 72, 0.25)',
          transform: 'translateZ(20px)'
        }}
      />

      {/* Content area */}
      <div
        className="relative h-full p-6 flex flex-col items-center text-center z-5"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'translateZ(30px)'
        }}
      >
        {/* Profile image */}
        <div
          className="mb-5 relative"
          style={{ transform: 'translateZ(20px)' }}
        >
          <img
            className="w-24 h-24 rounded-full object-cover"
            src={imageUrl}
            alt={name}
            style={{
              boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
              border: '1.5px solid rgba(11, 44, 72, 0.8)'
            }}
          />
        </div>

        {/* Name */}
        <h3
          className="text-lg font-bold tracking-wide mb-2"
          style={{ color: '#0B2C48' }}
        >
          {name}
        </h3>

        {/* Role badge */}
        <div
          className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4"
          style={{
            backgroundColor: '#0B2C48',
            color: '#99C8CA',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
        >
          {role}
        </div>

        {/* Description - flex-1 to take remaining space and push button to bottom */}
        <div className="flex-1 flex items-start">
          <p
            className="text-xs leading-relaxed font-medium"
            style={{ color: '#0B2C48' }}
          >
            {description}
          </p>
        </div>

        {/* LinkedIn button - always at bottom */}
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-5 flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl text-sm font-semibold w-full max-w-[200px] transition-all duration-300 hover:scale-105 flex-shrink-0"
          style={{
            backgroundColor: 'white',
            color: '#0077B5',
            boxShadow: '0 5px 15px rgba(0,0,0,0.15)',
            transform: 'translateZ(20px)'
          }}
        >
          <LinkedInIcon />
          <span>Connect</span>
        </a>
      </div>
    </div>
  )
}

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

  return (
    <div className="h-screen prelogin-gradient-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 sm:h-20 flex-shrink-0 bg-[#0B0B0F]/90 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-full flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-2.5 sm:h-3 lg:h-3.5 w-auto" />
          </a>
          
          {/* Navigation - visible on all screens with smaller text on mobile */}
                    <nav className="prelogin-nav flex items-center gap-2 sm:gap-4 lg:gap-8">
                      <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 font-poppins text-[10px] sm:text-sm">IHCC</a>
                      <a href="/faq" className="text-gray-300 font-poppins text-[10px] sm:text-sm">FAQ</a>
                      <a href="/about-us" className="text-white font-poppins text-[10px] sm:text-sm">About Us</a>
                    </nav>
          
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
            <a href="/login" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center border border-white">Log In</a>
            <a href="/signup" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center" style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)' }}>Sign up</a>
          </div>
        </div>
      </header>

      {/* Scrollable container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide relative z-[1] snap-y snap-mandatory"
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
          <div className="max-w-7xl mx-auto text-center relative z-10 px-4">
            <h2 className="font-poppins font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-4 sm:mb-5 leading-tight">
              Capturing Major State<br />Procurement Wins
            </h2>
            <p className="text-[#6bb4b5] font-poppins text-sm sm:text-base mb-6 max-w-3xl mx-auto px-2 leading-relaxed">
              "Each year over $17B in government contracts are awarded by the State of Illinois. However, most small businesses miss out on opportunities because of the complicated submission process, lack of capacity, and the process taking too much time, giving larger corporations advantages. Contract Radar Maximizer is an AI tool that gives small businesses a competitive advantage, making it easier and faster to submit government procurements."
            </p>
            
            {/* Hexagons with Learn More */}
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

              <button
                onClick={() => scrollToSection(1)}
                style={{ flexShrink: 0 }}
                className="inline-flex items-center gap-2 text-[#6bb4b5] font-poppins text-base hover:gap-3 transition-all whitespace-nowrap px-2"
              >
                Learn More <ArrowRight size={18} />
              </button>

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

        {/* Section 2: Meet the Team */}
        <section 
          ref={setSectionRef('team')}
          data-section="team"
          className={`min-h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-visible lg:overflow-hidden flex flex-col justify-start lg:justify-center py-8 lg:py-0 snap-start ${getSectionClass('team')}`}
        >
          <div className="max-w-7xl mx-auto relative z-10 w-full">
            <div className="w-full text-center mb-6 lg:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 tracking-tight font-poppins">
                Meet the Team
              </h2>
              <p className="text-sm sm:text-base text-white max-w-2xl mx-auto font-light leading-relaxed font-poppins px-2">
                Meet the visionary leaders behind Contract Radar Maximizer's
                mission to revolutionize government contracting for small businesses.
              </p>
            </div>

            {/* Mobile: Horizontal scrollable carousel */}
            <div className="lg:hidden w-full overflow-visible">
              <div 
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-2 pb-4 scrollbar-hide -mx-2"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {teamMembers.map((member) => (
                  <div key={member.name} className="flex-shrink-0 w-[85vw] max-w-[342px] snap-center first:ml-2 last:mr-2">
                    <TeamMemberCard
                      name={member.name}
                      role={member.role}
                      description={member.description}
                      imageUrl={member.imageUrl}
                      linkedinUrl={member.linkedinUrl}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: Grid layout */}
            <div className="hidden lg:grid grid-cols-4 gap-6 w-full max-w-[1400px] mx-auto justify-items-center">
              {teamMembers.map((member) => (
                <TeamMemberCard
                  key={member.name}
                  name={member.name}
                  role={member.role}
                  description={member.description}
                  imageUrl={member.imageUrl}
                  linkedinUrl={member.linkedinUrl}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Mission */}
        <section 
          ref={setSectionRef('mission')}
          data-section="mission"
          className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center snap-start ${getSectionClass('mission')}`}
        >
          {/* Soft teal glow background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-1/4 -left-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6"></div>
          </div>
          
          {/* Twinkling stars */}
          <img 
            src="/static/app/landing/left-star-img.svg" 
            alt="" 
            className="absolute top-16 left-[8%] w-8 h-8 animate-twinkle hidden lg:block"
            style={{ animationDelay: '0s' }}
          />
          <img 
            src="/static/app/landing/left-big-star-img.svg" 
            alt="" 
            className="absolute top-[38%] left-[5%] w-12 h-12 animate-twinkle hidden lg:block"
            style={{ animationDelay: '0.5s' }}
          />
          
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
              <div className="order-2 md:order-1 flex items-center justify-center">
                <img 
                  src="/static/app/landing/Mission.svg" 
                  alt="Mission" 
                  className="w-full max-w-[400px] h-auto"
                />
              </div>
              <div className="order-1 md:order-2 text-center md:text-left">
                <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6">Mission</h2>
                <p className="text-gray-400 font-poppins text-base sm:text-lg mb-8 leading-relaxed">
                  To facilitate small businesses' access to government contracts using cutting-edge technology to identify opportunities and maximize the probability of securing contracts.
                </p>
                <a 
                  href="/login" 
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-corama-teal to-[#99c8ca] text-white font-poppins font-semibold px-8 py-3.5 rounded-lg hover:from-[#99c8ca] hover:to-corama-teal transition-all text-base shadow-[0_0_30px_rgba(107,180,181,0.3)]"
                >
                  Get Started
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Vision + Footer */}
        <section 
          ref={setSectionRef('vision')}
          data-section="vision"
          className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-between snap-start ${getSectionClass('vision')}`}
        >
          {/* Soft teal glow background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute bottom-1/4 -right-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6"></div>
          </div>
          
          {/* Twinkling stars */}
          <img 
            src="/static/app/landing/right-star-img.svg" 
            alt="" 
            className="absolute top-[20%] right-[8%] w-8 h-8 animate-twinkle hidden lg:block"
            style={{ animationDelay: '1s' }}
          />
          <img 
            src="/static/app/landing/right-big-star-img.svg" 
            alt="" 
            className="absolute bottom-[40%] right-[5%] w-12 h-12 animate-twinkle hidden lg:block"
            style={{ animationDelay: '1.5s' }}
          />
          
          <div className="flex-1 flex items-center">
            <div className="max-w-6xl mx-auto relative z-10 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
                <div className="text-center md:text-left">
                  <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6">Vision</h2>
                  <p className="text-gray-400 font-poppins text-base sm:text-lg mb-8 leading-relaxed">
                    To empower communities through access to contracts, decentralizing the public economy by extracting value from the public-generated value.
                  </p>
                  <a 
                    href="/login" 
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-corama-teal to-[#99c8ca] text-white font-poppins font-semibold px-8 py-3.5 rounded-lg hover:from-[#99c8ca] hover:to-corama-teal transition-all text-base shadow-[0_0_30px_rgba(107,180,181,0.3)]"
                  >
                    Get Started
                  </a>
                </div>
                <div className="flex justify-center order-first md:order-last">
                  <img 
                    src="/static/app/landing/Vision.svg" 
                    alt="Vision" 
                    className="w-full max-w-[400px] h-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer - with margin-top to prevent touching elements above */}
          <footer className="py-6 px-4 sm:px-6 relative mt-8">
            <div className="max-w-6xl mx-auto relative z-10">
              <div className="text-center mb-4">
                <p className="text-white font-poppins text-xs sm:text-sm leading-relaxed">
                  180 North Michigan Avenue Suite 500 Chicago, IL 60601
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-4 text-xs sm:text-sm">
                <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-corama-teal font-poppins transition-colors">Learn More About IHCC</a>
                <a href="#" className="text-white hover:text-corama-teal font-poppins transition-colors">Terms of Use</a>
                <a href="#" className="text-white hover:text-corama-teal font-poppins transition-colors">Policy Notice</a>
                <a href="#" className="text-white hover:text-corama-teal font-poppins transition-colors">FAQ</a>
              </div>
              
              {/* CORAMA Logo */}
              <div className="flex justify-center">
                <img 
                  src="/static/app/landing/corama-logo.png" 
                  alt="CORAMA" 
                  className="h-12 sm:h-16 w-auto"
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

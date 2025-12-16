import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'

const HEADER_HEIGHT = 80 // Height of the fixed header in pixels
const SECTION_IDS = ['hero', 'features', 'scope-revolution', 'mission-vision', 'testimonial-footer']

const LandingPage = () => {
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
    
    // Cooldown to prevent rapid scrolling
    setTimeout(() => setIsScrolling(false), 800)
  }, [isScrolling])

  const scrollToFeatures = () => {
    scrollToSection(1) // Features is index 1
  }

  // Handle wheel events for snap scrolling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      if (isScrolling) return
      
      if (e.deltaY > 0) {
        // Scroll down - go to next section
        scrollToSection(currentSection + 1)
      } else if (e.deltaY < 0) {
        // Scroll up - go to previous section
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

  // Section class for full-height sections with fade animation
  const getSectionClass = (sectionId: string) => {
    const sectionIndex = SECTION_IDS.indexOf(sectionId)
    const isActive = currentSection === sectionIndex
    return `min-h-[calc(100vh-${HEADER_HEIGHT}px)] flex flex-col justify-center transition-opacity duration-500 ${
      isActive ? 'opacity-100' : 'opacity-70'
    }`
  }

  return (
    <div className="h-screen bg-[#0B0B0F] flex flex-col overflow-hidden">
      {/* Header - Fixed at top */}
      <header className="h-20 flex-shrink-0 bg-[#0B0B0F]/90 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-4 sm:h-5 w-auto" />
          </div>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">IHCC</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">Support</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">FAQ</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="/login" className="text-white font-poppins text-xs sm:text-sm hover:text-corama-teal transition-colors">Log In</a>
            <a href="/signup" className="bg-corama-teal text-[#0B0B0F] font-poppins text-xs sm:text-sm font-semibold px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-[#99c8ca] transition-colors">Sign up</a>
          </div>
        </div>
      </header>

      {/* Scrollable container - takes remaining height below header */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide"
        style={{ 
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE/Edge */
        }}
      >
      {/* Hero Section */}
      <section 
        ref={setSectionRef('hero')}
        data-section="hero"
        className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center ${getSectionClass('hero')}`}
      >
        {/* Layer 0: Center gradient glow (degradate.svg effect) */}
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
          <img 
            src="/static/app/landing/degradate.svg" 
            alt="" 
            aria-hidden="true"
            className="w-[120%] max-w-[1400px] h-auto opacity-80"
          />
        </div>
        
        {/* Layer 1: Orbital lines (orbit.svg) */}
        <div className="absolute inset-0 pointer-events-none z-[1] flex items-center justify-center">
          <img 
            src="/static/app/landing/orbit.svg" 
            alt="" 
            aria-hidden="true"
            className="w-[140%] max-w-[2000px] h-auto"
            style={{ transform: 'translateY(-5%)' }}
          />
        </div>
        
        {/* Layer 2: 3D Spheres */}
        {/* Left sphere */}
        <div className="absolute left-[5%] sm:left-[8%] top-[35%] sm:top-[40%] pointer-events-none z-[2] hidden sm:block">
          <img 
            src="/static/app/landing/sphere.svg" 
            alt="" 
            aria-hidden="true"
            className="w-[100px] sm:w-[130px] lg:w-[160px] h-auto"
          />
        </div>
        {/* Right sphere */}
        <div className="absolute right-[3%] sm:right-[5%] top-[50%] sm:top-[55%] pointer-events-none z-[2] hidden sm:block">
          <img 
            src="/static/app/landing/sphere.svg" 
            alt="" 
            aria-hidden="true"
            className="w-[120px] sm:w-[150px] lg:w-[180px] h-auto"
          />
        </div>
        
        {/* Layer 3: Decorative stars */}
        {/* Star top-center (above title) */}
        <div className="absolute top-[18%] left-[32%] pointer-events-none z-[3] hidden sm:block">
          <img src="/static/app/landing/star2-img.svg" alt="" aria-hidden="true" className="w-[16px] h-auto opacity-90" />
        </div>
        {/* Star mid-left */}
        <div className="absolute top-[32%] left-[18%] pointer-events-none z-[3] hidden sm:block">
          <img src="/static/app/landing/star-img.svg" alt="" aria-hidden="true" className="w-[28px] h-auto" />
        </div>
        {/* Star mid-right (larger, rotated) */}
        <div className="absolute top-[28%] right-[12%] pointer-events-none z-[3] hidden lg:block">
          <img src="/static/app/landing/star1-img.svg" alt="" aria-hidden="true" className="w-[32px] h-auto" />
        </div>
        {/* Star bottom-left (near button) */}
        <div className="absolute bottom-[28%] left-[28%] pointer-events-none z-[3] hidden sm:block">
          <img src="/static/app/landing/star3-img.svg" alt="" aria-hidden="true" className="w-[20px] h-auto opacity-80" />
        </div>
        {/* Star bottom-right */}
        <div className="absolute bottom-[32%] right-[25%] pointer-events-none z-[3] hidden sm:block">
          <img src="/static/app/landing/star4-img.svg" alt="" aria-hidden="true" className="w-[24px] h-auto" />
        </div>
        
        {/* Layer 10: Content */}
        <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in">
          <h1 className="font-poppins font-black text-4xl sm:text-5xl md:text-7xl text-white mb-4 sm:mb-6 leading-tight tracking-tight">
            With AI Find<br />Contracts
          </h1>
          <p className="text-gray-400 font-poppins text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-8 sm:mb-10 px-2 leading-relaxed">
            From finding the right contracts to automating winning proposals. Contract Radar Maximizer revolutionizes government contracting streamlining processes, boosting efficiency, and giving you a competitive edge.
          </p>
          <a 
            href="/login" 
            className="inline-flex items-center gap-2 bg-[#0B0B0F]/60 border border-corama-teal/60 text-white font-poppins font-semibold px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg hover:bg-corama-teal hover:text-[#0B0B0F] transition-all text-sm sm:text-base backdrop-blur-sm"
          >
            Get Started
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section 
        id="features" 
        ref={setSectionRef('features')}
        data-section="features"
        className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center ${getSectionClass('features')}`}
      >
        {/* Layer 0: Soft teal glow backgrounds - diffused elliptical gradients */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Top-left teal glow */}
          <div className="absolute top-0 -left-32 w-[700px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6"></div>
          {/* Bottom-right teal glow */}
          <div className="absolute bottom-0 -right-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.2)_0%,rgba(26,58,74,0.12)_40%,transparent_70%)] -rotate-6"></div>
        </div>
        
        {/* Decorative stars - more visible */}
        <div className="absolute top-16 left-16 text-corama-teal hidden lg:block">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" className="opacity-50">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        <div className="absolute top-32 right-24 text-corama-teal hidden lg:block">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="opacity-40">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        <div className="absolute bottom-32 right-16 text-corama-teal hidden lg:block">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="opacity-35">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        <div className="absolute bottom-48 left-24 text-corama-teal hidden lg:block">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="opacity-30">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Feature 1 - Smart Contract Matching */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="flex justify-center mb-5 sm:mb-6">
                <img src="/static/app/landing/SmartContractMatching.svg" alt="Smart Contract Matching" className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
              <h3 className="font-poppins font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Smart Contract Matching</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Our AI analyzes thousands of contracts in seconds, using advanced vector similarity to find opportunities perfectly matched to your capabilities and experience.
              </p>
              <a href="/login" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Get Started <ArrowRight size={14} />
              </a>
            </div>

            {/* Feature 2 - Automated Proposal Generation */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="flex justify-center mb-5 sm:mb-6">
                <img src="/static/app/landing/AutomatedProposalGeneration.svg" alt="Automated Proposal Generation" className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
              <h3 className="font-poppins font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Automated Proposal Generation</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Generate compelling, tailored bid responses instantly. Our AI assistant crafts professional proposals that highlight your strengths and address specific requirements.
              </p>
              <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Learn More <ArrowRight size={14} />
              </button>
            </div>

            {/* Feature 3 - Compliance Intelligence */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="flex justify-center mb-5 sm:mb-6">
                <img src="/static/app/landing/ComplianceIntelligence.svg" alt="Compliance Intelligence" className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
              <h3 className="font-poppins font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Compliance Intelligence</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Never miss a requirement again. AI-powered compliance checking ensures your proposals meet all specifications and regulatory standards automatically.
              </p>
              <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Learn More <ArrowRight size={14} />
              </button>
            </div>

            {/* Feature 4 - Win Probability Scoring */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="flex justify-center mb-5 sm:mb-6">
                <img src="/static/app/landing/WinProbabilityScoring.svg" alt="Win Probability Scoring" className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
              <h3 className="font-poppins font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Win Probability Scoring</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Get real-time insights into your chances of success. Our predictive AI analyzes historical data to score opportunities and optimize your bidding strategy.
              </p>
              <a href="/login" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Get Started <ArrowRight size={14} />
              </a>
            </div>

            {/* Feature 5 - Intelligent Market Research */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="flex justify-center mb-5 sm:mb-6">
                <img src="/static/app/landing/IntelligentMarketResearch.svg" alt="Intelligent Market Research" className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
              <h3 className="font-poppins font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Intelligent Market Research</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Stay ahead of the competition with AI-driven market intelligence. Discover trends, analyze competitors, and identify emerging opportunities automatically.
              </p>
              <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Learn More <ArrowRight size={14} />
              </button>
            </div>

            {/* Feature 6 - Smart Deadline Management */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="flex justify-center mb-5 sm:mb-6">
                <img src="/static/app/landing/SmartDeadlineManagement.svg" alt="Smart Deadline Management" className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
              <h3 className="font-poppins font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Smart Deadline Management</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Never miss another deadline. AI-powered scheduling and alerts keep you on track with automated reminders and priority-based task management.
              </p>
              <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Learn More <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Scope of Work + Revolutionizing Section (Grouped) */}
      <section 
        ref={setSectionRef('scope-revolution')}
        data-section="scope-revolution"
        className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center ${getSectionClass('scope-revolution')}`}
      >
        {/* Soft teal glow background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 -left-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6 -translate-y-1/2"></div>
        </div>
        
        {/* Scope of Work */}
        <div className="max-w-6xl mx-auto relative z-10 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="bg-gradient-to-br from-[#0f1a24] via-[#0d1620] to-[#0B0B0F] border border-corama-teal/20 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(107,180,181,0.1)]">
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800" 
                alt="Work Station" 
                className="w-full h-56 sm:h-72 lg:h-80 object-cover"
                onError={(e) => { e.currentTarget.src = 'https://placehold.co/800x400/0b2c48/6bb4b5?text=Work+Station' }}
              />
            </div>
            <div className="text-center md:text-left">
              <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6">Scope Of Work Station</h2>
              <p className="text-gray-400 font-poppins text-base sm:text-lg mb-8 leading-relaxed">
                Get the scope of work of your desired contract in minutes with clear, structured responses, and more.
              </p>
              <a 
                href="/login" 
                className="inline-flex items-center gap-2 bg-transparent border-2 border-white text-white font-poppins font-semibold px-8 py-3.5 rounded-lg hover:bg-white hover:text-[#0B0B0F] transition-all text-base"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>

        {/* Revolutionizing Government Contracting */}
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Section background glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.1)_0%,transparent_70%)] rounded-full"></div>
          </div>
          
          <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6 leading-tight">
            Revolutionizing Government<br />Contracting for Small<br />Businesses
          </h2>
          <p className="text-gray-400 font-poppins text-base sm:text-lg mb-8 max-w-3xl mx-auto px-2 leading-relaxed">
            Contract Radar Maximizer is a deep data science platform that integrates artificial intelligence and machine learning to assist small businesses in creating capability statements, identifying available government contracts in their area, and generating potential bid responses.
          </p>
          <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-base hover:gap-3 transition-all">
            Learn More <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Mission + Vision Section (Grouped) */}
      <section 
        ref={setSectionRef('mission-vision')}
        data-section="mission-vision"
        className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center ${getSectionClass('mission-vision')}`}
      >
        {/* Soft teal glow background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 -left-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6"></div>
          <div className="absolute bottom-1/4 -right-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6"></div>
        </div>
        
        {/* Decorative star */}
        <div className="absolute top-20 left-10 text-corama-teal/30 hidden lg:block">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        
        {/* Mission */}
        <div className="max-w-6xl mx-auto relative z-10 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="order-2 md:order-1 flex items-center justify-center">
              <img 
                src="/static/app/landing/Contract.svg" 
                alt="Contract" 
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
                className="inline-flex items-center gap-2 bg-gradient-to-r from-corama-teal to-[#99c8ca] text-[#0B0B0F] font-poppins font-semibold px-8 py-3.5 rounded-lg hover:from-[#99c8ca] hover:to-corama-teal transition-all text-base shadow-[0_0_30px_rgba(107,180,181,0.3)]"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>

        {/* Vision */}
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="text-center md:text-left">
              <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6">Vision</h2>
              <p className="text-gray-400 font-poppins text-base sm:text-lg mb-8 leading-relaxed">
                To empower communities through access to contracts, decentralizing the public economy by extracting value from the public-generated value.
              </p>
              <a 
                href="/login" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-corama-teal to-[#99c8ca] text-[#0B0B0F] font-poppins font-semibold px-8 py-3.5 rounded-lg hover:from-[#99c8ca] hover:to-corama-teal transition-all text-base shadow-[0_0_30px_rgba(107,180,181,0.3)]"
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
      </section>

      {/* Capturing Major State Procurement Wins + Footer (Grouped) */}
      <section 
        ref={setSectionRef('testimonial-footer')}
        data-section="testimonial-footer"
        className={`h-[calc(100vh-80px)] px-2 sm:px-4 relative bg-[#0B0B0F] flex flex-col justify-between ${getSectionClass('testimonial-footer')}`}
      >
        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-7xl mx-auto text-center relative z-10 px-4">
            <h2 className="font-poppins font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-4 sm:mb-5 leading-tight">
              Capturing Major State<br />Procurement Wins
            </h2>
            <p className="text-gray-400 font-poppins text-sm sm:text-base mb-4 max-w-3xl mx-auto px-2 leading-relaxed">
              "Each year over $17B in government contracts are awarded by the State of Illinois. However, most small businesses miss out on opportunities because of the complicated submission process, lack of capacity, and the process taking too much time, giving larger corporations advantages. Contract Radar Maximizer is an AI tool that gives small businesses a competitive advantage, making it easier and faster to submit government procurements."
            </p>
            
            {/* Learn More BETWEEN HEXAGONS - with soft oval glow */}
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
              {/* Left hexagon group */}
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
                  className="relative z-10 w-full h-auto translate-y-[50px]"
                  style={{ maxWidth: '100%' }}
                />
              </div>

              {/* Learn More button */}
              <button
                onClick={scrollToFeatures}
                style={{ flexShrink: 0 }}
                className="inline-flex items-center gap-2 text-corama-teal font-poppins text-base hover:gap-3 transition-all whitespace-nowrap px-2"
              >
                Learn More <ArrowRight size={18} />
              </button>

              {/* Right hexagon group (mirrored) */}
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
                  className="relative z-10 w-full h-auto translate-y-[50px] scale-x-[-1]"
                  style={{ maxWidth: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer - at bottom of section */}
        <footer className="py-6 px-4 sm:px-6 bg-[#0B0B0F] relative">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-4">
              <p className="text-gray-400 font-poppins text-xs sm:text-sm leading-relaxed">
                222 W. Merchandise Mart Plaza, Suite 1212 c/o 1871 Chicago, IL 60654
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-4 text-xs sm:text-sm">
              <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">Learn More About IHCC</a>
              <a href="#" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">Terms of Use</a>
              <a href="#" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">Policy Notice</a>
              <a href="#" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">FAQ</a>
              <a href="#" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">Contact</a>
            </div>
            
            <div className="text-center mb-4">
              <a href="mailto:info@corama.ai" className="text-gray-400 hover:text-corama-teal font-poppins text-xs sm:text-sm transition-colors">
                Info@corama.ai
              </a>
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

export default LandingPage

import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'
import Dither from '../components/Dither'

const HEADER_HEIGHT = 80 // Height of the fixed header in pixels
const SECTION_IDS = ['hero', 'features', 'scope-revolution', 'mission-vision', 'testimonial-footer']

// FeatureCard component with animation elements
interface FeatureCardProps {
  icon: string
  title: string
  description: string
  onLearnMore: () => void
}

const FeatureCard = ({ icon, title, description, onLearnMore }: FeatureCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const layer1Ref = useRef<HTMLDivElement>(null)
  const layer2Ref = useRef<HTMLDivElement>(null)
  const isHoveredRef = useRef(false)
  const animationCompleteRef = useRef(false)
  
  const applyParallaxEffect = useCallback((x: number, y: number) => {
    const tiltY = (x - 0.5) * 60
    const layers = [layer1Ref.current, layer2Ref.current]
    
    layers.forEach((layer, index) => {
      if (!layer) return
      const depthX = index * 30
      const depthY = index * 13
      const moveX = (x - 0.5) * depthX
      const moveY = (y - 0.5) * depthY
      layer.style.transform = `translate(${moveX}px, ${moveY}px) rotateY(${tiltY}deg)`
      
      // Color change effect based on x position (hue shift)
      const hue = (x - 0.5) * 80 // -40 to +40 degrees
      layer.style.filter = `hue-rotate(${hue}deg) saturate(1.4) brightness(${1 + (x - 0.5) * 0.3})`
    })
  }, [])
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    isHoveredRef.current = true
    applyParallaxEffect(x, y)
  }
  
  const handleMouseLeave = () => {
    isHoveredRef.current = false
    // Reset to center position smoothly
    const layers = [layer1Ref.current, layer2Ref.current]
    layers.forEach(layer => {
      if (!layer) return
      layer.style.transform = 'translate(0px, 0px) rotateY(0deg)'
      layer.style.filter = 'hue-rotate(0deg) saturate(1) brightness(1)'
    })
  }
  
  // Auto-animation on load - runs ONCE
  useEffect(() => {
    let progress = 0
    let animationId: number
    
    function animate() {
      if (isHoveredRef.current || animationCompleteRef.current) return
      progress += 0.005
      const x = Math.sin(progress) * 0.5 + 0.5
      const y = 0.5
      applyParallaxEffect(x, y)
      if (progress < Math.PI * 2) {
        animationId = requestAnimationFrame(animate)
      } else {
        animationCompleteRef.current = true
        // Reset to center after animation completes
        const layers = [layer1Ref.current, layer2Ref.current]
        layers.forEach(layer => {
          if (!layer) return
          layer.style.transform = 'translate(0px, 0px) rotateY(0deg)'
          layer.style.filter = 'hue-rotate(0deg) saturate(1) brightness(1)'
        })
      }
    }
    animate()
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [applyParallaxEffect])
  
  return (
    <div 
      ref={cardRef}
      className="feature-card bg-[#1a1b23] border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group flex flex-col h-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card content - icon at top with parallax layers */}
      <div className="flex justify-center mb-5 sm:mb-6 relative z-10" style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}>
        <div className="relative w-16 h-16 sm:w-20 sm:h-20">
          {/* Parallax Layer 1 - Back layer (shadow/glow) */}
          <div 
            ref={layer1Ref}
            className="absolute inset-0 transition-transform duration-100 ease-out"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <img src={icon} alt="" className="w-full h-full opacity-30 blur-sm scale-110" />
          </div>
          {/* Parallax Layer 2 - Front layer (main icon) */}
          <div 
            ref={layer2Ref}
            className="absolute inset-0 transition-transform duration-100 ease-out"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <img src={icon} alt={title} className="w-full h-full" />
          </div>
        </div>
      </div>
      <h3 className="font-poppins font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4 min-h-[56px] text-center relative z-10">{title}</h3>
      <p className="text-[#B6F8F9] font-poppins text-sm leading-relaxed flex-grow text-center relative z-10">
        {description}
      </p>
      <div className="mt-5 sm:mt-6 text-center relative z-10">
        <button onClick={onLearnMore} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
          Learn more <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

// RadarAnimation component for Hero section
const RadarAnimation = () => {
  const particlesContainerRef = useRef<HTMLDivElement>(null)
  const targetsContainerRef = useRef<HTMLDivElement>(null)
  
  const SCAN_DURATION = 10000
  const WAKE_OFFSET = -650
  
  const createRadarBlip = useCallback(() => {
    if (!targetsContainerRef.current) return
    
    const blip = document.createElement('div')
    blip.className = 'radar-blip'
    
    const pastTime = Date.now() + WAKE_OFFSET
    const progress = (pastTime % SCAN_DURATION) / SCAN_DURATION
    const theta = (progress * Math.PI * 2) - (Math.PI / 2)
    
    const r = 12 + Math.random() * 36
    const variance = (Math.random() - 0.5) * 0.05
    const finalTheta = theta + variance
    
    const x = 50 + r * Math.cos(finalTheta)
    const y = 50 + r * Math.sin(finalTheta)
    
    blip.style.left = `${x}%`
    blip.style.top = `${y}%`
    
    targetsContainerRef.current.appendChild(blip)
    setTimeout(() => blip.remove(), 4000)
  }, [])
  
  const createSynchronizedParticle = useCallback(() => {
    if (!particlesContainerRef.current) return
    
    const p = document.createElement('div')
    p.className = 'radar-particle'
    
    const randomOffset = WAKE_OFFSET - (Math.random() * 400)
    const pastTime = Date.now() + randomOffset
    
    const progress = (pastTime % SCAN_DURATION) / SCAN_DURATION
    const theta = (progress * Math.PI * 2) - (Math.PI / 2)
    
    const r = Math.random() * 90
    
    const x = 50 + r * Math.cos(theta)
    const y = 50 + r * Math.sin(theta)
    
    const s = Math.random() * 3 + 1
    
    p.style.width = `${s}px`
    p.style.height = `${s}px`
    p.style.left = `${x}%`
    p.style.top = `${y}%`
    
    particlesContainerRef.current.appendChild(p)
    setTimeout(() => p.remove(), 5000)
  }, [])
  
  useEffect(() => {
    let targetTimeoutId: ReturnType<typeof setTimeout>
    let particleIntervalId: ReturnType<typeof setInterval>
    
    const targetLoop = () => {
      if (Math.random() > 0.4) {
        createRadarBlip()
      }
      targetTimeoutId = setTimeout(targetLoop, 150)
    }
    
    targetLoop()
    particleIntervalId = setInterval(createSynchronizedParticle, 20)
    
    return () => {
      clearTimeout(targetTimeoutId)
      clearInterval(particleIntervalId)
    }
  }, [createRadarBlip, createSynchronizedParticle])
  
  return (
    <>
      <div ref={particlesContainerRef} className="radar-particles-container" />
      <div className="radar-background">
        <div className="radar-circle">
          <div ref={targetsContainerRef} className="radar-targets-container" />
        </div>
      </div>
    </>
  )
}

const LandingPage = () => {
  const [currentSection, setCurrentSection] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [parallaxStyle, setParallaxStyle] = useState<React.CSSProperties>({})
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

  // Feature card IntersectionObserver for scroll-triggered animations
  useEffect(() => {
    const cards = document.querySelectorAll('.feature-card')
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Array.from(cards).indexOf(entry.target)
          setTimeout(() => {
            entry.target.classList.add('is-active')
            setTimeout(() => entry.target.classList.remove('is-active'), 2000)
          }, index * 150)
        }
      })
    }, { threshold: 0.3 })
    
    cards.forEach((card) => observer.observe(card))
    
    return () => observer.disconnect()
  }, [])

  // Parallax effect handler for Scope of Work section
  const handleParallaxMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2 // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2 // -1 to 1
    setParallaxStyle({
      '--parallax-x': x,
      '--parallax-y': y,
    } as React.CSSProperties)
  }

  const handleParallaxLeave = () => {
    setParallaxStyle({
      '--parallax-x': 0,
      '--parallax-y': 0,
    } as React.CSSProperties)
  }

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
    <div className="h-screen bg-[#0B0B0F] flex flex-col overflow-hidden relative">
      {/* Dither Background - covers entire page */}
      <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }}>
        <Dither 
          waveColor={[0.56, 0.73, 0.74]}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={4}
          pixelSize={2}
        />
      </div>
      
      {/* Header - Fixed at top */}
      <header className="h-20 flex-shrink-0 bg-[#0B0B0F]/90 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-3 sm:h-3.5 w-auto" />
          </div>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">IHCC</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">Support</a>
            <a href="/faq" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">FAQ</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="/login" className="text-white font-poppins text-xs sm:text-sm hover:text-corama-teal transition-colors">Log In</a>
            <a href="/signup" className="text-white font-poppins text-xs sm:text-sm font-semibold py-2 sm:py-2.5 rounded-lg hover:opacity-90 transition-all text-center" style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)', width: '96px' }}>Sign up</a>
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
        {/* Radar Animation Background */}
        <RadarAnimation />
        
        {/* Content */}
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="font-poppins font-black text-5xl sm:text-6xl md:text-8xl text-white mb-4 sm:mb-6 leading-tight tracking-tight">
            With AI Find<br />
            Contracts
          </h1>
          <p className="text-white font-poppins text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-8 sm:mb-10 px-2 leading-relaxed">
            From finding the right contracts to automating winning proposals. Contract Radar Maximizer revolutionizes government contracting streamlining processes, boosting efficiency, and giving you a competitive edge.
          </p>
          <a 
            href="/login" 
            className="inline-flex items-center gap-2 text-white font-poppins font-semibold px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg hover:opacity-90 transition-all text-sm sm:text-base"
            style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)' }}
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
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
            <FeatureCard
              icon="/static/app/landing/SmartContractMatching.svg"
              title="Smart Contract Matching"
              description="Our AI analyzes thousands of contracts in seconds, using advanced vector similarity to find opportunities perfectly matched to your capabilities and experience."
              onLearnMore={scrollToFeatures}
            />
            <FeatureCard
              icon="/static/app/landing/AutomatedProposalGeneration.svg"
              title="Automated Proposal Generation"
              description="Generate compelling, tailored bid responses instantly. Our AI assistant crafts professional proposals that highlight your strengths and address specific requirements."
              onLearnMore={scrollToFeatures}
            />
            <FeatureCard
              icon="/static/app/landing/ComplianceIntelligence.svg"
              title="Compliance Intelligence"
              description="Never miss a requirement again. AI-powered compliance checking ensures your proposals meet all specifications and regulatory standards automatically."
              onLearnMore={scrollToFeatures}
            />
            <FeatureCard
              icon="/static/app/landing/WinProbabilityScoring.svg"
              title="Win Probability Scoring"
              description="Get real-time insights into your chances of success. Our predictive AI analyzes historical data to score opportunities and optimize your bidding strategy."
              onLearnMore={scrollToFeatures}
            />
            <FeatureCard
              icon="/static/app/landing/IntelligentMarketResearch.svg"
              title="Intelligent Market Research"
              description="Stay ahead of the competition with AI-driven market intelligence. Discover trends, analyze competitors, and identify emerging opportunities automatically."
              onLearnMore={scrollToFeatures}
            />
            <FeatureCard
              icon="/static/app/landing/SmartDeadlineManagement.svg"
              title="Smart Deadline Management"
              description="Never miss another deadline. AI-powered scheduling and alerts keep you on track with automated reminders and priority-based task management."
              onLearnMore={scrollToFeatures}
            />
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
        
        {/* Scope of Work - with parallax effect */}
        <div 
          className="max-w-6xl mx-auto relative z-10 mb-24 parallax-section"
          onMouseMove={handleParallaxMove}
          onMouseLeave={handleParallaxLeave}
          style={parallaxStyle}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="parallax-image">
              <img 
                src="/static/app/landing/Scope.svg" 
                alt="Scope of Work Station" 
                className="w-full h-56 sm:h-72 lg:h-80 object-contain"
              />
            </div>
            <div className="text-center md:text-left parallax-text">
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
          <p className="text-[#6bb4b5] font-poppins text-base sm:text-lg mb-8 max-w-3xl mx-auto px-2 leading-relaxed">
            Contract Radar Maximizer is a deep data science platform that integrates artificial intelligence and machine learning to assist small businesses in creating capability statements, identifying available government contracts in their area, and generating potential bid responses.
          </p>
          <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-[#6bb4b5] font-poppins text-base hover:gap-3 transition-all">
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
        
        {/* Mission */}
        <div className="max-w-6xl mx-auto relative z-10 mb-24">
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
            <p className="text-[#6bb4b5] font-poppins text-sm sm:text-base mb-4 max-w-3xl mx-auto px-2 leading-relaxed">
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
                className="inline-flex items-center gap-2 text-[#6bb4b5] font-poppins text-base hover:gap-3 transition-all whitespace-nowrap px-2"
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
              <p className="text-white font-poppins text-xs sm:text-sm leading-relaxed">
                222 W. Merchandise Mart Plaza, Suite 1212 c/o 1871 Chicago, IL 60654
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-4 text-xs sm:text-sm">
              <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-corama-teal font-poppins transition-colors">Learn More About IHCC</a>
              <a href="#" className="text-white hover:text-corama-teal font-poppins transition-colors">Terms of Use</a>
              <a href="#" className="text-white hover:text-corama-teal font-poppins transition-colors">Policy Notice</a>
              <a href="#" className="text-white hover:text-corama-teal font-poppins transition-colors">FAQ</a>
              <a href="#" className="text-white hover:text-corama-teal font-poppins transition-colors">Contact</a>
            </div>
            
            <div className="text-center mb-4">
              <a href="mailto:info@corama.ai" className="text-white hover:text-corama-teal font-poppins text-xs sm:text-sm transition-colors">
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

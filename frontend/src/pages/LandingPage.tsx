import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'
import Waves from '../components/Waves'

const HEADER_HEIGHT = 80 // Height of the fixed header in pixels
const SECTION_IDS = ['hero', 'features', 'scope-revolution', 'footer']

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
  const animationRef = useRef<number | null>(null)
  const hasInteracted = useRef(false)
  
  // Apply parallax effect to both layers
  const applyParallaxEffect = useCallback((x: number, y: number) => {
    const layers = [layer1Ref.current, layer2Ref.current].filter(Boolean) as HTMLDivElement[]
    const tiltY = (x - 0.5) * 60 // Y rotation based on X position
    
    layers.forEach((layer, index) => {
      const depthX = index * 30 // X depth per layer
      const depthY = index * 13 // Y depth per layer
      const moveX = (x - 0.5) * depthX
      const moveY = (y - 0.5) * depthY
      layer.style.transform = `translate(${moveX}px, ${moveY}px) rotateY(${tiltY}deg)`
      
      // Color change
      const hue = (x - 0.5) * 80 // -40 to +40 degrees
      layer.style.filter = `hue-rotate(${hue}deg) saturate(1.4) brightness(${1 + (x - 0.5) * 0.3})`
    })
  }, [])
  
  // Reset parallax effect
  const resetParallaxEffect = useCallback(() => {
    const layers = [layer1Ref.current, layer2Ref.current].filter(Boolean) as HTMLDivElement[]
    layers.forEach((layer) => {
      layer.style.transform = 'translate(0px, 0px) rotateY(0deg)'
      layer.style.filter = 'hue-rotate(0deg) saturate(1) brightness(1)'
    })
  }, [])
  
  // Auto-animation on load (once)
  useEffect(() => {
    let progress = 0
    
    const tick = () => {
      if (hasInteracted.current) {
        resetParallaxEffect()
        return
      }
      
      progress += 0.005
      const x = Math.sin(progress) * 0.5 + 0.5 // Oscillates from 0 to 1
      const y = 0.5
      applyParallaxEffect(x, y)
      
      if (progress < Math.PI * 2) {
        animationRef.current = requestAnimationFrame(tick)
      } else {
        resetParallaxEffect()
      }
    }
    
    animationRef.current = requestAnimationFrame(tick)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [applyParallaxEffect, resetParallaxEffect])
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    hasInteracted.current = true
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width // 0 to 1
    const y = (e.clientY - rect.top) / rect.height // 0 to 1
    
    // Clamp values to 0-1 range
    const clampedX = Math.max(0, Math.min(1, x))
    const clampedY = Math.max(0, Math.min(1, y))
    
    applyParallaxEffect(clampedX, clampedY)
  }
  
  const handleMouseLeave = () => {
    resetParallaxEffect()
  }
  
  return (
    <div 
      ref={cardRef}
      className="feature-card bg-[#1a1b23] border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group flex flex-col h-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card content - icon at top with 2-layer parallax */}
      <div className="flex justify-center mb-5 sm:mb-6 relative z-10">
        <div 
          className="relative w-16 h-16 sm:w-20 sm:h-20"
          style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        >
          {/* Layer 1 - Background (shadow/glow) */}
          <div 
            ref={layer1Ref} 
            className="absolute inset-0 transition-transform duration-100 ease-out"
            style={{ willChange: 'transform, filter' }}
          >
            <img src={icon} alt="" className="w-full h-full opacity-30 blur-sm scale-110" />
          </div>
          
          {/* Layer 2 - Main (visible icon) */}
          <div 
            ref={layer2Ref} 
            className="absolute inset-0 transition-transform duration-100 ease-out"
            style={{ willChange: 'transform, filter' }}
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
      
      {/* Animation overlay elements - positioned below icon area */}
      <div className="card-shine"></div>
      <div className="card-background"></div>
      <div className="card-tiles">
        <div className="card-tile tile-1"></div>
        <div className="card-tile tile-2"></div>
        <div className="card-tile tile-3"></div>
        <div className="card-tile tile-4"></div>
        <div className="card-tile tile-5"></div>
        <div className="card-tile tile-6"></div>
        <div className="card-tile tile-7"></div>
        <div className="card-tile tile-8"></div>
        <div className="card-tile tile-9"></div>
        <div className="card-tile tile-10"></div>
      </div>
      <div className="card-line line-1"></div>
      <div className="card-line line-2"></div>
      <div className="card-line line-3"></div>
    </div>
  )
}

// Radar Animation Component
const RadarAnimation = () => {
  const particlesContainerRef = useRef<HTMLDivElement>(null)
  const targetsContainerRef = useRef<HTMLDivElement>(null)
  const lastTickRef = useRef<number>(-1)
  const startTimeRef = useRef<number>(Date.now())
  
  const SCAN_DURATION = 10000
  const TICKS_PER_REVOLUTION = 24
  const BLIP_TRAIL_OFFSET = 0.08
  
  const createRadarBlip = useCallback((tickProgress: number) => {
    if (!targetsContainerRef.current) return
    
    const blip = document.createElement('div')
    blip.className = 'radar-blip'
    
    const theta = ((tickProgress - BLIP_TRAIL_OFFSET) * Math.PI * 2) - (Math.PI / 2)
    
    const r = 12 + Math.random() * 36
    const variance = (Math.random() - 0.5) * 0.03
    const finalTheta = theta + variance
    
    const x = 50 + r * Math.cos(finalTheta)
    const y = 50 + r * Math.sin(finalTheta)
    
    blip.style.left = `${x}%`
    blip.style.top = `${y}%`
    
    targetsContainerRef.current.appendChild(blip)
    setTimeout(() => blip.remove(), 4000)
  }, [])
  
  const createSynchronizedParticle = useCallback((progress: number) => {
    if (!particlesContainerRef.current) return
    
    const p = document.createElement('div')
    p.className = 'radar-particle'
    
    const trailOffset = BLIP_TRAIL_OFFSET + (Math.random() * 0.04)
    const theta = ((progress - trailOffset) * Math.PI * 2) - (Math.PI / 2)
    
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
    let animationId: number
    let particleIntervalId: ReturnType<typeof setInterval>
    
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const progress = (elapsed % SCAN_DURATION) / SCAN_DURATION
      const currentTick = Math.floor(progress * TICKS_PER_REVOLUTION)
      
      if (currentTick !== lastTickRef.current) {
        lastTickRef.current = currentTick
        if (Math.random() > 0.3) {
          createRadarBlip(progress)
        }
      }
      
      animationId = requestAnimationFrame(animate)
    }
    
    animate()
    particleIntervalId = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const progress = (elapsed % SCAN_DURATION) / SCAN_DURATION
      createSynchronizedParticle(progress)
    }, 20)
    
    return () => {
      cancelAnimationFrame(animationId)
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
    <div className="h-screen bg-[#0B0B0F] flex flex-col overflow-hidden">
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
            <a href="/about-us" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="/login" className="text-white font-poppins text-xs sm:text-sm font-semibold py-2 sm:py-2.5 rounded-lg hover:opacity-90 transition-all text-center border border-white" style={{ width: '96px' }}>Log In</a>
            <a href="/signup" className="text-white font-poppins text-xs sm:text-sm font-semibold py-2 sm:py-2.5 rounded-lg hover:opacity-90 transition-all text-center" style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)', width: '96px' }}>Sign up</a>
          </div>
        </div>
      </header>

      {/* Global Waves Background Animation - covers entire landing page */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ top: '80px' }}>
        <Waves
          lineColor="#0B2C48"
          backgroundColor="rgba(11, 44, 72, 0.2)"
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
        />
      </div>

      {/* Scrollable container - takes remaining height below header */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide relative z-[1] snap-y snap-mandatory"
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
        className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center snap-start ${getSectionClass('hero')}`}
      >
        {/* Radar Animation - only in hero section */}
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <RadarAnimation />
        </div>
        
        {/* Layer 10: Content */}
        <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in">
          <h1 className="font-poppins font-black text-5xl sm:text-6xl md:text-8xl text-white mb-4 sm:mb-6 leading-tight tracking-tight">
            Find contracts<br />
            in seconds
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
        className={`h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center snap-start ${getSectionClass('features')}`}
      >
        {/* Layer 0: Soft teal glow backgrounds - diffused elliptical gradients */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Top-left teal glow */}
          <div className="absolute top-0 -left-32 w-[700px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6"></div>
          {/* Bottom-right teal glow */}
          <div className="absolute bottom-0 -right-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.2)_0%,rgba(26,58,74,0.12)_40%,transparent_70%)] -rotate-6"></div>
        </div>
        
        {/* Decorative stars with twinkling effect - positioned closer to cards (75% bigger) */}
        {/* Left side stars - closer to the cards */}
        <div className="absolute left-[8%] sm:left-[10%] lg:left-[12%] top-1/2 -translate-y-1/2 hidden lg:block">
          {/* Small star 1 - top left */}
          <img 
            src="/static/app/landing/StarCardLeft1.svg" 
            alt="" 
            className="absolute -top-12 left-2 w-7 h-7 animate-twinkle"
            style={{ animationDelay: '0s' }}
          />
          {/* Small star 2 - left of big star */}
          <img 
            src="/static/app/landing/StarCardLeft2.svg" 
            alt="" 
            className="absolute top-2 -left-4 w-5 h-5 animate-twinkle"
            style={{ animationDelay: '0.5s' }}
          />
          {/* Big star - main left star */}
          <img 
            src="/static/app/landing/BigStarCardLeft.svg" 
            alt="" 
            className="w-[70px] h-[70px] animate-twinkle"
            style={{ animationDelay: '1s' }}
          />
        </div>
        
        {/* Right side stars - closer to the cards */}
        <div className="absolute right-[8%] sm:right-[10%] lg:right-[12%] bottom-[15%] lg:bottom-[18%] hidden lg:block">
          {/* Small star - above big star */}
          <img 
            src="/static/app/landing/StarCardRight.svg" 
            alt="" 
            className="absolute -top-10 right-2 w-7 h-7 animate-twinkle"
            style={{ animationDelay: '0.3s' }}
          />
          {/* Big star - main right star */}
          <img 
            src="/static/app/landing/BigStarCardRight.svg" 
            alt="" 
            className="w-[70px] h-[70px] animate-twinkle"
            style={{ animationDelay: '0.8s' }}
          />
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Mobile: Horizontal scrollable carousel, Desktop: Grid */}
          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <div className="flex-shrink-0 w-[85vw] sm:w-auto snap-center">
              <FeatureCard
                icon="/static/app/landing/SmartContractMatching.svg"
                title="Smart Contract Matching"
                description="Our AI analyzes thousands of contracts in seconds, using advanced vector similarity to find opportunities perfectly matched to your capabilities and experience."
                onLearnMore={scrollToFeatures}
              />
            </div>
            <div className="flex-shrink-0 w-[85vw] sm:w-auto snap-center">
              <FeatureCard
                icon="/static/app/landing/AutomatedProposalGeneration.svg"
                title="Automated Proposal Generation"
                description="Generate compelling, tailored bid responses instantly. Our AI assistant crafts professional proposals that highlight your strengths and address specific requirements."
                onLearnMore={scrollToFeatures}
              />
            </div>
            <div className="flex-shrink-0 w-[85vw] sm:w-auto snap-center">
              <FeatureCard
                icon="/static/app/landing/ComplianceIntelligence.svg"
                title="Compliance Intelligence"
                description="Never miss a requirement again. AI-powered compliance checking ensures your proposals meet all specifications and regulatory standards automatically."
                onLearnMore={scrollToFeatures}
              />
            </div>
            <div className="flex-shrink-0 w-[85vw] sm:w-auto snap-center">
              <FeatureCard
                icon="/static/app/landing/WinProbabilityScoring.svg"
                title="Win Probability Scoring"
                description="Get real-time insights into your chances of success. Our predictive AI analyzes historical data to score opportunities and optimize your bidding strategy."
                onLearnMore={scrollToFeatures}
              />
            </div>
            <div className="flex-shrink-0 w-[85vw] sm:w-auto snap-center">
              <FeatureCard
                icon="/static/app/landing/IntelligentMarketResearch.svg"
                title="Intelligent Market Research"
                description="Stay ahead of the competition with AI-driven market intelligence. Discover trends, analyze competitors, and identify emerging opportunities automatically."
                onLearnMore={scrollToFeatures}
              />
            </div>
            <div className="flex-shrink-0 w-[85vw] sm:w-auto snap-center">
              <FeatureCard
                icon="/static/app/landing/SmartDeadlineManagement.svg"
                title="Smart Deadline Management"
                description="Never miss another deadline. AI-powered scheduling and alerts keep you on track with automated reminders and priority-based task management."
                onLearnMore={scrollToFeatures}
              />
            </div>
          </div>
          {/* Mobile carousel indicator dots */}
          <div className="flex sm:hidden justify-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-corama-teal/60"></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
          </div>
        </div>
      </section>

      {/* Scope of Work + Revolutionizing Section (Grouped) */}
      <section 
        ref={setSectionRef('scope-revolution')}
        data-section="scope-revolution"
        className={`min-h-[auto] py-8 sm:py-0 sm:h-[calc(100vh-80px)] px-4 sm:px-6 relative overflow-hidden flex flex-col justify-center snap-start ${getSectionClass('scope-revolution')}`}
      >
        {/* Soft teal glow background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 -left-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6 -translate-y-1/2"></div>
        </div>
        
        {/* Scope of Work - with parallax effect */}
        <div 
          className="max-w-6xl mx-auto relative z-10 mb-10 sm:mb-16 parallax-section"
          onMouseMove={handleParallaxMove}
          onMouseLeave={handleParallaxLeave}
          style={parallaxStyle}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 lg:gap-16 items-center">
            <div className="parallax-image">
              <img 
                src="/static/app/landing/Scope.svg" 
                alt="Scope of Work Station" 
                className="w-full h-32 sm:h-72 lg:h-80 object-contain"
              />
            </div>
            <div className="text-center md:text-left parallax-text">
              <h2 className="font-poppins font-bold text-xl sm:text-4xl lg:text-5xl text-white mb-3 sm:mb-6">Scope Of Work Station</h2>
              <p className="text-gray-400 font-poppins text-sm sm:text-lg mb-4 sm:mb-8 leading-relaxed">
                Get the scope of work of your desired contract in minutes with clear, structured responses, and more.
              </p>
              <a 
                href="/login" 
                className="inline-flex items-center gap-2 bg-transparent border-2 border-white text-white font-poppins font-semibold px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-lg hover:bg-white hover:text-[#0B0B0F] transition-all text-sm sm:text-base"
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
          
          <h2 className="font-poppins font-bold text-xl sm:text-4xl lg:text-5xl text-white mb-3 sm:mb-6 leading-tight">
            Revolutionizing Government<br />Contracting for Small<br />Businesses
          </h2>
          <p className="text-[#6bb4b5] font-poppins text-xs sm:text-lg mb-4 sm:mb-8 max-w-3xl mx-auto px-2 leading-relaxed">
            Contract Radar Maximizer is a deep data science platform that integrates artificial intelligence and machine learning to assist small businesses in creating capability statements, identifying available government contracts in their area, and generating potential bid responses.
          </p>
          <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-[#6bb4b5] font-poppins text-sm sm:text-base hover:gap-3 transition-all">
            Learn More <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer Section */}
      <section 
        ref={setSectionRef('footer')}
        data-section="footer"
        className={`h-[calc(100vh-80px)] px-2 sm:px-4 relative overflow-hidden flex flex-col justify-end snap-start ${getSectionClass('footer')}`}
      >
        {/* Footer - at bottom of section */}
        <footer className="py-6 px-4 sm:px-6 relative">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-4">
              <p className="text-white font-poppins text-xs sm:text-sm leading-relaxed">
                180 North Michigan Avenue Suite 500 Chicago, IL 60601
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-4 text-xs sm:text-sm">
              <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-corama-teal font-poppins transition-colors">Learn More About IHCC</a>
              <a href="/terms-of-use" className="text-white hover:text-corama-teal font-poppins transition-colors">Terms of Use</a>
              <a href="/static/docs/policy.pdf" target="_blank" className="text-white hover:text-corama-teal font-poppins transition-colors">Policy Notice</a>
              <a href="/faq" className="text-white hover:text-corama-teal font-poppins transition-colors">FAQ</a>
            </div>
            
            <div className="text-center mb-4 text-xs sm:text-sm">
              <span className="text-white font-poppins">contact@corama.ai</span>
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

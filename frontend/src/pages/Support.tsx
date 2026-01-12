import { useEffect, useRef } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

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

const Support = () => {
  // Override body background color for this page only
  useEffect(() => {
    const originalBodyBg = document.body.style.backgroundColor
    const originalHtmlBg = document.documentElement.style.backgroundColor
    
    // Set the page-specific background color
    document.body.style.backgroundColor = '#0B2C48'
    document.documentElement.style.backgroundColor = '#0B2C48'
    
    // Restore original background on unmount
    return () => {
      document.body.style.backgroundColor = originalBodyBg
      document.documentElement.style.backgroundColor = originalHtmlBg
    }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0B2C48' }}>
      <Header credits={5} />
      <div className="flex flex-1 overflow-hidden" style={{ backgroundColor: '#0B2C48' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ backgroundColor: '#0B2C48' }}>
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-y-auto flex flex-col" style={{ backgroundColor: '#0B2C48' }}>
            {/* Header Section */}
            <div className="w-full text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight font-poppins">
                Meet the Team
              </h2>
              <p className="text-lg text-white max-w-3xl mx-auto font-light leading-relaxed font-poppins">
                Meet the visionary leaders behind Contract Radar Maximizer's
                mission to revolutionize government contracting for small businesses.
              </p>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-[1600px] mx-auto justify-items-center">
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
          </main>
        </div>
      </div>
    </div>
  )
}

export default Support

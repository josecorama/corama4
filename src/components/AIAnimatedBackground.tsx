import React, { useEffect, useRef } from 'react'

const AIAnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const nodes: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      pulsePhase: number
      connections: number[]
    }> = []

    const codeStreams: Array<{
      text: string
      x: number
      y: number
      targetLength: number
      currentLength: number
      opacity: number
      caretVisible: boolean
      caretBlink: number
      shimmer: number
      completed: boolean
      speed: number
      color: string
    }> = []

    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      color: string
      life: number
    }> = []

    const aiTexts = [
      'bid_processor.analyze_rfp(solicitation)',
      'contract_engine.match_capabilities()',
      'budget_calculator.estimate_costs(scope)',
      'proposal_generator.create_response()',
      'compliance_checker.validate_requirements()',
      'past_performance.evaluate_history()',
      'certification_validator.check_eligibility()',
      'naics_matcher.find_codes(industry)',
      'procurement_ai.score_opportunity()',
      'capability_statement.generate_pdf()',
      'vendor_database.search_contractors()',
      'timeline_analyzer.assess_schedule()',
      'deliverables_parser.extract_scope()',
      'subcontractor_finder.locate_partners()',
      'award_predictor.calculate_probability()',
      'set_aside_checker.verify_status()',
      'duns_validator.authenticate_business()',
      'cage_code_lookup.verify_registration()',
      'sam_gov.check_active_status()',
      'bid_submission.prepare_package()'
    ]

    const initializeNodes = () => {
      nodes.length = 0
      const numNodes = 25
      
      for (let i = 0; i < numNodes; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 2 + Math.random() * 3,
          opacity: 0.3 + Math.random() * 0.4,
          pulsePhase: Math.random() * Math.PI * 2,
          connections: []
        })
      }

      nodes.forEach((node, i) => {
        nodes.forEach((otherNode, j) => {
          if (i !== j) {
            const distance = Math.sqrt(
              Math.pow(node.x - otherNode.x, 2) + 
              Math.pow(node.y - otherNode.y, 2)
            )
            if (distance < 150 && Math.random() < 0.3) {
              node.connections.push(j)
            }
          }
        })
      })
    }

    const initializeCodeStreams = () => {
      codeStreams.length = 0
      const numStreams = 12
      
      for (let i = 0; i < numStreams; i++) {
        const text = aiTexts[Math.floor(Math.random() * aiTexts.length)]
        const colors = ['#5EEAD4', '#60A5FA', '#A78BFA', '#34D399', '#FBBF24']
        
        codeStreams.push({
          text,
          x: Math.random() * canvas.width,
          y: 50 + i * (canvas.height / numStreams) + Math.random() * 100,
          targetLength: Math.floor(text.length * (0.4 + Math.random() * 0.6)),
          currentLength: 0,
          opacity: 0.4 + Math.random() * 0.3,
          caretVisible: true,
          caretBlink: 0,
          shimmer: 0,
          completed: false,
          speed: 0.5 + Math.random() * 1.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        })
      }
    }

    const initializeParticles = () => {
      particles.length = 0
      const numParticles = 40
      
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 1 + Math.random() * 2,
          opacity: 0.2 + Math.random() * 0.3,
          color: '#5EEAD4',
          life: 1.0
        })
      }
    }

    initializeNodes()
    initializeCodeStreams()
    initializeParticles()

    let animationTime = 0
    const animationDuration = 12000

    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const gradient = ctx.createRadialGradient(
        canvas.width * 0.3, canvas.height * 0.3, 0,
        canvas.width * 0.7, canvas.height * 0.7, canvas.width
      )
      gradient.addColorStop(0, '#0F172A')
      gradient.addColorStop(0.3, '#1E293B')
      gradient.addColorStop(0.6, '#0F172A')
      gradient.addColorStop(1, '#020617')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = 'rgba(94, 234, 212, 0.03)'
      ctx.lineWidth = 1
      for (let i = 0; i < canvas.width; i += 60) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, canvas.height)
        ctx.stroke()
      }
      for (let i = 0; i < canvas.height; i += 60) {
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(canvas.width, i)
        ctx.stroke()
      }

      animationTime = (timestamp % animationDuration) / animationDuration

      nodes.forEach((node, _index) => {
        node.x += node.vx
        node.y += node.vy

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        node.x = Math.max(0, Math.min(canvas.width, node.x))
        node.y = Math.max(0, Math.min(canvas.height, node.y))

        node.pulsePhase += 0.02
        const pulse = 0.5 + 0.5 * Math.sin(node.pulsePhase)

        node.connections.forEach(connectionIndex => {
          const connectedNode = nodes[connectionIndex]
          if (connectedNode) {
            const distance = Math.sqrt(
              Math.pow(node.x - connectedNode.x, 2) + 
              Math.pow(node.y - connectedNode.y, 2)
            )
            const opacity = Math.max(0, 0.3 - distance / 500)
            
            ctx.strokeStyle = `rgba(94, 234, 212, ${opacity * pulse})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(connectedNode.x, connectedNode.y)
            ctx.stroke()
          }
        })

        const nodeOpacity = node.opacity * (0.6 + 0.4 * pulse)
        ctx.fillStyle = `rgba(94, 234, 212, ${nodeOpacity})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size * (0.8 + 0.4 * pulse), 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowColor = '#5EEAD4'
        ctx.shadowBlur = 10 * pulse
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size * 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      codeStreams.forEach((stream, index) => {
        const streamProgress = (animationTime + index * 0.08) % 1

        if (streamProgress < 0.7) {
          stream.currentLength = Math.min(
            stream.targetLength,
            Math.floor(streamProgress * stream.targetLength * stream.speed)
          )
          stream.completed = false
        } else if (!stream.completed) {
          stream.currentLength = stream.targetLength
          stream.completed = true
          stream.shimmer = 1
        }

        if (stream.shimmer > 0) {
          stream.shimmer = Math.max(0, stream.shimmer - 0.015)
        }

        stream.caretBlink = (stream.caretBlink + 0.15) % (Math.PI * 2)
        stream.caretVisible = Math.sin(stream.caretBlink) > 0

        ctx.font = '12px "JetBrains Mono", "Fira Code", monospace'
        
        const displayText = stream.text.substring(0, stream.currentLength)
        const textWidth = ctx.measureText(displayText).width

        const baseOpacity = stream.opacity * (0.5 + 0.3 * Math.sin(streamProgress * Math.PI))
        
        if (stream.shimmer > 0) {
          const shimmerGradient = ctx.createLinearGradient(
            stream.x, stream.y, stream.x + textWidth, stream.y
          )
          shimmerGradient.addColorStop(0, `${stream.color}${Math.floor(baseOpacity * 255).toString(16).padStart(2, '0')}`)
          shimmerGradient.addColorStop(0.5, `${stream.color}${Math.floor((baseOpacity + stream.shimmer * 0.5) * 255).toString(16).padStart(2, '0')}`)
          shimmerGradient.addColorStop(1, `${stream.color}${Math.floor(baseOpacity * 255).toString(16).padStart(2, '0')}`)
          ctx.fillStyle = shimmerGradient
        } else {
          ctx.fillStyle = `${stream.color}${Math.floor(baseOpacity * 255).toString(16).padStart(2, '0')}`
        }

        ctx.fillText(displayText, stream.x, stream.y)

        if (stream.currentLength < stream.targetLength && stream.caretVisible) {
          ctx.fillStyle = `${stream.color}CC`
          ctx.fillRect(stream.x + textWidth, stream.y - 10, 2, 12)
        }

        if (streamProgress > 0.95 && Math.random() < 0.01) {
          stream.text = aiTexts[Math.floor(Math.random() * aiTexts.length)]
          stream.targetLength = Math.floor(stream.text.length * (0.4 + Math.random() * 0.6))
          stream.currentLength = 0
          stream.completed = false
          stream.shimmer = 0
          stream.x = Math.random() * (canvas.width - 300)
        }
      })

      particles.forEach((particle, _index) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life -= 0.002

        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        if (particle.life <= 0) {
          particle.x = Math.random() * canvas.width
          particle.y = Math.random() * canvas.height
          particle.life = 1.0
        }

        const particleOpacity = particle.opacity * particle.life
        ctx.fillStyle = `rgba(94, 234, 212, ${particleOpacity})`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}

export default AIAnimatedBackground

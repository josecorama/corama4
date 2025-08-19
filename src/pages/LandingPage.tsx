import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import AIAnimatedBackground from '../components/AIAnimatedBackground'

const LandingPage = () => {
  const [demoVisible, setDemoVisible] = useState(false)
  const [demoType, setDemoType] = useState<'contracts' | 'capability' | 'assistant'>('contracts')
  const [stickyVisible, setStickyVisible] = useState(false)

  const demoContracts = [
    { title: "Janitorial Services – District Offices", agency: "Cook County", due: "2025-09-05", est: "$250K–$400K", naics: "561720" },
    { title: "Custodial Services – Parks & Rec", agency: "IL DNR", due: "2025-09-12", est: "$1.2M", naics: "561720" },
    { title: "Facility Cleaning – Federal Building", agency: "GSA", due: "2025-09-18", est: "$850K", naics: "561720" },
  ]

  const sampleFirm = { 
    name: "BlueWave Facilities, LLC", 
    naics: ["561720", "561740"], 
    differentiators: ["24/7 dispatch", "union labor", "LEED support"] 
  }

  const closeDemo = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setDemoVisible(false)
    setStickyVisible(false)
  }

  const showDemo = (type: 'contracts' | 'capability' | 'assistant') => {
    setDemoType(type)
    setDemoVisible(true)
    setStickyVisible(true)
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'demo_panel_view', {
        demo_type: type
      })
    }
  }

  const renderDemoContent = () => {
    switch (demoType) {
      case 'contracts':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <strong className="text-lg text-white">Top matches</strong> for <em className="text-blue-300">"janitorial 561720"</em>
              </div>
              <Link 
                to="/contracts" 
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-white"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'cta_open_full_tool', { tool: 'contracts' })
                  }
                }}
                title="Sign up required to access full contract search"
              >
                Open full search <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4" role="list" aria-label="Contract search results">
              {demoContracts.map((contract, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4" role="listitem">
                  <h3 className="font-semibold text-white mb-2">{contract.title}</h3>
                  <p className="text-gray-300 text-sm">
                    {contract.agency} • Due {contract.due} • Est. {contract.est} • NAICS {contract.naics}
                  </p>
                </div>
              ))}
            </div>
          </>
        )
      
      case 'capability':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <strong className="text-lg text-white">Sample capability statement</strong> for <em className="text-blue-300">{sampleFirm.name}</em>
              </div>
              <Link 
                to="/capability" 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-white"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'cta_open_full_tool', { tool: 'capability' })
                  }
                }}
                title="Sign up required to build capability statements"
              >
                Build my statement <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-2">Core Competencies</h3>
                <ul className="text-gray-300 space-y-1" role="list">
                  {["Janitorial", "Floor care", "Post-construction"].map(x => (
                    <li key={x} className="flex items-center gap-2" role="listitem">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" aria-hidden="true"></div>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">NAICS Codes</h3>
                <p className="text-gray-300">{sampleFirm.naics.join(", ")}</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Differentiators</h3>
                <ul className="text-gray-300 space-y-1" role="list">
                  {sampleFirm.differentiators.map(x => (
                    <li key={x} className="flex items-center gap-2" role="listitem">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full" aria-hidden="true"></div>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )
      
      case 'assistant':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <strong className="text-lg text-white">AI Bid Assistant</strong>
              <Link 
                to="/assistant" 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-white"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'cta_open_full_tool', { tool: 'assistant' })
                  }
                }}
              >
                Chat in full <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                <div className="text-blue-300 text-sm font-medium mb-1">System</div>
                <div className="text-white">Ask me about scope, risks, compliance, pricing hints…</div>
              </div>
              <div className="bg-gray-500/20 border border-gray-500/30 rounded-lg p-3 ml-8">
                <div className="text-gray-300 text-sm font-medium mb-1">You</div>
                <div className="text-white">What's risky in this SOW?</div>
              </div>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
                <div className="text-purple-300 text-sm font-medium mb-1">AI Assistant</div>
                <div className="text-white">Top 3 risks: (1) ambiguous service levels, (2) liquidated damages without caps, (3) 24/7 response with 2-hr SLA but no surge pricing. I'd clarify acceptance, cap LDs at 10%, and price an after-hours premium.</div>
              </div>
            </div>
          </>
        )
    }
  }

  return (
    <>
      <div className="site-bg" aria-hidden="true">
        <AIAnimatedBackground />
      </div>
      <div className="page-container">
        <header aria-label="Top navigation">
          <nav className="nav">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Corama</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-slate-700">
                Sign In
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" className="text-white hover:bg-slate-700">
                Pricing
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero container" style={{ padding: 'clamp(84px, 12vh, 140px) 0', textAlign: 'center' }}>
          <h1 
            className="text-white font-bold mb-6"
            style={{ fontSize: 'var(--text-xxl)' }}
          >
            AI-Powered Government Contracting Suite
          </h1>
          
          <p 
            className="text-slate-300 mb-12"
            style={{ fontSize: 'var(--text-lg)', maxInlineSize: '65ch', margin: '0 auto var(--space-6)' }}
          >
            Generate capability statements, chat through bids, and find contracts — in minutes.
          </p>
          
          <div className="flex flex-wrap gap-3 justify-center items-center mb-8" role="group" aria-label="Demo actions">
            <button 
              className="px-4 py-2 border border-slate-600 rounded-full bg-white/5 text-gray-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
              onClick={() => {
                showDemo('capability')
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'chip_click', { demo: 'capability' })
                }
              }}
              aria-label="View sample capability statement demo"
            >
              Generate a sample statement
            </button>
            <button 
              className="px-4 py-2 border border-slate-600 rounded-full bg-white/5 text-gray-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
              onClick={() => {
                showDemo('contracts')
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'chip_click', { demo: 'contracts' })
                }
              }}
              aria-label="View contract search demo for janitorial services"
            >
              Find "janitorial 561720"
            </button>
            <button 
              className="px-4 py-2 border border-slate-600 rounded-full bg-white/5 text-gray-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
              onClick={() => {
                showDemo('assistant')
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'chip_click', { demo: 'assistant' })
                }
              }}
              aria-label="View AI assistant demo for SOW risk analysis"
            >
              Ask: "What's risky in this SOW?"
            </button>
            <button 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
              onClick={() => {
                showDemo('contracts')
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'hero_try_click')
                }
              }}
              aria-label="Start 30-second demo of contract search"
            >
              Try it now — 30s demo
            </button>
          </div>

          {demoVisible && (
            <div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  closeDemo()
                }
              }}
            >
              <section 
                className="relative w-full max-w-4xl mx-auto p-6 border border-slate-600 rounded-2xl backdrop-blur-sm shadow-2xl"
                style={{
                  background: 'linear-gradient(180deg, #111a33, #0f1830)',
                  boxShadow: '0 16px 48px rgba(12,18,40,.24)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closeDemo}
                  className="absolute right-2 top-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white hover:text-gray-200 transition-all duration-200 z-[10000] border border-white/30"
                  type="button"
                  aria-label="Close demo"
                  style={{ 
                    position: 'absolute',
                    right: '8px',
                    top: '8px',
                    zIndex: 10000
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
                {renderDemoContent()}
              </section>
            </div>
          )}
        </section>
      </main>

      {stickyVisible && (
        <div 
          className="fixed bottom-0 left-0 right-0 flex gap-3 justify-center items-center p-4 backdrop-blur-md border-t border-white/10 z-20"
          style={{ background: 'rgba(12,18,40,.6)' }}
        >
          <span className="text-gray-300">Like what you see?</span>
          <Link 
            to="/capability" 
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-6 py-2 rounded-lg font-medium transition-all duration-200 text-white"
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).gtag) {
                (window as any).gtag('event', 'sticky_cta_click')
              }
            }}
          >
            Start free →
          </Link>
        </div>
      )}

      <footer className="container">
        <div className="flex flex-col md:flex-row justify-between items-center py-12 border-t border-white/10 mt-20">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Corama</span>
          </div>
          <p className="text-slate-400">© 2024 Corama. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </>
  )
}

export default LandingPage

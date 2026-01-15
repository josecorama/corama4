import { useState, useRef } from 'react'

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "What is Contract Radar Maximizer?",
    answer: "Contract Radar Maximizer is a comprehensive data science platform that integrates artificial intelligence and machine learning to assist small businesses in creating capability statements, identifying available government contracts, and generating potential bid responses."
  },
  {
    question: "How does Contract Radar Maximizer help my business?",
    answer: "Contract Radar Maximizer transforms months of searching for government contracts into just 20 seconds. It generates strong capability statements, matches you with relevant contracts, and creates compelling bid responses, significantly increasing your chances of securing contracts."
  },
  {
    question: "What types of businesses can benefit from Contract Radar Maximizer?",
    answer: "Contract Radar Maximizer is designed to help small businesses, especially those traditionally hesitant to engage in government dealings. It caters to various industries and focuses on enhancing accessibility and inclusivity in the public economy."
  },
  {
    question: "How do I upload my capability statement to Contract Radar Maximizer?",
    answer: "You can easily upload your capability statement through the Contract Radar Maximizer platform. If you don't have one, Contract Radar Maximizer can help you create a strong capability statement using generative artificial intelligence."
  },
  {
    question: "How does Contract Radar Maximizer match my business with relevant contracts?",
    answer: "Contract Radar Maximizer uses advanced AI algorithms to analyze a wealth of historical winning bids, identifying crucial keywords and requirements. It matches your capability statement with real-time available contracts in your area."
  },
  {
    question: "Can I generate bid responses directly on Contract Radar Maximizer?",
    answer: "Yes, Contract Radar Maximizer generates structured bid responses that align with your objectives and effectively articulate your solutions, making the bidding process smoother and more efficient."
  }
]

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [contentHeights, setContentHeights] = useState<Record<number, number>>({})
  const contentRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const toggleCard = (index: number) => {
    // Measure content height before toggling
    if (openIndex !== index && contentRefs.current[index]) {
      const height = contentRefs.current[index]?.scrollHeight || 0
      setContentHeights(prev => ({ ...prev, [index]: height }))
    }
    setOpenIndex(openIndex === index ? null : index)
  }

  const getZIndex = (idx: number, column: 'left' | 'right') => {
    const columnIndices = column === 'left' ? [0, 1, 2] : [3, 4, 5]
    const positionInColumn = columnIndices.indexOf(idx)
    
    if (openIndex === idx) {
      return 30
    }
    return 20 - positionInColumn * 5
  }

  return (
        <div className="min-h-screen bg-[#0B0B0F] flex flex-col relative">
          {/* Background flicker effect */}
          <div className="prelogin-flicker-bg" />
          {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-16 sm:h-20 flex items-center justify-between">
          <a href="/"><img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-2.5 sm:h-3 lg:h-3.5 w-auto" /></a>
          
          {/* Navigation - visible on all screens with smaller text on mobile */}
                    <nav className="prelogin-nav flex items-center gap-2 sm:gap-4 lg:gap-8">
                      <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 font-poppins text-[10px] sm:text-sm">IHCC</a>
                      <a href="/faq" className="text-white font-poppins text-[10px] sm:text-sm">FAQ</a>
                      <a href="/about-us" className="text-gray-300 font-poppins text-[10px] sm:text-sm">About Us</a>
                    </nav>
          
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
            <a href="/login" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center border border-white">Log In</a>
            <a href="/signup" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center" style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)' }}>Sign up</a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 pt-24 sm:pt-32 pb-40 sm:pb-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <h1 className="font-poppins font-black text-3xl sm:text-4xl md:text-5xl text-white text-center mb-12 sm:mb-16">
            Frequently Asked Questions
          </h1>

                    {/* FAQ Grid - 2 columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                      {/* Left Column: Q1, Q2, Q3 */}
                      <div className="flex flex-col gap-6 relative">
                        {[0, 1, 2].map((idx) => (
                          <div 
                            key={idx}
                            className="relative transition-all duration-300 group"
                            style={{ zIndex: getZIndex(idx, 'left') }}
                          >
                            <div 
                              className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-out ${
                                openIndex === idx ? 'shadow-2xl' : ''
                              }`}
                              style={{ 
                                width: '500px', 
                                maxWidth: '100%',
                                transform: openIndex !== idx ? 'translateY(0)' : undefined,
                              }}
                            >
                              <div 
                                className="flex items-center gap-4 cursor-pointer p-6 transition-transform duration-200 hover:-translate-y-0.5"
                                onClick={() => toggleCard(idx)}
                                style={{ height: '100px' }}
                              >
                                <button 
                                  className="flex-shrink-0 transition-transform duration-300"
                                  style={{ 
                                    transform: openIndex === idx ? 'rotate(0deg)' : 'rotate(0deg)',
                                    transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)'
                                  }}
                                >
                                  {openIndex === idx ? (
                                    <img src="/static/app/landing/Close.svg" alt="Close" className="w-5 h-5" />
                                  ) : (
                                    <img src="/static/app/landing/Open.svg" alt="Open" className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" style={{ transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)' }} />
                                  )}
                                </button>
                                <h3 
                                  className="font-poppins font-bold text-base sm:text-lg"
                                  style={{ color: '#1B1139' }}
                                >
                                  {faqData[idx].question}
                                </h3>
                              </div>
                    
                              {/* Expandable content with smooth animation */}
                              <div 
                                ref={(el) => { contentRefs.current[idx] = el }}
                                className="overflow-hidden transition-all duration-300 ease-out"
                                style={{ 
                                  maxHeight: openIndex === idx ? `${contentHeights[idx] || 200}px` : '0px',
                                  opacity: openIndex === idx ? 1 : 0,
                                }}
                              >
                                <div className="px-6 pb-6 pl-[52px]">
                                  <p 
                                    className="font-poppins text-sm leading-relaxed"
                                    style={{ color: '#363049' }}
                                  >
                                    {faqData[idx].answer}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Right Column: Q4, Q5, Q6 */}
                      <div className="flex flex-col gap-6 relative">
                        {[3, 4, 5].map((idx) => (
                          <div 
                            key={idx}
                            className="relative transition-all duration-300 group"
                            style={{ zIndex: getZIndex(idx, 'right') }}
                          >
                            <div 
                              className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-out ${
                                openIndex === idx ? 'shadow-2xl' : ''
                              }`}
                              style={{ 
                                width: '500px', 
                                maxWidth: '100%',
                                transform: openIndex !== idx ? 'translateY(0)' : undefined,
                              }}
                            >
                              <div 
                                className="flex items-center gap-4 cursor-pointer p-6 transition-transform duration-200 hover:-translate-y-0.5"
                                onClick={() => toggleCard(idx)}
                                style={{ height: '100px' }}
                              >
                                <button 
                                  className="flex-shrink-0 transition-transform duration-300"
                                  style={{ 
                                    transform: openIndex === idx ? 'rotate(0deg)' : 'rotate(0deg)',
                                    transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)'
                                  }}
                                >
                                  {openIndex === idx ? (
                                    <img src="/static/app/landing/Close.svg" alt="Close" className="w-5 h-5" />
                                  ) : (
                                    <img src="/static/app/landing/Open.svg" alt="Open" className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" style={{ transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)' }} />
                                  )}
                                </button>
                                <h3 
                                  className="font-poppins font-bold text-base sm:text-lg"
                                  style={{ color: '#1B1139' }}
                                >
                                  {faqData[idx].question}
                                </h3>
                              </div>
                    
                              {/* Expandable content with smooth animation */}
                              <div 
                                ref={(el) => { contentRefs.current[idx] = el }}
                                className="overflow-hidden transition-all duration-300 ease-out"
                                style={{ 
                                  maxHeight: openIndex === idx ? `${contentHeights[idx] || 200}px` : '0px',
                                  opacity: openIndex === idx ? 1 : 0,
                                }}
                              >
                                <div className="px-6 pb-6 pl-[52px]">
                                  <p 
                                    className="font-poppins text-sm leading-relaxed"
                                    style={{ color: '#363049' }}
                                  >
                                    {faqData[idx].answer}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
        </div>
      </div>

      {/* Footer - at bottom of page content, not fixed */}
      <footer className="bg-[#0B0B0F] pt-8 pb-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white font-poppins">
          <div className="text-center sm:text-left">
            <div>180 North Michigan Avenue</div>
            <div className="sm:text-center">Suite 500 Chicago, IL 60601</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="hover:text-corama-teal transition-colors">Learn More About IHCC</a>
            <a href="/terms-of-use" className="hover:text-corama-teal transition-colors">Terms of Use</a>
            <a href="/static/docs/policy.pdf" target="_blank" className="hover:text-corama-teal transition-colors">Policy Notice</a>
            <a href="/faq" className="hover:text-corama-teal transition-colors">Frequently Asked Questions</a>
          </div>
          <div>contact@corama.ai</div>
        </div>
      </footer>
    </div>
  )
}

export default FAQ

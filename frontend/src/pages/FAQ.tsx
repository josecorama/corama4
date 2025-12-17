import { useState } from 'react'

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
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleCard = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <a href="/"><img src="/static/app/landing/CoramaText.svg" alt="CORAMA" className="h-3 sm:h-3.5 w-auto" /></a>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">IHCC</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">Support</a>
            <a href="/faq" className="text-white font-poppins text-sm transition-colors">FAQ</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <a href="/login" className="text-corama-teal font-poppins text-sm font-medium hover:text-[#99c8ca] transition-colors">Login</a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 pt-24 sm:pt-32 pb-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <h1 className="font-poppins font-black text-3xl sm:text-4xl md:text-5xl text-white text-center mb-12 sm:mb-16 italic">
            Frequently Asked Questions
          </h1>

          {/* FAQ Grid - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            {/* Left Column: Q1, Q2, Q3 */}
            <div className="flex flex-col gap-6">
              {[0, 1, 2].map((idx) => (
                <div 
                  key={idx}
                  className={`relative transition-all duration-300 ${openIndex === idx ? 'z-20' : 'z-10'}`}
                >
                  <div 
                    className={`bg-white rounded-2xl p-6 shadow-lg transition-all duration-300 ${
                      openIndex === idx ? 'shadow-2xl' : ''
                    }`}
                  >
                    <div 
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => toggleCard(idx)}
                    >
                      <button className="flex-shrink-0 mt-1">
                        {openIndex === idx ? (
                          <img src="/static/app/landing/Close.svg" alt="Close" className="w-5 h-5" />
                        ) : (
                          <img src="/static/app/landing/Open.svg" alt="Open" className="w-5 h-5" />
                        )}
                      </button>
                      <h3 
                        className="font-poppins font-bold text-base sm:text-lg"
                        style={{ color: '#1B1139' }}
                      >
                        {faqData[idx].question}
                      </h3>
                    </div>
                    
                    {openIndex === idx && (
                      <div className="mt-4 pl-9">
                        <p 
                          className="font-poppins text-sm leading-relaxed"
                          style={{ color: '#363049' }}
                        >
                          {faqData[idx].answer}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Q4, Q5, Q6 */}
            <div className="flex flex-col gap-6">
              {[3, 4, 5].map((idx) => (
                <div 
                  key={idx}
                  className={`relative transition-all duration-300 ${openIndex === idx ? 'z-20' : 'z-10'}`}
                >
                  <div 
                    className={`bg-white rounded-2xl p-6 shadow-lg transition-all duration-300 ${
                      openIndex === idx ? 'shadow-2xl' : ''
                    }`}
                  >
                    <div 
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => toggleCard(idx)}
                    >
                      <button className="flex-shrink-0 mt-1">
                        {openIndex === idx ? (
                          <img src="/static/app/landing/Close.svg" alt="Close" className="w-5 h-5" />
                        ) : (
                          <img src="/static/app/landing/Open.svg" alt="Open" className="w-5 h-5" />
                        )}
                      </button>
                      <h3 
                        className="font-poppins font-bold text-base sm:text-lg"
                        style={{ color: '#1B1139' }}
                      >
                        {faqData[idx].question}
                      </h3>
                    </div>
                    
                    {openIndex === idx && (
                      <div className="mt-4 pl-9">
                        <p 
                          className="font-poppins text-sm leading-relaxed"
                          style={{ color: '#363049' }}
                        >
                          {faqData[idx].answer}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/95 to-transparent py-5 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white font-poppins">
          <div className="text-center sm:text-left">
            222 W. Merchandise Mart Plaza<br />
            Suite 1212 c/o 1871 Chicago, IL 60654
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="hover:text-corama-teal transition-colors">Learn More About IHCC</a>
            <a href="/terms-of-use" className="hover:text-corama-teal transition-colors">Terms of Use</a>
            <a href="/static/docs/policy.pdf" target="_blank" className="hover:text-corama-teal transition-colors">Policy Notice</a>
            <a href="/faq" className="hover:text-corama-teal transition-colors">Frequently Asked Questions</a>
            <a href="mailto:Info@corama.ai" className="hover:text-corama-teal transition-colors">Contact</a>
          </div>
          <div>Info@corama.ai</div>
        </div>
      </footer>
    </div>
  )
}

export default FAQ

import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { useState, useEffect } from 'react'
import { api } from '../services/api'

const Support = () => {
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    loadCredits()
  }, [])

  const loadCredits = async () => {
    try {
      const data = await api.getCredits()
      if (data.success) {
        setCredits(data.current_balance)
      }
    } catch (error) {
      console.error('Failed to load credits:', error)
    }
  }

  return (
    <div className="min-h-screen bg-corama-dark">
      <Header credits={credits} />
      
      <div className="flex">
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
            <div className="card-gradient rounded-xl p-4 sm:p-6 lg:p-8">
              <div className="mb-6">
                <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl uppercase tracking-wider">Support</h1>
                <p className="text-gray-400 font-poppins text-sm mt-2">Get help with your CORAMA account</p>
              </div>

              <div className="space-y-6">
                <div className="bg-[#2F3C4F] rounded-xl p-6">
                  <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-4">Contact Us</h2>
                  <p className="text-gray-300 font-poppins text-sm mb-4">
                    Have questions or need assistance? Our support team is here to help.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img src="/static/app/dashboard/Email.svg" alt="" className="w-5 h-5" />
                      <a href="mailto:contact@corama.ai" className="text-corama-teal font-poppins text-sm hover:underline">
                        contact@corama.ai
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2F3C4F] rounded-xl p-6">
                  <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-4">Frequently Asked Questions</h2>
                  <p className="text-gray-300 font-poppins text-sm mb-4">
                    Check out our FAQ page for answers to common questions.
                  </p>
                  <a 
                    href="/faq" 
                    className="inline-flex items-center gap-2 bg-corama-teal text-white font-poppins font-medium py-2 px-4 rounded-lg hover:bg-corama-teal/80 transition-colors text-sm"
                  >
                    View FAQ
                  </a>
                </div>

                <div className="bg-[#2F3C4F] rounded-xl p-6">
                  <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-4">Business Hours</h2>
                  <p className="text-gray-300 font-poppins text-sm">
                    Monday - Friday: 9:00 AM - 5:00 PM (CST)
                  </p>
                  <p className="text-gray-400 font-poppins text-xs mt-2">
                    We typically respond within 24-48 business hours.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Support

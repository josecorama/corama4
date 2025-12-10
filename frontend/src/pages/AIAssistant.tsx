import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { Send } from 'lucide-react'

interface Message {
  id: number
  sender: 'user' | 'ai'
  content: string
  timestamp: string
}

const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'ai',
      content: `Hi! I'm here to help you win the bid for: 2024 Salt Purchase

Do you need help with a specific task, or do you want to build the full proposal?

Pick a specific task:
- Analyze Contract (3 credits)
- Check Compliance (2 credits)
- Develop Strategy (3 credits)
- Create Outline (2 credits)

Ready to build the full proposal?
I can guide you step-by-step from start to finish.

Start Guided Process
Analyze the contract with AI annotations -> Build your team -> Develop pricing strategy -> Generate comprehensive proposal`,
      timestamp: 'Me, 10:22',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const contractName = '2024 Salt Purchase'

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: messages.length + 1,
      sender: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages([...messages, newMessage])
    setInputValue('')

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        sender: 'ai',
        content: 'I understand you want to learn more about this contract. Let me analyze the key requirements and provide you with insights...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
  }

    return (
      <div className="flex min-h-screen bg-corama-dark">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-20" aria-hidden="true" />
        
        <Sidebar />
      
        <div className="flex-1 flex flex-col min-w-0">
          <Header credits={5} />
        
          <main className="flex-1 p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
            {/* Page Title */}
            <div className="mb-4 lg:mb-6">
              <h1 className="text-corama-teal font-poppins text-xs sm:text-sm uppercase tracking-wider">
                AI BID ASSISTANT FOR
              </h1>
              <h2 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl">{contractName}</h2>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 mb-3 sm:mb-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-full sm:max-w-xl lg:max-w-2xl ${message.sender === 'user' ? 'order-2' : ''}`}>
                      {message.sender === 'ai' && (
                        <p className="text-gray-400 font-poppins text-xs mb-1">{message.timestamp}</p>
                      )}
                      <div
                        className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${
                          message.sender === 'user'
                            ? 'bg-corama-teal text-corama-dark'
                            : 'bg-white text-gray-800'
                        }`}
                      >
                        <p className="font-poppins text-xs sm:text-sm whitespace-pre-line">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="mt-auto flex-shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about this contract..."
                    className="w-full bg-corama-darker border border-corama-teal/30 rounded-full py-3 sm:py-4 pl-4 sm:pl-6 pr-12 sm:pr-14 text-white placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Send size={16} className="text-corama-dark sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
}

export default AIAssistant

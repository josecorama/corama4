import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { Send } from 'lucide-react'
import { api } from '../services/api'

interface Message {
  id: number
  sender: 'user' | 'ai'
  content: string
  timestamp: string
}

// Map display names to action keys for backend
const ACTION_KEYS: Record<string, string> = {
  'Analyze Contract (3 credits)': 'analyze_contract',
  'Check Compliance (2 credits)': 'check_compliance',
  'Develop Strategy (3 credits)': 'develop_strategy',
  'Create Outline (2 credits)': 'create_outline',
}

// System help keywords and responses
const getSystemHelpResponse = (query: string): string | null => {
  const lowerQuery = query.toLowerCase()
  
  if (lowerQuery.includes('credit') || lowerQuery.includes('how many')) {
    return `Credits are used to access AI-powered features in CORAMA. Here's how they work:

- Analyze Contract: 3 credits - Get a detailed analysis of the contract requirements
- Check Compliance: 2 credits - Verify your capability statement meets requirements
- Develop Strategy: 3 credits - Get strategic recommendations for winning the bid
- Create Outline: 2 credits - Generate a proposal outline based on the contract

You can purchase more credits from the "Get More Credits" page in the menu.`
  }
  
  if (lowerQuery.includes('how does this work') || lowerQuery.includes('what can you do') || lowerQuery.includes('help')) {
    return `I'm your AI Bid Assistant! I can help you win government contracts by:

1. Analyzing contracts to identify key requirements
2. Checking if your capability statement is compliant
3. Developing winning strategies tailored to each opportunity
4. Creating proposal outlines to get you started

Just type one of the options above, or ask me any question about this contract!`
  }
  
  if (lowerQuery.includes('corama') || lowerQuery.includes('what is')) {
    return `CORAMA is a platform that helps businesses find and win government contracts. We use AI to match your capability statement with relevant opportunities and provide tools to help you create winning proposals.

Key features:
- Smart contract matching based on your capabilities
- AI-powered bid assistance
- Compliance checking
- Proposal generation tools

Is there anything specific you'd like to know?`
  }
  
  return null
}

const formatTime = (): string => {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const buildInitialMessage = (contractName: string): string => {
  return `Hi! I'm here to help you win the bid for: ${contractName}

Do you need help with a specific task, or do you want to build the full proposal?

Pick a specific task:
- Analyze Contract (3 credits)
- Check Compliance (2 credits)
- Develop Strategy (3 credits)
- Create Outline (2 credits)

Ready to build the full proposal?
I can guide you step-by-step from start to finish.

Start Guided Process
Analyze the contract with AI annotations -> Build your team -> Develop pricing strategy -> Generate comprehensive proposal`
}

const AIAssistant = () => {
  const location = useLocation()
  const state = location.state as { contractName?: string; contractAgency?: string; contractCategory?: string } | null
  const contractName = state?.contractName || 'this contract'
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'ai',
      content: buildInitialMessage(contractName),
      timestamp: formatTime(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [headerKey, setHeaderKey] = useState(0)

  // Update initial message when contract name changes
  useEffect(() => {
    setMessages([
      {
        id: 1,
        sender: 'ai',
        content: buildInitialMessage(contractName),
        timestamp: formatTime(),
      },
    ])
  }, [contractName])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userInput = inputValue.trim()
    const newMessage: Message = {
      id: messages.length + 1,
      sender: 'user',
      content: userInput,
      timestamp: formatTime(),
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    setIsProcessing(true)

    try {
      // Check if this is a system help question
      const helpResponse = getSystemHelpResponse(userInput)
      if (helpResponse) {
        const aiResponse: Message = {
          id: messages.length + 2,
          sender: 'ai',
          content: helpResponse,
          timestamp: formatTime(),
        }
        setMessages(prev => [...prev, aiResponse])
        setIsProcessing(false)
        return
      }

      // Check if this is one of the action commands
      const normalizedInput = userInput.startsWith('- ') ? userInput.slice(2).trim() : userInput
      const actionKey = ACTION_KEYS[normalizedInput]
      
      if (actionKey) {
        // Call backend API for AI action
        try {
          const response = await api.aiAssistantAction(actionKey, contractName)
          
          if (response.success) {
            const aiResponse: Message = {
              id: messages.length + 2,
              sender: 'ai',
              content: response.message,
              timestamp: formatTime(),
            }
            setMessages(prev => [...prev, aiResponse])
            // Force Header to refresh credits
            setHeaderKey(k => k + 1)
          } else {
            const errorResponse: Message = {
              id: messages.length + 2,
              sender: 'ai',
              content: response.error || 'Sorry, I encountered an error processing your request. Please try again.',
              timestamp: formatTime(),
            }
            setMessages(prev => [...prev, errorResponse])
          }
        } catch (error) {
          console.error('AI action error:', error)
          const errorResponse: Message = {
            id: messages.length + 2,
            sender: 'ai',
            content: 'Sorry, I encountered an error processing your request. Please try again later.',
            timestamp: formatTime(),
          }
          setMessages(prev => [...prev, errorResponse])
        }
      } else {
        // General question - provide helpful response
        const aiResponse: Message = {
          id: messages.length + 2,
          sender: 'ai',
          content: `I understand you're asking about "${userInput}". 

To help you with this contract, I recommend using one of my specialized tools:
- Analyze Contract (3 credits) - For detailed contract analysis
- Check Compliance (2 credits) - To verify your qualifications
- Develop Strategy (3 credits) - For winning strategies
- Create Outline (2 credits) - To start your proposal

Or ask me about how CORAMA works and I'll be happy to explain!`,
          timestamp: formatTime(),
        }
        setMessages(prev => [...prev, aiResponse])
      }
    } finally {
      setIsProcessing(false)
    }
  }

    return (
      <div className="min-h-screen bg-corama-dark">
        {/* Header spans full width at top */}
        <Header key={headerKey} credits={5} />
        
        {/* Sidebar + Content row below header */}
        <div className="flex">
          {/* Horizontal separator line across entire viewport width, below header (lg only) */}
          <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
          
          <Sidebar />
        
          <div className="flex-1 flex flex-col min-w-0">
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
      </div>
    )
}

export default AIAssistant

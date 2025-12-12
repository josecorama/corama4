import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../services/api'

// Send message icon path (served from static folder)
const SendMessageIcon = '/static/app/dashboard/SendMessage.svg'

interface Message {
  id: number
  sender: 'user' | 'ai'
  content: string
  timestamp: string
  isTyping?: boolean
  visibleContent?: string
}

// Action patterns for flexible matching
const ACTION_PATTERNS: Record<string, string[]> = {
  analyze_contract: ['analyze contract', 'analyze', 'analysis'],
  check_compliance: ['check compliance', 'compliance', 'compliant'],
  develop_strategy: ['develop strategy', 'strategy', 'strategic'],
  create_outline: ['create outline', 'outline', 'proposal outline'],
}

// Get action key from user input with flexible matching
function getActionKeyFromInput(raw: string): string | null {
  let text = raw.toLowerCase().trim()
  
  // Strip leading bullet/number patterns like "- " or "1. "
  text = text.replace(/^[-*\d.\s]+/, '')
  
  // Remove the credits suffix if present (e.g., "(3 credits)")
  text = text.replace(/\(\s*\d+\s*credits?\s*\)/i, '').trim()
  
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ')
  
  for (const [actionKey, patterns] of Object.entries(ACTION_PATTERNS)) {
    if (patterns.some((p) => text.startsWith(p) || text === p)) {
      return actionKey
    }
  }
  
  return null
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
      isTyping: false,
      visibleContent: buildInitialMessage(contractName),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [headerKey, setHeaderKey] = useState(0)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Update initial message when contract name changes
  useEffect(() => {
    const initialContent = buildInitialMessage(contractName)
    setMessages([
      {
        id: 1,
        sender: 'ai',
        content: initialContent,
        timestamp: formatTime(),
        isTyping: false,
        visibleContent: initialContent,
      },
    ])
  }, [contractName])

  // Typing animation effect (3 seconds total - 50% slower than before)
  useEffect(() => {
    const typingMessage = [...messages].reverse().find(m => m.sender === 'ai' && m.isTyping)
    if (!typingMessage) return

    const full = typingMessage.content
    const totalDuration = 3000 // 3 seconds total animation time (50% slower)
    const stepMs = 30
    const steps = Math.max(1, Math.floor(totalDuration / stepMs))
    const charsPerStep = Math.max(1, Math.ceil(full.length / steps))

    let currentLength = typingMessage.visibleContent?.length || 0

    const interval = setInterval(() => {
      currentLength += charsPerStep
      if (currentLength >= full.length) {
        // Finish typing
        setMessages(prev =>
          prev.map(m =>
            m.id === typingMessage.id
              ? { ...m, visibleContent: full, isTyping: false }
              : m
          )
        )
        clearInterval(interval)
      } else {
        const slice = full.slice(0, currentLength)
        setMessages(prev =>
          prev.map(m =>
            m.id === typingMessage.id
              ? { ...m, visibleContent: slice }
              : m
          )
        )
      }
    }, stepMs)

    return () => clearInterval(interval)
  }, [messages])

  // Auto-scroll to bottom when new messages arrive or during typing
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

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

    // Helper to add AI message with typing animation
    const addAiMessage = (content: string) => {
      const aiMessage: Message = {
        id: Date.now(), // Use timestamp for unique ID
        sender: 'ai',
        content: content,
        timestamp: formatTime(),
        isTyping: true,
        visibleContent: '',
      }
      setMessages(prev => [...prev, aiMessage])
    }

    // Build conversation history from messages (for context in follow-up questions)
    // Include the new user message in the history
    const buildConversationHistory = () => {
      const allMessages = [...messages, newMessage]
      return allMessages
        .filter(m => m.sender === 'user' || m.sender === 'ai')
        .slice(-8) // Last 8 messages for context
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content, // Use full content, not visibleContent
        }))
    }

    try {
      // Check if this is a system help question
      const helpResponse = getSystemHelpResponse(userInput)
      if (helpResponse) {
        addAiMessage(helpResponse)
        setIsProcessing(false)
        return
      }

      // Check if this is one of the action commands using flexible matching
      const actionKey = getActionKeyFromInput(userInput)
      
      if (actionKey) {
        // Call backend API for AI action with conversation history
        try {
          const conversationHistory = buildConversationHistory()
          const response = await api.aiAssistantAction(actionKey, contractName, conversationHistory)
          
          if (response.success) {
            addAiMessage(response.message)
            // Force Header to refresh credits
            setHeaderKey(k => k + 1)
          } else {
            addAiMessage(response.error || 'Sorry, I encountered an error processing your request. Please try again.')
          }
        } catch (error) {
          console.error('AI action error:', error)
          addAiMessage('Sorry, I encountered an error processing your request. Please try again later.')
        }
      } else {
        // Non-action message - send as conversation to maintain context (1 credit)
        // This allows the AI to follow up on its own questions
        try {
          const conversationHistory = buildConversationHistory()
          const response = await api.aiAssistantAction('conversation', contractName, conversationHistory)
          
          if (response.success) {
            addAiMessage(response.message)
            // Force Header to refresh credits
            setHeaderKey(k => k + 1)
          } else {
            addAiMessage(response.error || 'Sorry, I encountered an error processing your request. Please try again.')
          }
        } catch (error) {
          console.error('Conversation error:', error)
          addAiMessage('Sorry, I encountered an error processing your request. Please try again later.')
        }
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
              <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl">
                <span className="text-corama-teal">AI BID ASSISTANT FOR </span>{contractName}
              </h1>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 mb-3 sm:mb-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-full sm:max-w-xl lg:max-w-2xl ${message.sender === 'user' ? 'order-2' : ''}`}>
                      <p className={`text-gray-400 font-poppins text-xs mb-1 ${message.sender === 'user' ? 'text-right' : ''}`}>{message.timestamp}</p>
                      <div
                        className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 ${
                          message.sender === 'user'
                            ? 'text-white'
                            : 'bg-white text-gray-800'
                        }`}
                        style={message.sender === 'user' ? { backgroundColor: '#333c4d' } : undefined}
                      >
                        <p className="font-poppins text-xs sm:text-sm whitespace-pre-line">
                          {message.sender === 'ai' ? (message.visibleContent ?? message.content) : message.content}
                          {message.isTyping && <span className="animate-pulse">|</span>}
                        </p>
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
                    placeholder={`Start asking your questions about ${contractName} here`}
                    className="w-full border border-corama-teal/30 rounded-full py-3 sm:py-4 pl-4 sm:pl-6 pr-12 sm:pr-14 text-white placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                    style={{ backgroundColor: '#333c4d' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <img src={SendMessageIcon} alt="Send" className="w-10 h-10" />
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

import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../services/api'

// Normalize markdown to fix common formatting issues from AI responses
// Fixes cases where numbered lists or bullets appear on separate lines from their text
const normalizeMarkdown = (input: string): string => {
  let text = input

  // Fix "3.\nText" → "3. Text" (numbered list with text on next line)
  text = text.replace(
    /^(\s*\d+\.)\s*\n(\s*\S.*)$/gm,
    (_match, num, rest) => `${num} ${rest.trim()}`
  )

  // Fix "-\nText" or "*\nText" or "•\nText" → "- Text" (bullet with text on next line)
  text = text.replace(
    /^(\s*[-*•])\s*\n(\s*\S.*)$/gm,
    (_match, bullet, rest) => `${bullet} ${rest.trim()}`
  )

  return text
}

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

// Action patterns for flexible matching (contract-related actions only)
const ACTION_PATTERNS: Record<string, string[]> = {
  analyze_contract: ['analyze contract', 'contract analysis'],
  check_compliance: ['check compliance', 'compliance check'],
  develop_strategy: ['develop strategy', 'strategy development'],
  create_outline: ['create outline', 'proposal outline'],
}

// Detect if user is asking about their capability statement (CS)
// Uses keyword combination detection for flexible matching
function isCapabilityStatementQuery(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
  
  // Check for "capability statement" mention
  const hasCapabilityStatement = normalized.includes('capability statement') || 
                                  normalized.includes('capabilitystatement')
  
  // Check for "cs" as a standalone word (not part of another word like "costs")
  const hasCSMention = /\bcs\b/.test(normalized) && 
                       (normalized.includes('my cs') || 
                        normalized.includes('the cs') || 
                        normalized.includes('our cs') ||
                        normalized.includes('analyze cs') ||
                        normalized.includes('review cs') ||
                        normalized.includes('check cs'))
  
  // Analysis/review verbs
  const analysisVerbs = ['analyze', 'analyse', 'review', 'evaluate', 'assess', 'check', 'improve', 'strengthen', 'feedback', 'critique', 'look at', 'examine']
  const hasAnalysisVerb = analysisVerbs.some(verb => normalized.includes(verb))
  
  // Company/business context
  const hasCompanyContext = normalized.includes('my company') || 
                            normalized.includes('my business') || 
                            normalized.includes('our company') ||
                            normalized.includes('am i') ||
                            normalized.includes('do i qualify') ||
                            normalized.includes('my qualifications') ||
                            normalized.includes('my strengths') ||
                            normalized.includes('my weaknesses')
  
  // Return true if:
  // 1. Mentions "capability statement" with an analysis verb
  // 2. Mentions "cs" in proper context with an analysis verb
  // 3. Asks about company qualifications/fit (implies CS analysis)
  return (hasCapabilityStatement && hasAnalysisVerb) || 
         (hasCSMention && hasAnalysisVerb) ||
         (hasCompanyContext && hasAnalysisVerb && !normalized.includes('contract'))
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

// System help - now handled by AI with CORAMA knowledge in backend
// Only keep credit-specific help as a quick reference (no API call needed)
const getSystemHelpResponse = (_query: string): string | null => {
  // All questions now go to OpenAI which has CORAMA feature knowledge
  // This allows the AI to provide contextual guidance about the platform
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

Ready to build the full proposal? I can guide you step-by-step from start to finish.

To start building it, simply type "Start Guided Process" in the chat. This will direct you to the Contract Analysis page, where you'll be able to begin the step-by-step process for creating your proposal.`
}

const AIAssistant = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { contractName?: string; contractAgency?: string; contractCategory?: string; contractId?: string } | null
  const contractName = state?.contractName || 'this contract'
  const contractId = state?.contractId || ''
  
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

  // Typing animation effect (9 seconds total - even slower as requested)
  useEffect(() => {
    const typingMessage = [...messages].reverse().find(m => m.sender === 'ai' && m.isTyping)
    if (!typingMessage) return

    const full = typingMessage.content
    const totalDuration = 9000 // 9 seconds total animation time (even slower)
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
    const normalizedInput = userInput.toLowerCase()
    
    // Check for "Start Guided Process" - redirect to Contract Analysis page
    if (normalizedInput === 'start guided process' || normalizedInput.includes('start guided process')) {
      const newMessage: Message = {
        id: messages.length + 1,
        sender: 'user',
        content: userInput,
        timestamp: formatTime(),
      }
      
      // Add user message and AI response with typing animation
      const aiResponse: Message = {
        id: Date.now(),
        sender: 'ai',
        content: "Great! I'll open the guided Contract Analysis step for you now. This will help you analyze the contract with AI annotations, build your team, develop pricing strategy, and generate a comprehensive proposal.",
        timestamp: formatTime(),
        isTyping: true,
        visibleContent: '',
      }
      
      setMessages(prev => [...prev, newMessage, aiResponse])
      setInputValue('')
      
      // Navigate to Contract Analysis page after typing animation ends (9 seconds) + 1 second delay
      // Note: Don't include /app prefix since Router basename already adds it
      setTimeout(() => {
        navigate('/contract-analysis', { 
          state: { 
            contractName, 
            contractId,
            contractAgency: state?.contractAgency,
            contractCategory: state?.contractCategory 
          } 
        })
      }, 10000)
      return
    }
    
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
    // Apply normalizeMarkdown to fix formatting issues
    const addAiMessage = (content: string) => {
      const normalizedContent = normalizeMarkdown(content)
      const aiMessage: Message = {
        id: Date.now(), // Use timestamp for unique ID
        sender: 'ai',
        content: normalizedContent,
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

      // Check if this is a capability statement (CS) analysis query
      // Route to /ai_assistant_enhanced which has CS analysis logic
      if (isCapabilityStatementQuery(userInput)) {
        try {
          const response = await api.sendMessage(userInput, undefined, 'general')
          addAiMessage(response.response)
          // Force Header to refresh credits
          setHeaderKey(k => k + 1)
        } catch (error) {
          console.error('CS analysis error:', error)
          addAiMessage('Sorry, I encountered an error analyzing your capability statement. Please try again later.')
        }
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
      <div className="h-screen bg-corama-dark flex flex-col overflow-hidden">
        {/* Header spans full width at top */}
        <Header key={headerKey} credits={5} />
        
        {/* Sidebar + Content row below header */}
        <div className="flex flex-1 overflow-hidden">
          {/* Horizontal separator line across entire viewport width, below header (lg only) */}
          <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
          
          <Sidebar />
        
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <main className="flex-1 p-3 sm:p-4 lg:p-12 flex flex-col overflow-hidden">
            {/* Page Title */}
            <div className="mb-4 lg:mb-6 flex-shrink-0">
              <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl">
                <span className="text-corama-teal">AI BID ASSISTANT FOR </span>{contractName}
              </h1>
            </div>

            {/* Chat Area - flex-1 to take remaining space, with scrollable messages */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 sm:space-y-4 pr-2">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-message-pop`}
                    style={{ 
                      transformOrigin: message.sender === 'user' ? 'bottom right' : 'bottom left',
                      animation: 'messagePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                    }}
                  >
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
                        {message.sender === 'ai' ? (
                          <div className="font-poppins text-xs sm:text-sm">
                            <ReactMarkdown
                              components={{
                                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                li: ({children}) => <li className="ml-2">{children}</li>,
                                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                                em: ({children}) => <em className="italic">{children}</em>,
                                h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                              }}
                            >
                              {message.visibleContent ?? message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="font-poppins text-xs sm:text-sm whitespace-pre-line">
                            {message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Show thinking text while waiting for AI response */}
                {isProcessing && (
                  <div 
                    className="flex justify-start animate-message-pop"
                    style={{ 
                      transformOrigin: 'bottom left',
                      animation: 'messagePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                    }}
                  >
                    <div className="max-w-full sm:max-w-xl lg:max-w-2xl">
                      <p className="text-gray-400 font-poppins text-xs mb-1">{formatTime()}</p>
                      <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-white text-gray-800">
                        <p className="font-poppins text-xs sm:text-sm">
                          Thinking<span className="animate-ellipsis">...</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area - sticky at bottom */}
              <div className="flex-shrink-0 pt-3 sm:pt-4">
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

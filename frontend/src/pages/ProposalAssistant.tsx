import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../services/api'

// Icon paths
const EnterButtonIcon = '/static/app/dashboard/enterbutton.svg'
const ThreePeopleIcon = '/static/app/dashboard/3people.svg'
const DollarSignIcon = '/static/app/dashboard/dollarsign.svg'

interface Message {
  id: number
  sender: 'user' | 'ai'
  content: string
  timestamp: string
  isTyping?: boolean
  visibleContent?: string
}

interface SuggestionCardProps {
  title: string
  subtitle: string
  iconSrc: string
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  inputPlaceholder: string
}

const formatTime = (): string => {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const SuggestionCard = ({ 
  title, 
  subtitle, 
  iconSrc, 
  messages, 
  onSendMessage, 
  isLoading,
  inputPlaceholder 
}: SuggestionCardProps) => {
  const [inputValue, setInputValue] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return
    onSendMessage(inputValue.trim())
    setInputValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div 
      className="relative rounded-xl p-6 flex flex-col h-[500px] overflow-hidden"
      style={{ 
        background: 'linear-gradient(180deg, #0B2C48 0%, #0D3A5C 100%)',
        border: '1px solid rgba(240, 240, 240, 0.2)'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-poppins font-bold text-lg">{title}</h3>
          <p className="text-gray-300 font-poppins text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex-shrink-0 p-2 rounded-full" style={{ backgroundColor: 'rgba(153, 200, 202, 0.3)' }}>
          <img src={iconSrc} alt={title} className="w-8 h-8" />
        </div>
      </div>
      
      {/* Chat messages area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#99C8CA #0B2C48' }}
      >
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.sender === 'user' 
                  ? 'bg-corama-teal text-white' 
                  : 'bg-white/10 text-white'
              }`}
            >
              {message.sender === 'ai' ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>
                    {message.isTyping ? (message.visibleContent || '') : message.content}
                  </ReactMarkdown>
                  {message.isTyping && (
                    <span className="inline-block w-2 h-4 bg-white/70 animate-pulse ml-1" />
                  )}
                </div>
              ) : (
                <p className="font-poppins text-sm">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-corama-teal" />
          </div>
        )}
      </div>
      
      {/* Input area */}
      <div className="relative z-10">
        <div 
          className="flex items-center rounded-full px-4 py-2"
          style={{ backgroundColor: '#2F3C4F' }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={inputPlaceholder}
            disabled={isLoading}
            className="flex-1 bg-transparent text-white font-poppins text-sm placeholder-gray-400 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="ml-2 transition-opacity disabled:opacity-50 hover:opacity-80"
          >
            <img src={EnterButtonIcon} alt="Send" className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

const ProposalAssistant = () => {
  const location = useLocation()
  const state = location.state as {
    contractName?: string
    contractId?: string
    contractAgency?: string
    contractCategory?: string
    contractDescription?: string
  } | null
  
  const contractName = state?.contractName || 'this contract'
  const contractId = state?.contractId || ''
  const contractDescription = state?.contractDescription || ''
  
  // Main AI suggestions state
  const [mainSuggestions, setMainSuggestions] = useState<string>('')
  const [isLoadingMain, setIsLoadingMain] = useState(true)
  
  // Market Value Insights chat state
  const [marketMessages, setMarketMessages] = useState<Message[]>([])
  const [isLoadingMarket, setIsLoadingMarket] = useState(false)
  
  // Team Composition chat state
  const [teamMessages, setTeamMessages] = useState<Message[]>([])
  const [isLoadingTeam, setIsLoadingTeam] = useState(false)
  
  // Header key for refreshing credits
  const [headerKey, setHeaderKey] = useState(0)
  
  // Mobile sidebar state
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fetch initial AI suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingMain(true)
      try {
        const response = await api.getProposalSuggestions(contractName, contractId, contractDescription)
        if (response.success) {
          setMainSuggestions(response.suggestions)
          // Initialize the chat cards with initial suggestions
          if (response.marketInsights) {
            setMarketMessages([{
              id: 1,
              sender: 'ai',
              content: response.marketInsights,
              timestamp: formatTime(),
              isTyping: false,
              visibleContent: response.marketInsights
            }])
          }
          if (response.teamComposition) {
            setTeamMessages([{
              id: 1,
              sender: 'ai',
              content: response.teamComposition,
              timestamp: formatTime(),
              isTyping: false,
              visibleContent: response.teamComposition
            }])
          }
        } else {
          setMainSuggestions('Unable to generate suggestions at this time. Please try again later.')
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error)
        setMainSuggestions('An error occurred while generating suggestions. Please try again.')
      } finally {
        setIsLoadingMain(false)
      }
    }
    
    fetchSuggestions()
  }, [contractName, contractId, contractDescription])

  // Handle sending message in Market Value Insights chat
  const handleMarketMessage = async (message: string) => {
    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      content: message,
      timestamp: formatTime()
    }
    setMarketMessages(prev => [...prev, userMessage])
    setIsLoadingMarket(true)
    
    try {
      const conversationHistory = marketMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
      
      const response = await api.chatProposalSuggestion(
        'market_value',
        message,
        contractName,
        contractId,
        conversationHistory
      )
      
      if (response.success) {
        const aiMessage: Message = {
          id: Date.now() + 1,
          sender: 'ai',
          content: response.response,
          timestamp: formatTime(),
          isTyping: true,
          visibleContent: ''
        }
        setMarketMessages(prev => [...prev, aiMessage])
        setHeaderKey(k => k + 1)
      }
    } catch (error) {
      console.error('Error in market chat:', error)
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: formatTime(),
        isTyping: false,
        visibleContent: 'Sorry, I encountered an error. Please try again.'
      }
      setMarketMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoadingMarket(false)
    }
  }

  // Handle sending message in Team Composition chat
  const handleTeamMessage = async (message: string) => {
    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      content: message,
      timestamp: formatTime()
    }
    setTeamMessages(prev => [...prev, userMessage])
    setIsLoadingTeam(true)
    
    try {
      const conversationHistory = teamMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
      
      const response = await api.chatProposalSuggestion(
        'team_composition',
        message,
        contractName,
        contractId,
        conversationHistory
      )
      
      if (response.success) {
        const aiMessage: Message = {
          id: Date.now() + 1,
          sender: 'ai',
          content: response.response,
          timestamp: formatTime(),
          isTyping: true,
          visibleContent: ''
        }
        setTeamMessages(prev => [...prev, aiMessage])
        setHeaderKey(k => k + 1)
      }
    } catch (error) {
      console.error('Error in team chat:', error)
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: formatTime(),
        isTyping: false,
        visibleContent: 'Sorry, I encountered an error. Please try again.'
      }
      setTeamMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoadingTeam(false)
    }
  }

  // Typing animation effect for market messages
  useEffect(() => {
    const typingMessage = [...marketMessages].reverse().find(m => m.sender === 'ai' && m.isTyping)
    if (!typingMessage) return

    const full = typingMessage.content
    const totalDuration = 5000
    const stepMs = 30
    const steps = Math.max(1, Math.floor(totalDuration / stepMs))
    const charsPerStep = Math.max(1, Math.ceil(full.length / steps))

    let currentLength = typingMessage.visibleContent?.length || 0

    const interval = setInterval(() => {
      currentLength += charsPerStep
      if (currentLength >= full.length) {
        setMarketMessages(prev =>
          prev.map(m =>
            m.id === typingMessage.id
              ? { ...m, visibleContent: full, isTyping: false }
              : m
          )
        )
        clearInterval(interval)
      } else {
        const slice = full.slice(0, currentLength)
        setMarketMessages(prev =>
          prev.map(m =>
            m.id === typingMessage.id
              ? { ...m, visibleContent: slice }
              : m
          )
        )
      }
    }, stepMs)

    return () => clearInterval(interval)
  }, [marketMessages])

  // Typing animation effect for team messages
  useEffect(() => {
    const typingMessage = [...teamMessages].reverse().find(m => m.sender === 'ai' && m.isTyping)
    if (!typingMessage) return

    const full = typingMessage.content
    const totalDuration = 5000
    const stepMs = 30
    const steps = Math.max(1, Math.floor(totalDuration / stepMs))
    const charsPerStep = Math.max(1, Math.ceil(full.length / steps))

    let currentLength = typingMessage.visibleContent?.length || 0

    const interval = setInterval(() => {
      currentLength += charsPerStep
      if (currentLength >= full.length) {
        setTeamMessages(prev =>
          prev.map(m =>
            m.id === typingMessage.id
              ? { ...m, visibleContent: full, isTyping: false }
              : m
          )
        )
        clearInterval(interval)
      } else {
        const slice = full.slice(0, currentLength)
        setTeamMessages(prev =>
          prev.map(m =>
            m.id === typingMessage.id
              ? { ...m, visibleContent: slice }
              : m
          )
        )
      }
    }, stepMs)

    return () => clearInterval(interval)
  }, [teamMessages])

  // Handle navigation with unsaved changes check
  const handleBeforeNavigate = (_to: string): boolean => {
    // Allow navigation - no unsaved changes to track in this page
    return true
  }

  return (
    <div className="min-h-screen bg-corama-dark flex flex-col">
      <Header key={headerKey} />
      
      <div className="flex flex-1 pt-16">
        <Sidebar 
          mobileOpen={mobileOpen} 
          onMobileToggle={() => setMobileOpen(!mobileOpen)}
          onBeforeNavigate={handleBeforeNavigate}
        />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Page Title */}
          <h1 className="text-white font-poppins font-bold text-2xl sm:text-3xl text-center mb-6">
            Proposal Assistant
          </h1>
          
          {/* Main AI Suggestions Card - Fixed height with scrollbar */}
          <div 
            className="rounded-xl p-6 mb-6"
            style={{ 
              background: 'white',
              border: '1px solid rgba(240, 240, 240, 0.2)',
              height: '300px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <h2 className="text-black font-poppins font-bold text-xl mb-4 flex-shrink-0">
              AI Suggestions For a Wise Bid Proposal
            </h2>
            
            {isLoadingMain ? (
              <div className="flex items-center justify-center flex-1">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-corama-teal" />
              </div>
            ) : (
              <div 
                className="prose max-w-none text-black overflow-y-auto flex-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#99C8CA #f0f0f0' }}
              >
                <ReactMarkdown>{mainSuggestions}</ReactMarkdown>
              </div>
            )}
          </div>
          
          {/* Two Suggestion Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Value Insights Card */}
            <SuggestionCard
              title="Market Value Insights"
              subtitle="Recommendations based on current valuation data."
              iconSrc={DollarSignIcon}
              messages={marketMessages}
              onSendMessage={handleMarketMessage}
              isLoading={isLoadingMarket}
              inputPlaceholder="Start asking your questions about this recommendations"
            />
            
            {/* Recommended Team Composition Card */}
            <SuggestionCard
              title="Recommended Team Composition"
              subtitle="Suggested strategy based on project requirements and skills."
              iconSrc={ThreePeopleIcon}
              messages={teamMessages}
              onSendMessage={handleTeamMessage}
              isLoading={isLoadingTeam}
              inputPlaceholder="Start asking your questions about this recommendations"
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default ProposalAssistant

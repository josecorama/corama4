import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../services/api'
import { useTranslation, t as tFunc } from '../i18n'

// Discard Changes Popup Component
interface DiscardChangesPopupProps {
  isOpen: boolean
  onStayHere: () => void
  onDiscard: () => void
}

const DiscardChangesPopup = ({ isOpen, onStayHere, onDiscard }: DiscardChangesPopupProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onStayHere}
      />

      {/* Popup */}
      <div
        className="relative rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none w-full sm:w-auto mx-4 border border-white/20 animate-popup-pop"
        style={{ backgroundColor: 'rgb(11, 44, 72)', minHeight: '200px' }}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 hover:opacity-80 transition-opacity"
          onClick={onStayHere}
        >
          <img src="/static/app/proposal-summary/ClosePopupButton.svg" alt="Close" className="w-6 h-6" />
        </button>

        {/* Warning Icon */}
        <div className="flex-shrink-0">
          <img
            src="/static/app/proposal-summary/WarnIcon.svg"
            alt="Warning"
            className="w-16 h-16 sm:w-20 sm:h-20"
          />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-white font-poppins font-bold text-lg sm:text-xl mb-1">
              {tFunc('discardUnsavedChanges')}
            </h3>
            <p className="text-gray-300 font-poppins text-xs sm:text-sm">
              {tFunc('workflowMiddleWarning')}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onStayHere}
              className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'rgb(92, 191, 192)' }}
            >
              {tFunc('stayHere')}
            </button>
            <button
              onClick={onDiscard}
              className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'rgb(39, 69, 110)' }}
            >
              {tFunc('discardAndGoBack')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  return `${tFunc('hiImHereToHelp')} "${contractName}"

**${tFunc('quickActionsLabel')}**

- **${tFunc('analyzeContractCredits')}** (3 credits)
- **${tFunc('checkComplianceCredits')}** (2 credits)
- **${tFunc('developStrategyCredits')}** (3 credits)
- **${tFunc('createOutlineCredits')}** (2 credits)

${tFunc('readyToBuildProposal')}

${tFunc('typeStartProposal')}

*${tFunc('typeQuickDraft')}*`
}

const AIAssistant = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const state = location.state as { contractName?: string; contractAgency?: string; contractCategory?: string; contractId?: string; contractDetailLink?: string } | null
  const [pendingRedirect, setPendingRedirect] = useState<{ path: string; navState: any } | null>(null)

  const WATCH_LIST = [
    "https://cookcountyil.bonfirehub.com",
    "https://www.demandstar.com",
    "https://www.bidnetdirect.com",
    "https://vendors.planetbids.com",
    "https://www.publicpurchase.com",
    "https://iq.govwin.com",
    "https://ha.internationaleprocurement.com",
    "https://business.metro.net",
    "https://smart.gep.com"
  ]
  const [thirdPartyTarget, setThirdPartyTarget] = useState<string | null>(null)
  const [showThirdPartyPopup, setShowThirdPartyPopup] = useState(false)
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
    if (!href) {
      e.preventDefault()
      return
    }
    const isWatch = WATCH_LIST.some(prefix => href.startsWith(prefix))
    if (isWatch) {
      e.preventDefault()
      setThirdPartyTarget(href)
      setShowThirdPartyPopup(true)
    }
  }

  // Get contract name from state first, then from URL params (for returning from NoCS page)
  const contractNameFromState = state?.contractName
  const contractNameFromUrl = searchParams.get('contractName')
  const contractName = contractNameFromState || contractNameFromUrl || 'this contract'
  const contractId = state?.contractId || searchParams.get('contractId') || ''

  const initialDetailLink = state?.contractDetailLink || searchParams.get('contractDetailLink') || (() => { try { return sessionStorage.getItem('lastContractDetailLink') || '' } catch { return '' } })()
  const [resolvedDetailLink, setResolvedDetailLink] = useState(initialDetailLink)

  useEffect(() => {
    if (resolvedDetailLink || contractName === 'this contract') return
    let cancelled = false
    const recover = async () => {
      try {
        const res = await api.searchContracts(contractName, 1)
        if (cancelled) return
        const match = res.contracts.find(c => c.bid_name === contractName)
        if (match?.detail_link) {
          setResolvedDetailLink(match.detail_link)
          try { sessionStorage.setItem('lastContractDetailLink', match.detail_link) } catch {}
        }
      } catch {}
    }
    recover()
    return () => { cancelled = true }
  }, [contractName, resolvedDetailLink])

  // Check if user has capability statement on load
  const [hasCapabilityStatement, setHasCapabilityStatement] = useState<boolean | null>(null)

  useEffect(() => {
    const checkCapabilityStatement = async () => {
      try {
        const user = await api.getUser()
        setHasCapabilityStatement(user.has_capability_statement)
        if (!user.has_capability_statement) {
          const detailLinkForReturn = resolvedDetailLink || (() => { try { return sessionStorage.getItem('lastContractDetailLink') || '' } catch { return '' } })()
          const returnUrl = `/ai-assistant?contractName=${encodeURIComponent(contractName)}${contractId ? `&contractId=${encodeURIComponent(contractId)}` : ''}${detailLinkForReturn ? `&contractDetailLink=${encodeURIComponent(detailLinkForReturn)}` : ''}`
          navigate(`/no-capability-statement?returnTo=${encodeURIComponent(returnUrl)}`)
        }
      } catch (error) {
        console.error('Failed to check capability statement:', error)
        setHasCapabilityStatement(false)
      }
    }
    checkCapabilityStatement()
  }, [navigate, contractName, contractId, resolvedDetailLink])

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
  const [delayedNav, setDelayedNav] = useState<{ id: number; path: string; navState: any } | null>(null)

  // Simple Levenshtein distance for typo-tolerant command matching
  const levenshtein = (a: string, b: string) => {
    const m = a.length, n = b.length
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        )
      }
    }
    return dp[m][n]
  }
  const isNearCommand = (input: string, target: string) => {
    const norm = input.replace(/[^a-z0-9 ]+/g, '').trim()
    const tgt = target.replace(/[^a-z0-9 ]+/g, '').trim()
    const dist = levenshtein(norm, tgt)
    const threshold = Math.max(2, Math.floor(tgt.length * 0.2))
    return dist <= threshold
  }
  const [headerKey, setHeaderKey] = useState(0)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Discard changes popup state
  const [showDiscardPopup, setShowDiscardPopup] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Check if user has made progress (more than just the initial AI message)
  const hasUnsavedProgress = messages.length > 1

  // Handle staying on the page
  const handleStayHere = () => {
    setShowDiscardPopup(false)
    setPendingNavigation(null)
  }

  // Handle discarding changes and navigating away
  const handleDiscard = () => {
    setShowDiscardPopup(false)
    if (pendingNavigation) {
      navigate(pendingNavigation)
    } else {
      navigate(-1) // Go back if no specific path
    }
  }

  // Warn user before leaving the page via browser navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedProgress) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedProgress])

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

  // Navigate after a specific AI message finishes typing (used for Ok confirmation)
  useEffect(() => {
    if (!delayedNav) return
    const found = messages.find(m => m.id === delayedNav.id)
    if (found && !found.isTyping) {
      navigate(delayedNav.path, { state: delayedNav.navState })
      setDelayedNav(null)
    }
  }, [messages, delayedNav, navigate])

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

    // If awaiting confirmation, accept "ok" to proceed
    if (pendingRedirect && (normalizedInput === 'ok' || normalizedInput === 'okay')) {
      const confirmMsg: Message = {
        id: messages.length + 1,
        sender: 'user',
        content: userInput,
        timestamp: formatTime(),
      }

      const { path, navState } = pendingRedirect
      const ackText = path === '/proposal-assistant-analysis'
        ? "Great! I'll open the Proposal Assistant for you now. This will provide Market Value Insights and Team Composition strategies tailored to this contract's industry, helping you create a competitive bid."
        : "Great! I'll open the Contract Analysis for you now."
      const ackTyped: Message = {
        id: Date.now(),
        sender: 'ai',
        content: ackText,
        timestamp: formatTime(),
        isTyping: true,
        visibleContent: '',
      }

      setMessages(prev => [...prev, confirmMsg, ackTyped])
      setInputValue('')
      setPendingRedirect(null)

      setDelayedNav({ id: ackTyped.id, path, navState })
      return
    }

    // Near-match tolerance for "Start Proposal Assistant"
    if (
      (normalizedInput !== 'start proposal assistant' && !normalizedInput.includes('start proposal assistant')) &&
      isNearCommand(normalizedInput, 'start proposal assistant')
    ) {
      const newMessage: Message = {
        id: messages.length + 1,
        sender: 'user',
        content: userInput,
        timestamp: formatTime(),
      }
      const detailUrl = resolvedDetailLink
      const linkLine = detailUrl ? `\n\n🔗 [Download Contract Documents Here](${detailUrl})\n` : ''
      const instruction = `Looks like a typo — I\'ll assume you meant "Start Proposal Assistant" and proceed.\n\n` + `To get the best results, you will need to upload the Contract PDF in the next step. If you don't have it yet, you can download it directly from the official link below:${linkLine}\nType **\"Ok\"** once you have the file saved to your device.`
      const aiTyped: Message = {
        id: Date.now(),
        sender: 'ai',
        content: instruction,
        timestamp: formatTime(),
        isTyping: true,
        visibleContent: '',
      }
      setMessages(prev => [...prev, newMessage, aiTyped])
      setInputValue('')
      setPendingRedirect({
        path: '/proposal-assistant-analysis',
        navState: {
          contractName,
          contractId,
          contractAgency: state?.contractAgency,
          contractCategory: state?.contractCategory,
          contractDetailLink: resolvedDetailLink || undefined,
        },
      })
      return
    }

    // Check for "Start Proposal Assistant" - show pre-redirect message and wait for Ok
    if (normalizedInput === 'start proposal assistant' || normalizedInput.includes('start proposal assistant') || normalizedInput === 'iniciar asistente de propuestas' || normalizedInput.includes('iniciar asistente de propuestas')) {
      const newMessage: Message = {
        id: messages.length + 1,
        sender: 'user',
        content: userInput,
        timestamp: formatTime(),
      }

      const detailUrl = resolvedDetailLink
      const linkLine = detailUrl ? `\n\n🔗 [Download Contract Documents Here](${detailUrl})\n` : ''
      const instruction = `To get the best results, you will need to upload the Contract PDF in the next step. If you don't have it yet, you can download it directly from the official link below:${linkLine}\nType **"Ok"** once you have the file saved to your device.`
      const aiTyped: Message = {
        id: Date.now(),
        sender: 'ai',
        content: instruction,
        timestamp: formatTime(),
        isTyping: true,
        visibleContent: '',
      }

      setMessages(prev => [...prev, newMessage, aiTyped])
      setInputValue('')

      setPendingRedirect({
        path: '/proposal-assistant-analysis',
        navState: {
          contractName,
          contractId,
          contractAgency: state?.contractAgency,
          contractCategory: state?.contractCategory,
          contractDetailLink: resolvedDetailLink || undefined,
        },
      })
      return
    }

    // Near-match tolerance for "Quick Draft Mode"
    if (
      (normalizedInput !== 'quick draft mode' && !normalizedInput.includes('quick draft mode')) &&
      isNearCommand(normalizedInput, 'quick draft mode')
    ) {
      const newMessage: Message = {
        id: messages.length + 1,
        sender: 'user',
        content: userInput,
        timestamp: formatTime(),
      }
      const detailUrl = resolvedDetailLink
      const linkLine = detailUrl ? `\n\n🔗 [Download Contract Documents Here](${detailUrl})\n` : ''
      const instruction = `Looks like a typo — I\'ll assume you meant "Quick Draft Mode" and proceed.\n\n` + `To get the best results, you will need to upload the Contract PDF in the next step. If you don't have it yet, you can download it directly from the official link below:${linkLine}\nType **\"Ok\"** once you have the file saved to your device.`
      const aiTyped: Message = {
        id: Date.now(),
        sender: 'ai',
        content: instruction,
        timestamp: formatTime(),
        isTyping: true,
        visibleContent: '',
      }
      setMessages(prev => [...prev, newMessage, aiTyped])
      setInputValue('')
      setPendingRedirect({
        path: '/contract-analysis',
        navState: {
          contractName,
          contractId,
          contractAgency: state?.contractAgency,
          contractCategory: state?.contractCategory,
          contractDetailLink: resolvedDetailLink || undefined,
        },
      })
      return
    }

    // Check for "Quick Draft Mode" - show pre-redirect message and wait for Ok
    if (normalizedInput === 'quick draft mode' || normalizedInput.includes('quick draft mode') || normalizedInput === 'modo borrador rápido' || normalizedInput.includes('modo borrador rápido')) {
      const newMessage: Message = {
        id: messages.length + 1,
        sender: 'user',
        content: userInput,
        timestamp: formatTime(),
      }

      const detailUrl = resolvedDetailLink
      const linkLine = detailUrl ? `\n\n🔗 [Download Contract Documents Here](${detailUrl})\n` : ''
      const instruction = `To get the best results, you will need to upload the Contract PDF in the next step. If you don't have it yet, you can download it directly from the official link below:${linkLine}\nType **"Ok"** once you have the file saved to your device.`
      const aiTyped: Message = {
        id: Date.now(),
        sender: 'ai',
        content: instruction,
        timestamp: formatTime(),
        isTyping: true,
        visibleContent: '',
      }

      setMessages(prev => [...prev, newMessage, aiTyped])
      setInputValue('')

      setPendingRedirect({
        path: '/contract-analysis',
        navState: {
          contractName,
          contractId,
          contractAgency: state?.contractAgency,
          contractCategory: state?.contractCategory,
          contractDetailLink: resolvedDetailLink || undefined,
        },
      })
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
          // Generate idempotency key to prevent double-click duplicate charges
          const idempotencyKey = `ai_assistant_${actionKey}_${contractId}_${Date.now()}`
          const response = await api.aiAssistantAction(actionKey, contractName, conversationHistory, idempotencyKey)

          if (response.success) {
            addAiMessage(response.message)
            // Force Header to refresh credits (skip if cached response)
            if (!response.cached) {
              setHeaderKey(k => k + 1)
            }
          } else {
            addAiMessage(response.error || 'Sorry, I encountered an error processing your request. Please try again.')
          }
        } catch (error) {
          console.error('AI action error:', error)
          addAiMessage('Sorry, I encountered an error processing your request. Please try again later.')
        }
      }else {
        // Non-action message - send as conversation to maintain context (1 credit)
        // This allows the AI to follow up on its own questions
        try {
          const conversationHistory = buildConversationHistory()
          // Generate idempotency key to prevent double-click duplicate charges
          const idempotencyKey = `ai_assistant_conversation_${contractId}_${Date.now()}`
          const response = await api.aiAssistantAction('conversation', contractName, conversationHistory, idempotencyKey)

          if (response.success) {
            addAiMessage(response.message)
            // Force Header to refresh credits (skip if cached response)
            if (!response.cached) {
              setHeaderKey(k => k + 1)
            }
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

    // Show loading state while checking capability statement
    if (hasCapabilityStatement === null) {
      return (
        <div className="h-screen bg-corama-dark flex items-center justify-center">
          <div className="text-white font-poppins">{t('loadingPage')}</div>
        </div>
      )
    }

    return (
      <div className="h-screen bg-corama-dark flex flex-col overflow-hidden">
        {/* Discard Changes Popup */}
        <DiscardChangesPopup
          isOpen={showDiscardPopup}
          onStayHere={handleStayHere}
          onDiscard={handleDiscard}
        />

        {/* Header spans full width at top */}
        <Header key={headerKey} />

        {/* Sidebar + Content row below header */}
        <div className="flex flex-1 overflow-hidden">
          {/* Horizontal separator line across entire viewport width, below header (lg only) */}
          <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />

          <Sidebar
            onBeforeNavigate={(to) => {
              // Define workflow pages that should show the discard popup when leaving
              const workflowPages = ['/ai-assistant', '/team-builder', '/proposal-summary', '/proposal-generator', '/contract-analysis', '/proposal-team', '/public-bid-proposal-generator']
              const isLeavingWorkflow = !workflowPages.some(page => to.startsWith(page))

              // If user is leaving the workflow, show popup
              if (isLeavingWorkflow) {
                setPendingNavigation(to)
                setShowDiscardPopup(true)
                return false // Prevent navigation
              }
              return true // Allow navigation
            }}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <main className="flex-1 p-3 sm:p-4 lg:p-12 flex flex-col overflow-hidden">
            {/* Page Title */}
            <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in">
              <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl">
                <span className="text-corama-teal">{t('aiBidAssistantFor')}</span>{contractName}
              </h1>
            </div>

            {/* Chat Area - flex-1 to take remaining space, with scrollable messages */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-fade-in-up animate-delay-100">
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden ai-chat-scrollbar">
              <div className="space-y-3 sm:space-y-4 pr-2">
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
                                a: ({href, children}) => (
                                  <a
                                    href={href as string}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline hover:text-blue-700"
                                    onClick={(e) => handleAnchorClick(e, href as string)}
                                  >
                                    {children}
                                  </a>
                                ),
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
                                        {t('thinkingText')}<span className="animate-ellipsis">...</span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            </div>

              {/* Input Area - sticky at bottom, responsive */}
              <div className="flex-shrink-0 pt-3 sm:pt-4">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={t('askQuestionsHere')}
                    className="w-full border border-corama-teal/30 rounded-full py-3 sm:py-4 pl-4 sm:pl-6 pr-14 sm:pr-16 text-white placeholder-gray-400 focus:outline-none focus:border-corama-teal text-xs sm:text-sm truncate"
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
          {/* Third-Party Provider Confirmation Popup */}
          {showThirdPartyPopup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowThirdPartyPopup(false)} />
              <div className="relative rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none w-full sm:w-auto mx-4 border border-white/20 animate-popup-pop" style={{ backgroundColor: 'rgb(11, 44, 72)', minHeight: '200px' }}>
                <button className="absolute top-4 right-4 hover:opacity-80 transition-opacity" onClick={() => setShowThirdPartyPopup(false)}>
                  <img src="/static/app/proposal-summary/ClosePopupButton.svg" alt="Close" className="w-6 h-6" />
                </button>
                <div className="flex-shrink-0">
                  <img src="/static/app/proposal-summary/WarnIcon.svg" alt="Warning" className="w-16 h-16 sm:w-20 sm:h-20" />
                </div>
                <div className="flex flex-col gap-4 text-center sm:text-left">
                  <div>
                    <h3 className="text-white font-poppins font-bold text-lg sm:text-xl mb-1">Third-Party Contract</h3>
                    <p className="text-gray-300 font-poppins text-xs sm:text-sm">This contract is managed by a third-party provider. You will need to create an account on their site, where additional service fees may apply.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => { if (thirdPartyTarget) window.open(thirdPartyTarget, '_blank'); setShowThirdPartyPopup(false) }} className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'rgb(92, 191, 192)' }}>
                      Continue to Provider
                    </button>
                    <button onClick={() => setShowThirdPartyPopup(false)} className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'rgb(39, 69, 110)' }}>
                      Select Another Contract
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </main>
          </div>
        </div>
      </div>
    )
}

export default AIAssistant

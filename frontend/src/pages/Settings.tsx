import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { api } from '../services/api'

interface CreditHistoryItem {
  id: string
  date: string
  action: string
  cost: number
}

const LANGUAGE_KEY = 'corama_language'

const Settings = () => {
  const [username, setUsername] = useState('')
  const [isUsernameEditable, setIsUsernameEditable] = useState(false)
  const [language, setLanguage] = useState<'en' | 'es'>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    return (saved === 'es' ? 'es' : 'en') as 'en' | 'es'
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [creditHistory, setCreditHistory] = useState<CreditHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [supportStatus, setSupportStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)

  useEffect(() => {
    loadUserData()
    loadCreditHistory()
  }, [])

  const loadUserData = async () => {
    try {
      const user = await api.getUser()
      setUsername(user.username || '')
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const loadCreditHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await api.getCreditHistory()
      if (response.success && response.transactions) {
        setCreditHistory(response.transactions.map(tx => ({
          id: tx.id,
          date: tx.date,
          action: tx.action,
          cost: tx.cost
        })))
      }
    } catch (error) {
      console.error('Failed to load credit history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleUnlockUsername = () => {
    setIsUsernameEditable(true)
  }

  const handleLanguageChange = (newLang: 'en' | 'es') => {
    setLanguage(newLang)
    localStorage.setItem(LANGUAGE_KEY, newLang)
    // Dispatch event for other components to react to language change
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: newLang } }))
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      // TODO: Implement save functionality when backend endpoints are ready
      // For now, just show a success message
      await new Promise(resolve => setTimeout(resolve, 500))
      setSaveMessage('Changes saved successfully!')
      setIsUsernameEditable(false)
    } catch (error) {
      setSaveMessage('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendSupportMessage = async () => {
    if (!supportMessage.trim()) return
    
    setIsSendingMessage(true)
    setSupportStatus(null)
    
    try {
      const response = await api.sendSupportMessage(supportMessage)
      if (response.success) {
        setSupportStatus({ type: 'success', message: response.message || 'Message sent successfully!' })
        setSupportMessage('')
      } else {
        setSupportStatus({ type: 'error', message: response.error || 'Failed to send message.' })
      }
    } catch (error) {
      setSupportStatus({ type: 'error', message: 'Failed to send message. Please try again.' })
    } finally {
      setIsSendingMessage(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-3 sm:p-4 lg:p-12">
          <div className="mb-6 lg:mb-8">
            <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl uppercase tracking-wider">
              Account Settings
            </h1>
            <p className="text-gray-400 font-poppins text-sm">
              Manage profile, security & preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column - Profile & Security */}
            <div className="space-y-6 lg:space-y-8">
              <div className="bg-[#2F3C4F] rounded-xl p-4 lg:p-6 shadow-lg border border-[#2D5170]/30">
                <h2 className="text-white font-poppins font-semibold text-base mb-6 flex items-center gap-2">
                  Profile & Security
                  <img 
                    src="/static/app/dashboard/settings.svg" 
                    alt="" 
                    className="ml-auto w-5 h-5 opacity-80"
                    aria-hidden="true"
                  />
                </h2>

                <div className="space-y-6">
                  {/* Username */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-poppins text-gray-300 uppercase tracking-wide">
                        Username
                      </label>
                      {!isUsernameEditable && (
                        <button
                          onClick={handleUnlockUsername}
                          className="text-[10px] uppercase tracking-wider bg-[#1C4262] hover:bg-[#3E6B91] text-white px-3 py-1 rounded-full transition"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={!isUsernameEditable}
                      className="w-full bg-white border border-gray-200 rounded-full py-3 px-6 text-gray-800 focus:outline-none focus:border-[#99C8CA] text-sm disabled:opacity-70 disabled:bg-gray-200 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Language Toggle */}
                  <div>
                    <label className="block text-xs font-poppins text-gray-300 uppercase tracking-wide mb-2">
                      Language
                    </label>
                    <div className="flex bg-[#0B0B0F] p-1 rounded-full w-fit border border-[#2D5170]">
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                          language === 'en'
                            ? 'bg-[#99C8CA] text-[#0B0B0F]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => handleLanguageChange('es')}
                        className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                          language === 'es'
                            ? 'bg-[#99C8CA] text-[#0B0B0F]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Español
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-[#2D5170] w-full my-4"></div>

                  {/* Change Password */}
                  <div className="bg-[#0B0B0F]/30 p-5 rounded-xl border border-[#2D5170]/30">
                    <h3 className="text-white font-poppins text-sm font-semibold mb-4 flex items-center gap-2">
                      Change Password
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current Password"
                          className="w-full bg-white border border-gray-200 rounded-full py-3 px-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#99C8CA] text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={!currentPassword}
                          placeholder="New Password"
                          className="w-full bg-white border border-gray-200 rounded-full py-3 px-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#99C8CA] text-sm disabled:opacity-70 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={!currentPassword}
                          placeholder="Confirm"
                          className="w-full bg-white border border-gray-200 rounded-full py-3 px-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#99C8CA] text-sm disabled:opacity-70 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    {saveMessage && (
                      <span className={`mr-4 text-sm self-center ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                        {saveMessage}
                      </span>
                    )}
                    <button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="bg-[#1C4262] border-2 border-white hover:opacity-90 text-white font-bold py-3 px-8 rounded-lg transition text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                      {!isSaving && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Credits Usage & Support */}
            <div className="space-y-6 lg:space-y-8">
              {/* Credits Usage */}
              <div className="bg-[#2F3C4F] rounded-xl p-4 lg:p-6 shadow-lg border border-[#2D5170]/30">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-white font-poppins font-semibold text-base">
                    Credits Usage
                  </h2>
                  <svg className="w-5 h-5 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>

                <div className="overflow-hidden rounded-lg border border-[#2D5170]/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#0B0B0F]/50 text-gray-300 uppercase text-xs font-poppins">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                        <th className="px-4 py-3 text-right font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D5170]/30 text-gray-200 font-poppins text-xs sm:text-sm">
                      {isLoadingHistory ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                            Loading credit history...
                          </td>
                        </tr>
                      ) : creditHistory.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                            No credit transactions yet
                          </td>
                        </tr>
                      ) : (
                        creditHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-white/5 transition">
                            <td className="px-4 py-3">{item.date}</td>
                            <td className="px-4 py-3">{item.action}</td>
                            <td className={`px-4 py-3 text-right ${item.cost > 0 ? 'text-[#99C8CA]' : 'text-red-300'}`}>
                              {item.cost > 0 ? `+${item.cost}` : item.cost}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {creditHistory.length > 0 && (
                  <button className="w-full mt-4 text-center text-[#99C8CA] text-xs font-poppins uppercase tracking-wide hover:opacity-80 transition">
                    View Full History
                  </button>
                )}
              </div>

              {/* Contact Support */}
              <div className="bg-[#2F3C4F] rounded-xl p-4 lg:p-6 shadow-lg border border-[#2D5170]/30">
                <h2 className="text-white font-poppins font-semibold text-base mb-2 flex items-center gap-2">
                  Contact Support
                  <svg className="ml-auto w-5 h-5 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </h2>
                <p className="text-gray-400 font-poppins text-xs mb-4">
                  Need help with your account or finding contracts?
                </p>

                <textarea
                  rows={4}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  disabled={isSendingMessage}
                  className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#99C8CA] text-sm mb-4 resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="How can we help?"
                />

                {supportStatus && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    supportStatus.type === 'success' 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {supportStatus.message}
                  </div>
                )}

                <button
                  onClick={handleSendSupportMessage}
                  disabled={isSendingMessage || !supportMessage.trim()}
                  className="w-full bg-[#99C8CA] hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition text-sm flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingMessage ? 'Sending...' : 'Send Message'}
                  {!isSendingMessage && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Settings

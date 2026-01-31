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

// Translation strings
const translations = {
  en: {
    accountSettings: 'Account Settings',
    manageProfile: 'Manage profile, security & preferences',
    profileSecurity: 'Profile & Security',
    username: 'Username',
    edit: 'Edit',
    language: 'Language',
    english: 'English',
    spanish: 'Español',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirm: 'Confirm',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    creditsUsage: 'Credits Usage',
    date: 'Date',
    action: 'Action',
    cost: 'Cost',
    loadingHistory: 'Loading credit history...',
    noTransactions: 'No credit transactions yet',
    viewFullHistory: 'View Full History',
    contactSupport: 'Contact Support',
    needHelp: 'Need help with your account or finding contracts?',
    howCanWeHelp: 'How can we help?',
    sendMessage: 'Send Message',
    sending: 'Sending...',
  },
  es: {
    accountSettings: 'Configuración de Cuenta',
    manageProfile: 'Administrar perfil, seguridad y preferencias',
    profileSecurity: 'Perfil y Seguridad',
    username: 'Nombre de Usuario',
    edit: 'Editar',
    language: 'Idioma',
    english: 'English',
    spanish: 'Español',
    changePassword: 'Cambiar Contraseña',
    currentPassword: 'Contraseña Actual',
    newPassword: 'Nueva Contraseña',
    confirm: 'Confirmar',
    saveChanges: 'Guardar Cambios',
    saving: 'Guardando...',
    creditsUsage: 'Uso de Créditos',
    date: 'Fecha',
    action: 'Acción',
    cost: 'Costo',
    loadingHistory: 'Cargando historial de créditos...',
    noTransactions: 'Sin transacciones de créditos aún',
    viewFullHistory: 'Ver Historial Completo',
    contactSupport: 'Contactar Soporte',
    needHelp: '¿Necesita ayuda con su cuenta o encontrar contratos?',
    howCanWeHelp: '¿Cómo podemos ayudarle?',
    sendMessage: 'Enviar Mensaje',
    sending: 'Enviando...',
  }
}

const Settings = () => {
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
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
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [creditHistory, setCreditHistory] = useState<CreditHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [supportStatus, setSupportStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)

  // Get translations for current language
  const t = translations[language]

  useEffect(() => {
    loadUserData()
    loadCreditHistory()
  }, [])

  const loadUserData = async () => {
    try {
      const user = await api.getUser()
      const name = user.username || ''
      setUsername(name)
      setOriginalUsername(name)
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
    setSaveMessage(null)
    
    try {
      let hasChanges = false
      let allSuccess = true
      const messages: string[] = []

      // Update username if changed
      if (isUsernameEditable && username !== originalUsername) {
        hasChanges = true
        const usernameResponse = await api.updateUsername(username)
        if (usernameResponse.success) {
          setOriginalUsername(username)
          setIsUsernameEditable(false)
          messages.push(usernameResponse.message || 'Username updated!')
        } else {
          allSuccess = false
          messages.push(usernameResponse.error || 'Failed to update username')
        }
      }

      // Change password if provided
      if (currentPassword && newPassword) {
        hasChanges = true
        const passwordResponse = await api.changePassword(currentPassword, newPassword, confirmPassword)
        if (passwordResponse.success) {
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          messages.push(passwordResponse.message || 'Password changed!')
        } else {
          allSuccess = false
          messages.push(passwordResponse.error || 'Failed to change password')
        }
      }

      if (!hasChanges) {
        setSaveMessage({ type: 'success', text: language === 'es' ? 'No hay cambios para guardar' : 'No changes to save' })
      } else {
        setSaveMessage({ 
          type: allSuccess ? 'success' : 'error', 
          text: messages.join('. ')
        })
      }

      if (allSuccess && isUsernameEditable) {
        setIsUsernameEditable(false)
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: language === 'es' ? 'Error al guardar cambios' : 'Failed to save changes. Please try again.' })
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
        setSupportStatus({ type: 'success', message: response.message || (language === 'es' ? 'Mensaje enviado exitosamente!' : 'Message sent successfully!') })
        setSupportMessage('')
      } else {
        setSupportStatus({ type: 'error', message: response.error || (language === 'es' ? 'Error al enviar mensaje.' : 'Failed to send message.') })
      }
    } catch (error) {
      setSupportStatus({ type: 'error', message: language === 'es' ? 'Error al enviar mensaje. Intente de nuevo.' : 'Failed to send message. Please try again.' })
    } finally {
      setIsSendingMessage(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B2C48] flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-3 sm:p-4 lg:p-12">
          <div className="mb-6 lg:mb-8">
            <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl uppercase tracking-wider">
              {t.accountSettings}
            </h1>
            <p className="text-gray-400 font-poppins text-sm">
              {t.manageProfile}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column - Profile & Security */}
            <div className="space-y-6 lg:space-y-8">
              <div className="bg-[#0B2C48] rounded-xl p-4 lg:p-6 shadow-lg border border-[#2D5170]/30">
                <h2 className="text-white font-poppins font-semibold text-base mb-6">
                  {t.profileSecurity}
                </h2>

                <div className="space-y-6">
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-poppins text-gray-300 uppercase tracking-wide mb-2">
                      {t.username}
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={!isUsernameEditable}
                      className="w-full bg-white border border-gray-200 rounded-full py-3 px-6 text-gray-800 focus:outline-none focus:border-[#99C8CA] text-sm disabled:opacity-70 disabled:bg-gray-200 disabled:cursor-not-allowed"
                    />
                    {!isUsernameEditable && (
                      <button
                        onClick={handleUnlockUsername}
                        className="mt-3 text-sm uppercase tracking-wider bg-[#1C4262] hover:bg-[#3E6B91] text-white px-6 py-2 rounded-full transition"
                      >
                        {t.edit}
                      </button>
                    )}
                  </div>

                  {/* Language Toggle */}
                  <div>
                    <label className="block text-xs font-poppins text-gray-300 uppercase tracking-wide mb-2">
                      {t.language}
                    </label>
                    <div className="flex bg-[#0B2C48] p-1 rounded-full w-fit border border-[#2D5170]">
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                          language === 'en'
                            ? 'bg-[#99C8CA] text-[#0B0B0F]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {t.english}
                      </button>
                      <button
                        onClick={() => handleLanguageChange('es')}
                        className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                          language === 'es'
                            ? 'bg-[#99C8CA] text-[#0B0B0F]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {t.spanish}
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-[#2D5170] w-full my-4"></div>

                  {/* Change Password */}
                  <div className="p-5 rounded-xl">
                    <h3 className="text-white font-poppins text-sm font-semibold mb-4">
                      {t.changePassword}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder={t.currentPassword}
                          className="w-full bg-white border border-gray-200 rounded-full py-3 px-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#99C8CA] text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={!currentPassword}
                          placeholder={t.newPassword}
                          className="w-full bg-white border border-gray-200 rounded-full py-3 px-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#99C8CA] text-sm disabled:opacity-70 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={!currentPassword}
                          placeholder={t.confirm}
                          className="w-full bg-white border border-gray-200 rounded-full py-3 px-6 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#99C8CA] text-sm disabled:opacity-70 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    {saveMessage && (
                      <span className={`mr-4 text-sm self-center ${saveMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {saveMessage.text}
                      </span>
                    )}
                                        <button
                                          onClick={handleSaveChanges}
                                          disabled={isSaving}
                                          className="bg-[#1C4262] border-2 border-white hover:opacity-90 text-white font-bold py-3 px-8 rounded-lg transition text-sm flex items-center gap-2 disabled:opacity-50"
                                        >
                                          <span>{isSaving ? t.saving : t.saveChanges}</span>
                                        </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Credits Usage & Support */}
            <div className="space-y-6 lg:space-y-8">
                            {/* Credits Usage */}
                            <div className="bg-[#0B2C48] rounded-xl p-4 lg:p-6 shadow-lg border border-[#2D5170]/30">
                              <div className="flex justify-between items-center mb-6">
                                <h2 className="text-white font-poppins font-semibold text-base">
                                  {t.creditsUsage}
                                </h2>
                              </div>

                <div className="overflow-hidden rounded-lg border border-[#2D5170]/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#0B0B0F]/50 text-gray-300 uppercase text-xs font-poppins">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t.date}</th>
                        <th className="px-4 py-3 font-medium">{t.action}</th>
                        <th className="px-4 py-3 text-right font-medium">{t.cost}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D5170]/30 text-gray-200 font-poppins text-xs sm:text-sm">
                      {isLoadingHistory ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                            {t.loadingHistory}
                          </td>
                        </tr>
                      ) : creditHistory.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                            {t.noTransactions}
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
                    {t.viewFullHistory}
                  </button>
                )}
              </div>

                            {/* Contact Support */}
                            <div className="bg-[#0B2C48] rounded-xl p-4 lg:p-6 shadow-lg border border-[#2D5170]/30">
                              <h2 className="text-white font-poppins font-semibold text-base mb-2 flex items-center gap-2">
                                {t.contactSupport}
                              </h2>
                <p className="text-gray-400 font-poppins text-xs mb-4">
                  {t.needHelp}
                </p>

                <textarea
                  rows={4}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  disabled={isSendingMessage}
                  className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#99C8CA] text-sm mb-4 resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder={t.howCanWeHelp}
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
                                  {isSendingMessage ? t.sending : t.sendMessage}
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

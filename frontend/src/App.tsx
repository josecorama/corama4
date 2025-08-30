import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './contexts/theme-context'
import { AccessibilitySkipLink } from './components/ui/accessibility-skip-link'
import { AppShell } from './components/layout/AppShell'
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import CommandPalette from './components/ui/command-palette'
import CopilotPanel from './components/ui/copilot-panel'
import Dashboard from './pages/Dashboard'
import Opportunities from './pages/Opportunities'
import Quoter from './pages/Quoter'
import Proposals from './pages/Proposals'
import Pipeline from './pages/Pipeline'
import Settings from './pages/Settings'
import { useCommandPalette } from './hooks/use-command-palette'
import { useCopilot } from './hooks/use-copilot'
import './App.css'

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<'es' | 'en'>('es')
  const commandPalette = useCommandPalette()
  const copilot = useCopilot()
  const location = useLocation()

  useEffect(() => {
    const page = location.pathname.slice(1) || 'dashboard'
    copilot.updateContext(page)
  }, [location.pathname, copilot])

  return (
    <div className="min-h-screen bg-background">
      <AccessibilitySkipLink />
      <Navbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onCopilotClick={copilot.toggle}
        onCommandClick={commandPalette.open}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
      />
      
      <AppShell
        isCopilotOpen={copilot.isOpen}
        sidebar={
          <Sidebar 
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            currentLanguage={currentLanguage}
          />
        }
        main={
          <div 
            id="main-content"
            role="main"
            aria-label="Contenido principal"
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/quoter" element={<Quoter />} />
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        }
        copilot={
          <CopilotPanel
            isOpen={copilot.isOpen}
            onClose={copilot.close}
            currentLanguage={currentLanguage}
            context={copilot.context}
          />
        }
      />
      
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        currentLanguage={currentLanguage}
      />
      
      <Toaster position="top-right" />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  )
}

export default App

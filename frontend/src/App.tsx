import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import CapabilityBuilder from './pages/CapabilityBuilder'
import TopFiveContracts from './pages/TopFiveContracts'
import AIAssistant from './pages/AIAssistant'
import GetMoreCredits from './pages/GetMoreCredits'
import CoramaDirectory from './pages/CoramaDirectory'
import EditDirectoryProfile from './pages/EditDirectoryProfile'
import NoCapabilityStatement from './pages/NoCapabilityStatement'
import ContractAnalysis from './pages/ContractAnalysis'
import ProposalTeam from './pages/ProposalTeam'
import ProposalSummary from './pages/ProposalSummary'
import PublicBidProposalGenerator from './pages/PublicBidProposalGenerator'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ConfirmTerms from './pages/ConfirmTerms'
import ResetPassword from './pages/ResetPassword'
import ResetPasswordConfirm from './pages/ResetPasswordConfirm'
import VerifyEmail from './pages/VerifyEmail'
import FAQ from './pages/FAQ'
import AboutUsPublic from './pages/AboutUsPublic'
import Support from './pages/Support'

function App() {
  useEffect(() => {
    const applyDesktopScaling = () => {
      const viewportWidth = window.innerWidth
      const targetWidth = 1920
      
      // Only apply scaling on desktop (>= 1024px) and when viewport is smaller than target
      if (viewportWidth >= 1024 && viewportWidth < targetWidth) {
        const scale = viewportWidth / targetWidth
        // Use transform scale instead of zoom for better viewport handling
        document.body.style.transform = `scale(${scale})`
        document.body.style.transformOrigin = 'top left'
        document.body.style.width = `${100 / scale}%`
        document.body.style.minHeight = `${100 / scale}vh`
        document.documentElement.style.overflow = 'hidden'
      } else {
        document.body.style.transform = ''
        document.body.style.transformOrigin = ''
        document.body.style.width = ''
        document.body.style.minHeight = ''
        document.documentElement.style.overflow = ''
      }
    }
    
    applyDesktopScaling()
    window.addEventListener('resize', applyDesktopScaling)
    
    return () => {
      window.removeEventListener('resize', applyDesktopScaling)
      document.body.style.transform = ''
      document.body.style.transformOrigin = ''
      document.body.style.width = ''
      document.body.style.minHeight = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/confirm-terms" element={<ConfirmTerms />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/faq" element={<FAQ />} />
        <Route path="/about-us" element={<AboutUsPublic />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/capability-builder" element={<CapabilityBuilder />} />
        <Route path="/top-five-contracts" element={<TopFiveContracts />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/get-more-credits" element={<GetMoreCredits />} />
        <Route path="/corama-directory" element={<CoramaDirectory />} />
        <Route path="/edit-directory-profile" element={<EditDirectoryProfile />} />
        <Route path="/no-capability-statement" element={<NoCapabilityStatement />} />
        <Route path="/contract-analysis" element={<ContractAnalysis />} />
        <Route path="/proposal-team" element={<ProposalTeam />} />
        <Route path="/proposal-summary" element={<ProposalSummary />} />
                          <Route path="/public-bid-proposal-generator" element={<PublicBidProposalGenerator />} />
                          <Route path="/support" element={<Support />} />
                        </Routes>
    </Router>
  )
}

export default App

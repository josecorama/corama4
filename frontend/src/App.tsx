import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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
import ProposalAssistantAnalysis from './pages/ProposalAssistantAnalysis'
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
import AdminDirectory from './pages/AdminDirectory'
import AdminContracts from './pages/AdminContracts'
import ProposalAssistant from './pages/ProposalAssistant'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

function App() {
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
        <Route path="/proposal-assistant-analysis" element={<ProposalAssistantAnalysis />} />
        <Route path="/proposal-team" element={<ProposalTeam />} />
        <Route path="/proposal-summary" element={<ProposalSummary />} />
                                                  <Route path="/public-bid-proposal-generator" element={<PublicBidProposalGenerator />} />
                                                  <Route path="/support" element={<Support />} />
                                                                                                    <Route path="/admin/directory" element={<AdminDirectory />} />
                                                                                                                                                                                                        <Route path="/admin/contracts" element={<AdminContracts />} />
                                                                                                                                                                                                        <Route path="/proposal-assistant" element={<ProposalAssistant />} />
                                                                                                                                                                                                                                                        <Route path="/settings" element={<Settings />} />
                                                        <Route path="*" element={<NotFound />} />
                                                      </Routes>
    </Router>
  )
}

export default App

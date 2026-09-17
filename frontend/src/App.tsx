import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CapabilityBuilder = lazy(() => import('./pages/CapabilityBuilder'))
const TopFiveContracts = lazy(() => import('./pages/TopFiveContracts'))
const AIAssistant = lazy(() => import('./pages/AIAssistant'))
const CoramaDirectory = lazy(() => import('./pages/CoramaDirectory'))
const EditDirectoryProfile = lazy(() => import('./pages/EditDirectoryProfile'))
const NoCapabilityStatement = lazy(() => import('./pages/NoCapabilityStatement'))
const ContractAnalysis = lazy(() => import('./pages/ContractAnalysis'))
const ProposalAssistantAnalysis = lazy(() => import('./pages/ProposalAssistantAnalysis'))
const ProposalTeam = lazy(() => import('./pages/ProposalTeam'))
const ProposalSummary = lazy(() => import('./pages/ProposalSummary'))
const PublicBidProposalGenerator = lazy(() => import('./pages/PublicBidProposalGenerator'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const ConfirmTerms = lazy(() => import('./pages/ConfirmTerms'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const ResetPasswordConfirm = lazy(() => import('./pages/ResetPasswordConfirm'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const FAQ = lazy(() => import('./pages/FAQ'))
const AboutUsPublic = lazy(() => import('./pages/AboutUsPublic'))
const Support = lazy(() => import('./pages/Support'))
const AdminDirectory = lazy(() => import('./pages/AdminDirectory'))
const AdminContracts = lazy(() => import('./pages/AdminContracts'))
const ProposalAssistant = lazy(() => import('./pages/ProposalAssistant'))
const Settings = lazy(() => import('./pages/Settings'))
const PrivacyNotice = lazy(() => import('./pages/PrivacyNotice'))
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-corama-dark">
      <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-corama-teal animate-spin" />
    </div>
  )
}

function App() {
  return (
    <Router basename="/">
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/privacy-notice" element={<PrivacyNotice />} />
          <Route path="/terms-of-use" element={<TermsOfUse />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/capability-builder" element={<CapabilityBuilder />} />
          <Route path="/top-five-contracts" element={<TopFiveContracts />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
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
      </Suspense>
    </Router>
  )
}

export default App

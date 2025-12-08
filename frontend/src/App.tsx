import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import CapabilityBuilder from './pages/CapabilityBuilder'
import TopFiveContracts from './pages/TopFiveContracts'
import AIAssistant from './pages/AIAssistant'
import GetMoreCredits from './pages/GetMoreCredits'
import CoramaDirectory from './pages/CoramaDirectory'
import EditDirectoryProfile from './pages/EditDirectoryProfile'

function App() {
  return (
    <Router basename="/app">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/capability-builder" element={<CapabilityBuilder />} />
        <Route path="/top-five-contracts" element={<TopFiveContracts />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/get-more-credits" element={<GetMoreCredits />} />
        <Route path="/corama-directory" element={<CoramaDirectory />} />
        <Route path="/edit-directory-profile" element={<EditDirectoryProfile />} />
      </Routes>
    </Router>
  )
}

export default App

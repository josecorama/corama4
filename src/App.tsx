import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import CapabilityBuilder from './pages/CapabilityBuilder'
import ContractSearch from './pages/ContractSearch'
import PricingPage from './pages/PricingPage'
import BidResponseBuilder from './pages/BidResponseBuilder'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/capability-builder" element={
              <ProtectedRoute>
                <CapabilityBuilder />
              </ProtectedRoute>
            } />
            <Route path="/contract-search" element={
              <ProtectedRoute>
                <ContractSearch />
              </ProtectedRoute>
            } />
            <Route path="/bid-response" element={
              <ProtectedRoute>
                <BidResponseBuilder />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Sparkles, Mail, Lock, ArrowLeft } from 'lucide-react'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login, loginWithGoogle, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(email, password)
    } catch (err) {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <main className="container">
        <section style={{ paddingBlock: 'var(--space-8)' }}>
          <div className="flex items-center justify-center min-h-screen">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ width: 'clamp(320px, 90vw, 448px)' }}
            >
              <Link to="/" className="inline-flex items-center text-white hover:text-blue-400 mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-white">Corama</span>
                  </div>
                  <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
                  <CardDescription className="text-slate-300">
                    Sign in to your account to continue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                          placeholder="Enter your email"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn w-full focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
                    >
                      {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                  </form>

                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-transparent text-slate-300">Or continue with</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setLoading(true)
                          await loginWithGoogle()
                        } catch (err) {
                          setError('Google sign-in failed. Please try again.')
                        } finally {
                          setLoading(false)
                        }
                      }}
                      disabled={loading}
                      className="btn w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>
                  </div>

                  <div className="mt-6 text-center">
                    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h3 className="text-white font-medium mb-2">Why sign up?</h3>
                      <ul className="text-slate-300 text-sm space-y-1 text-left">
                        <li>• Generate AI-powered capability statements</li>
                        <li>• Access full contract search and analysis</li>
                        <li>• Create bid responses with AI assistance</li>
                        <li>• Save and manage your documents</li>
                        <li>• Get competitive analysis for contracts</li>
                        <li>• Collaborate with fine-tuned AI models</li>
                      </ul>
                    </div>
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-green-300 text-sm">
                        <strong>Free to start!</strong> Browse contracts for free, pay only for AI features with credits.
                      </p>
                    </div>
                    <p className="text-slate-300">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                        Sign up
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default LoginPage

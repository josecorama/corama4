import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { signInWithRedirect, getRedirectResult, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

interface User {
  id: string
  email: string
  name: string
  company?: string
  credits: number
  subscription_tier: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string, name: string, company?: string) => Promise<void>
  logout: () => void
  loading: boolean
  fetchUserProfile: (authToken: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log('Checking for Google OAuth redirect result...')
        const result = await getRedirectResult(auth)
        if (result) {
          const user = result.user
          console.log('Firebase redirect authentication successful:', user.uid, user.email)
          
          console.log('Sending request to backend:', `${API_BASE_URL}/auth/google-login`)
          const response = await axios.post(`${API_BASE_URL}/auth/google-login`, {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photo: user.photoURL
          })
          console.log('Backend response received:', response.data)
          
          const { access_token, user: userData } = response.data
          setToken(access_token)
          setUser(userData)
          
          localStorage.setItem('token', access_token)
          localStorage.setItem('user', JSON.stringify(userData))
          console.log('Google OAuth completed successfully, navigating to dashboard...')
          
          setLoading(false)
          
          setTimeout(() => {
            console.log('Attempting navigation to dashboard...')
            navigate('/dashboard', { replace: true })
            console.log('Navigation to dashboard completed')
          }, 200)
          return
        }
      } catch (error) {
        console.error('Google OAuth redirect result error:', error)
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          })
        }
      }
      
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      
      if (storedToken && storedUser) {
        console.log('AuthContext: Loading stored user and token')
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
        console.log('AuthContext: Calling fetchUserProfile to get fresh data')
        try {
          await fetchUserProfile(storedToken)
          console.log('AuthContext: fetchUserProfile completed successfully')
        } catch (error) {
          console.error('Failed to fetch fresh user profile on init:', error)
        }
      }
      setLoading(false)
    }
    
    handleRedirectResult().catch(error => {
      console.error('Error in handleRedirectResult:', error)
      setLoading(false)
    })
  }, [navigate, API_BASE_URL])

  const fetchUserProfile = async (authToken: string) => {
    try {
      console.log('fetchUserProfile: Making API call to', `${API_BASE_URL}/user/profile`)
      const response = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const updatedUser = response.data
      console.log('fetchUserProfile: Received user data with credits:', updatedUser.credits)
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      console.log('fetchUserProfile: Updated React state and localStorage')
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      })
      
      const { access_token, user: userData } = response.data
      setToken(access_token)
      setUser(userData)
      
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      throw new Error('Login failed')
    }
  }

  const register = async (email: string, password: string, name: string, company?: string) => {
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        name,
        company
      })
      
      await login(email, password)
    } catch (error) {
      throw new Error('Registration failed')
    }
  }

  const loginWithGoogle = async () => {
    try {
      console.log('Starting Google OAuth redirect flow...')
      await signInWithRedirect(auth, googleProvider)
    } catch (error) {
      console.error('Google OAuth redirect error:', error)
      throw new Error('Google login failed')
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    firebaseSignOut(auth)
  }

  const value = {
    user,
    token,
    login,
    loginWithGoogle,
    register,
    logout,
    loading,
    fetchUserProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

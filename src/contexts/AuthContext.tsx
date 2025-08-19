import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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

  const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
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
          console.log('Google OAuth completed successfully')
          
          window.location.href = '/dashboard'
          return
        }
      } catch (error) {
        console.error('Google OAuth redirect result error:', error)
      }
      
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
        fetchUserProfile(storedToken)
      }
      setLoading(false)
    }
    
    handleRedirectResult()
  }, [])

  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const updatedUser = response.data
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
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

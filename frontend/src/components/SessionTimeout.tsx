import { useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'

const SESSION_TIMEOUT_MS = 15 * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

const SessionTimeout = () => {
  const timeoutRef = useRef<number | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const handleLogout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      window.location.href = '/login?session_expired=true'
    }
  }, [])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = window.setTimeout(() => {
      handleLogout()
    }, SESSION_TIMEOUT_MS)
  }, [handleLogout])

  useEffect(() => {
    resetTimer()

    const handleActivity = () => {
      resetTimer()
    }

    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [resetTimer])

  return null
}

export default SessionTimeout

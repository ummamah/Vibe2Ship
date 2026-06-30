import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService, User } from '../services/authService'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  sendOTP: (email: string) => Promise<void>
  verifyOTP: (email: string, code: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restore auth state on mount
  useEffect(() => {
    const restore = async () => {
      const hasToken = authService.restoreToken()
      if (hasToken) {
        try {
          const userData = await authService.getMe()
          if (userData) {
            setUser(userData)
            setIsAuthenticated(true)
          } else {
            authService.logout()
          }
        } catch {
          authService.logout()
        }
      }
      setIsLoading(false)
    }
    restore()
  }, [])

  const sendOTP = useCallback(async (email: string) => {
    setError(null)
    try {
      await authService.sendOTP(email)
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Failed to send OTP'
      setError(message)
      throw err
    }
  }, [])

  const verifyOTP = useCallback(async (email: string, code: string) => {
    setError(null)
    try {
      const response = await authService.verifyOTP(email, code)
      setUser(response.user)
      setIsAuthenticated(true)
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Failed to verify OTP'
      setError(message)
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setIsAuthenticated(false)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        sendOTP,
        verifyOTP,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

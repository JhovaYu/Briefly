'use client'

import { useState, useEffect, useCallback } from 'react'
import { authApi } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('briefly_token')
    const savedUser = localStorage.getItem('briefly_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('briefly_user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.post('/auth/login', { email, password })
    const { access_token, user: userData } = res.data
    localStorage.setItem('briefly_token', access_token)
    localStorage.setItem('briefly_user', JSON.stringify(userData))
    setToken(access_token)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    await authApi.post('/auth/register', { name, email, password })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('briefly_token')
    localStorage.removeItem('briefly_user')
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }, [])

  return {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  }
}

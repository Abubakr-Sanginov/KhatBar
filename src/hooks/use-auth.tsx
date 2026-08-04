"use client"

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react"
import type { User } from "@/types"
import { useSocketStore } from "@/stores"
import { publishPrivateChatIdentity } from "@/lib/e2ee"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUsername: (username: string) => Promise<void>
  updateUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const setToken = useSocketStore((s) => s.setToken)

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (r) => {
        if (!r.ok) return { user: null }
        const contentType = r.headers.get("content-type") || ""
        return contentType.includes("application/json") ? r.json() : { user: null }
      })
      .then((data) => {
        setUser(data.user)
        if (data.token) setToken(data.token)
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [setToken])

  // This publishes only the public ECDH key. The corresponding private key is
  // non-exportable and remains in this browser's IndexedDB.
  useEffect(() => {
    if (!user?.id) return
    publishPrivateChatIdentity(user.id).catch(() => {})
  }, [user?.id])

  const applyAuth = useCallback((data: { user: User; token?: string }) => {
    setUser(data.user)
    if (data.token) setToken(data.token)
  }, [setToken])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error("Invalid credentials")
    const data = await res.json()
    applyAuth(data)
  }, [applyAuth])

  const register = useCallback(async (email: string, username: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    })
    if (!res.ok) throw new Error("Registration failed")
    const data = await res.json()
    applyAuth(data)
  }, [applyAuth])

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    setToken(null)
  }, [setToken])

  const setUsername = useCallback(async (username: string) => {
    const res = await fetch("/api/auth/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to set username")
    }
    const data = await res.json()
    setUser(data.user)
  }, [])

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin: user?.role === "ADMIN", login, register, logout, setUsername, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AuthFormProps {
  mode: "login" | "register"
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Only same-origin relative paths, so `next` cannot bounce to another site.
  const rawNext = searchParams.get("next")
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"
  const nextQuery = nextPath === "/" ? "" : `?next=${encodeURIComponent(nextPath)}`

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const email = String(form.get("email") || "").trim()
    const password = String(form.get("password") || "")
    const username = String(form.get("username") || "").trim()

    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const body = mode === "login" ? { email, password } : { email, username, password }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Something went wrong")
      }

      router.push(nextPath)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="rounded-2xl border bg-card p-6 shadow-premium">
        <h2 className="mb-1 text-xl font-semibold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to your account to continue"
            : "Sign up for a new account"}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
                Username <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="username"
                name="username"
                placeholder="Abubakr"
                autoCapitalize="none"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                You can add it later if you skip it.
              </p>
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="hello@example.com" required disabled={isLoading} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required disabled={isLoading} />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </span>
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <a href={`/register${nextQuery}`} className="font-medium text-primary hover:underline">Sign up</a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a href={`/login${nextQuery}`} className="font-medium text-primary hover:underline">Sign in</a>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

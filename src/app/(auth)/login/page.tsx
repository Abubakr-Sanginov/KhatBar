import { Suspense } from "react"
import { AuthForm } from "@/components/auth/auth-form"

export default function LoginPage() {
  // AuthForm reads `next` from the query string, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  )
}

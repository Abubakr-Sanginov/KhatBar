import { Suspense } from "react"
import { AuthForm } from "@/components/auth/auth-form"

export default function RegisterPage() {
  // AuthForm reads `next` from the query string, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AuthForm mode="register" />
    </Suspense>
  )
}

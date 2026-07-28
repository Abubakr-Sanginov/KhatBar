import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = ["/login", "/register", "/api/auth/login", "/api/auth/register"]

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value
  const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p))
  const isApi = request.nextUrl.pathname.startsWith("/api")

  if (isPublic || isApi) return NextResponse.next()
  if (!token) return NextResponse.redirect(new URL("/login", request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
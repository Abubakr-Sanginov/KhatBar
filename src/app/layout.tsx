import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { AuthProvider } from "@/hooks/use-auth"
import { CallProvider } from "@/hooks/use-call"
import { CallOverlay } from "@/components/call/call-overlay"
import { UsernameSetupDialog } from "@/components/auth/username-setup-dialog"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "KhatBar — Messenger",
  description: "Premium messaging experience",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full font-sans">
        <ThemeProvider>
          <AuthProvider>
            <CallProvider>
              {children}
              <UsernameSetupDialog />
              <CallOverlay />
            </CallProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
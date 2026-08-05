import type { Metadata } from "next"
import { Bricolage_Grotesque, Geist, Geist_Mono, Manrope } from "next/font/google"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { skinScript } from "@/hooks/use-skin"
import { AuthProvider } from "@/hooks/use-auth"
import { CallProvider } from "@/hooks/use-call"
import { CallOverlay } from "@/components/call/call-overlay"
import { UsernameSetupDialog } from "@/components/auth/username-setup-dialog"
import { DEFAULT_SKIN } from "@/lib/skins"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Typefaces for the Ember interface: a display face for headings, a body face
// for everything else. Loaded up front so switching interfaces is instant.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
})

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
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
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${manrope.variable} h-full antialiased`}
      data-skin={DEFAULT_SKIN}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: skinScript }} />
      </head>
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
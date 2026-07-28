export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            KhatBar
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Premium messaging experience
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
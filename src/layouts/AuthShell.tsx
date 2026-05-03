import { Outlet } from 'react-router-dom'

export function AuthShell() {
  return (
    <main className="min-h-screen bg-ink-950 px-4 py-10 text-porcelain-50 md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <Outlet />
      </div>
    </main>
  )
}

import { ReactNode } from 'react'

interface AppShellProps {
  sidebar: ReactNode
  main: ReactNode
  copilot: ReactNode
  isCopilotOpen: boolean
}

export function AppShell({ sidebar, main, copilot, isCopilotOpen }: AppShellProps) {
  return (
    <div className={`
      min-h-screen 
      ${isCopilotOpen 
        ? 'grid grid-cols-[260px_minmax(720px,1fr)_360px] gap-6 lg:grid-cols-[260px_minmax(720px,1fr)_360px] md:grid-cols-[260px_minmax(720px,1fr)_320px] max-md:grid-cols-1' 
        : 'grid grid-cols-[260px_1fr] gap-6 max-md:grid-cols-1'
      } 
      px-6 py-4 max-md:px-4
      transition-all duration-300
    `}>
      {/* Sidebar - Fixed width */}
      <aside className="h-[calc(100vh-2rem)] sticky top-4 overflow-auto max-md:hidden">
        {sidebar}
      </aside>
      
      {/* Main content - Flexible */}
      <main className="min-w-0 overflow-auto">
        {main}
      </main>
      
      {/* Copilot panel - Fixed width when open */}
      {isCopilotOpen && (
        <aside className="h-[calc(100vh-2rem)] sticky top-4 overflow-auto max-md:hidden">
          {copilot}
        </aside>
      )}
    </div>
  )
}

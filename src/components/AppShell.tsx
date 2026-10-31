import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MiniCronometro } from './MiniCronometro'

export function AppShell() {
  return (
    <div className="app-shell">
      <MiniCronometro />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

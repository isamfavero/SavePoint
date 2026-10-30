import { BookOpen, ChartLine, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

type NavTab = {
  label: string
  to: string
  icon: LucideIcon
  hasSessionIndicator?: boolean
}

const tabs: NavTab[] = [
  { label: 'Biblioteca', to: '/biblioteca', icon: BookOpen },
  { label: 'Jornada', to: '/jornada', icon: ChartLine, hasSessionIndicator: true },
  { label: 'Buscar', to: '/buscar', icon: Search },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {tabs.map(({ label, to, icon: Icon, hasSessionIndicator }) => (
        <NavLink key={to} to={to} className="nav-item">
          <span className="nav-icon">
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            {/* Reservado para o ponto de sessão ativa. Ainda sem função. */}
            {hasSessionIndicator && <span className="nav-session-dot" aria-hidden="true" />}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

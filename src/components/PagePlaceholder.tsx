import type { LucideIcon } from 'lucide-react'

type PagePlaceholderProps = {
  title: string
  description: string
  note: string
  icon: LucideIcon
}

export function PagePlaceholder({ title, description, note, icon: Icon }: PagePlaceholderProps) {
  return (
    <section className="page" aria-label={title}>
      <header className="page-header">
        <span className="page-icon" aria-hidden="true">
          <Icon size={22} strokeWidth={1.75} />
        </span>
        <p className="page-kicker">SavePoint</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </header>

      <div className="placeholder-card">
        <span className="placeholder-label">
          <span className="placeholder-dot" aria-hidden="true" />
          Em preparação
        </span>
        <p>{note}</p>
      </div>
    </section>
  )
}

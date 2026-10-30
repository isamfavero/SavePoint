import { BookOpen } from 'lucide-react'
import { PagePlaceholder } from '../components/PagePlaceholder'

export function Biblioteca() {
  return (
    <PagePlaceholder
      title="Biblioteca"
      description="Todos os seus mundos em um só lugar."
      note="A lista de jogos e os filtros chegam na próxima fatia."
      icon={BookOpen}
    />
  )
}

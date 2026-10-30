import { Search } from 'lucide-react'
import { PagePlaceholder } from '../components/PagePlaceholder'

export function Buscar() {
  return (
    <PagePlaceholder
      title="Buscar"
      description="Encontre uma anotação quando precisar."
      note="A busca por texto nas anotações chega na próxima fatia."
      icon={Search}
    />
  )
}

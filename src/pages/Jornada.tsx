import { ChartLine } from 'lucide-react'
import { PagePlaceholder } from '../components/PagePlaceholder'

export function Jornada() {
  return (
    <PagePlaceholder
      title="Jornada"
      description="O jogo atual e o cronômetro da sessão ficarão aqui."
      note="A trilha, os objetivos e o diário de sessões chegam nas próximas fatias."
      icon={ChartLine}
    />
  )
}

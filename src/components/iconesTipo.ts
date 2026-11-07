import {
  BookOpen,
  FileText,
  Flag,
  KeyRound,
  Lightbulb,
  Map,
  Puzzle,
  Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TipoRegistro } from '../constantes'

export const ICONE_POR_TIPO: Record<TipoRegistro, LucideIcon> = {
  Diário: BookOpen,
  Senhas: KeyRound,
  Documentos: FileText,
  Puzzles: Puzzle,
  Lembretes: Lightbulb,
  Marco: Flag,
  'Região mapeada': Map,
  Objetivo: Target,
}

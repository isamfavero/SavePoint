export const SITUACOES_JOGO = [
  'Jogando',
  'Pausado',
  'Concluído',
  'Quero jogar',
] as const

export type SituacaoJogo = (typeof SITUACOES_JOGO)[number]

export const TIPOS_REGISTRO = [
  'Diário',
  'Senhas',
  'Manuscritos',
  'Puzzles',
  'Lembretes',
  'Marco',
  'Região mapeada',
  'Objetivo',
] as const

export type TipoRegistro = (typeof TIPOS_REGISTRO)[number]

export type Jogo = {
  id: string
  nome: string
  plataforma: string
  generos: string[]
  capa: Blob | null
  situacao: SituacaoJogo
  criadoEm: Date
  atualizadoEm: Date
}

export type Sessao = {
  id: string
  jogoId: string
  numero: number
  inicio: Date
  fim: Date | null
  tempoPausado: number
  pausadoEm: Date | null
  oQueFiz: string
  ondeParei: string
  proximoPasso: string
}

export type Registro = {
  id: string
  jogoId: string
  sessaoId: string
  tipo: TipoRegistro
  texto: string
  tags: string[]
  dataHora: Date
  // Campos de conclusão existem apenas quando tipo === 'Objetivo'.
  concluido?: boolean
  concluidoEm?: Date | null
  concluidoSessaoId?: string | null
}

export type DadosJogo = {
  nome: string
  plataforma: string
  generos: string[]
  capa?: Blob | null
  situacao: SituacaoJogo
}

export type AtualizacaoJogo = Partial<DadosJogo>

export type DadosEncerramentoSessao = Partial<
  Pick<Sessao, 'oQueFiz' | 'ondeParei' | 'proximoPasso'>
>

export type DadosRegistro = {
  jogoId: string
  sessaoId: string
  tipo: TipoRegistro
  texto: string
  tags?: string[]
  dataHora?: Date
  concluido?: boolean
  concluidoEm?: Date | null
  concluidoSessaoId?: string | null
}

export type AtualizacaoRegistro = Partial<DadosRegistro>

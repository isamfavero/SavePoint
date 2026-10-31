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


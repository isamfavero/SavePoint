import type { SituacaoJogo, TipoRegistro } from '../constantes'

export {
  SITUACOES_JOGO,
  type SituacaoJogo,
  TIPOS_REGISTRO,
  type TipoRegistro,
} from '../constantes'

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

export type AtualizacaoSessao = DadosEncerramentoSessao & {
  inicio?: Date
  /** Numa sessão aberta, informar o fim a encerra nesse instante. */
  fim?: Date | null
}

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

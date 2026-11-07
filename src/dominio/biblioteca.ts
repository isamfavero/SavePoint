import { SITUACOES_JOGO } from '../constantes'
import type { SituacaoJogo } from '../constantes'
import type { Jogo } from '../data/tipos'

export const FILTROS_BIBLIOTECA = ['Todos', ...SITUACOES_JOGO] as const

export type FiltroBiblioteca = (typeof FILTROS_BIBLIOTECA)[number]

export type ContagemFiltros = Record<FiltroBiblioteca, number>

export function contarJogosPorSituacao(jogos: Jogo[]): ContagemFiltros {
  const contagens = Object.fromEntries(
    FILTROS_BIBLIOTECA.map((filtro) => [filtro, 0]),
  ) as ContagemFiltros

  contagens.Todos = jogos.length

  for (const jogo of jogos) {
    contagens[jogo.situacao] += 1
  }

  return contagens
}

export function filtrarJogos(jogos: Jogo[], filtro: FiltroBiblioteca): Jogo[] {
  if (filtro === 'Todos') return jogos
  return jogos.filter((jogo) => jogo.situacao === filtro)
}

export function escolherJogoEmDestaque(
  jogos: Jogo[],
  jogoAtualId: string | null,
): Jogo | null {
  if (jogoAtualId) {
    const atual = jogos.find((jogo) => jogo.id === jogoAtualId)
    if (atual) return atual
  }

  const jogando = jogos.filter((jogo) => jogo.situacao === 'Jogando')

  if (jogando.length === 0) return null

  return jogando.reduce((maisRecente, jogo) =>
    jogo.atualizadoEm.getTime() > maisRecente.atualizadoEm.getTime()
      ? jogo
      : maisRecente,
  )
}

/**
 * Procura jogos pelo nome, plataforma ou gênero, sem diferenciar maiúsculas nem
 * acentos. Cada palavra digitada precisa aparecer em algum desses campos, em
 * qualquer ordem. Busca vazia devolve todos os jogos.
 */
export function buscarJogos(jogos: Jogo[], termo: string): Jogo[] {
  const palavras = normalizarTexto(termo).split(' ').filter(Boolean)

  if (palavras.length === 0) return jogos

  return jogos.filter((jogo) => {
    const texto = normalizarTexto(
      [jogo.nome, jogo.plataforma, ...jogo.generos].join(' '),
    )

    return palavras.every((palavra) => texto.includes(palavra))
  })
}

export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function existeJogoDuplicado(
  jogos: Jogo[],
  nome: string,
  plataforma: string,
): boolean {
  const nomeNormalizado = normalizarTexto(nome)
  const plataformaNormalizada = normalizarTexto(plataforma)

  return jogos.some(
    (jogo) =>
      normalizarTexto(jogo.nome) === nomeNormalizado &&
      normalizarTexto(jogo.plataforma) === plataformaNormalizada,
  )
}

export function formatarHoras(duracaoMs: number): string {
  const totalMinutos = Math.max(0, Math.floor(duracaoMs / 60000))
  const horas = Math.floor(totalMinutos / 60)
  const minutos = totalMinutos % 60

  if (horas === 0) return `${minutos}min`
  if (minutos === 0) return `${horas}h`

  return `${horas}h${String(minutos).padStart(2, '0')}`
}

export function formatarSessoes(total: number): string {
  return `${total} ${total === 1 ? 'sessão' : 'sessões'}`
}

export function formatarData(data: Date): string {
  const meses = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ]
  const mes = meses[data.getMonth()]
  return `${data.getDate()} ${mes}`
}

export function formatarDuracao(
  inicio: Date,
  fim: Date | null,
): string {
  if (fim) {
    const totalMinutos = Math.max(
      0,
      Math.floor((fim.getTime() - inicio.getTime()) / 60_000),
    )
    const horas = Math.floor(totalMinutos / 60)
    const minutos = totalMinutos % 60

    if (horas === 0) return `${minutos}min`
    if (minutos === 0) return `${horas}h`

    return `${horas}h${String(minutos).padStart(2, '0')}`
  }
  return '—'
}

export function formatarTempoRelativo(data: Date, agora: Date = new Date()): string {
  const diferenca = Math.max(0, agora.getTime() - data.getTime())
  const minutos = Math.floor(diferenca / 60_000)

  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`

  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`

  const dias = Math.floor(horas / 24)
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`

  const meses = Math.floor(dias / 30)
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
}

export function classeDaSituacao(situacao: SituacaoJogo): string {
  const classes: Record<SituacaoJogo, string> = {
    Jogando: 'situacao-jogando',
    Pausado: 'situacao-pausado',
    Concluído: 'situacao-concluido',
    'Quero jogar': 'situacao-quero',
  }

  return classes[situacao]
}
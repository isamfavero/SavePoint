import type { Sessao } from './tipos'

export const MS_POR_HORA = 3_600_000

export type EstatisticasJogo = {
  horasTotais: number
  totalSessoes: number
  mediaHorasPorSessao: number
  duracaoTotalMs: number
  mediaPorSessaoMs: number
  sessoesEmAndamento: number
}

export function calcularDuracaoSessao(sessao: Sessao, agora: Date = new Date()): number {
  const referencia = sessao.fim ?? agora
  const pausaEmAndamento = sessao.pausadoEm
    ? Math.max(0, referencia.getTime() - sessao.pausadoEm.getTime())
    : 0

  const duracao =
    referencia.getTime() -
    sessao.inicio.getTime() -
    sessao.tempoPausado -
    pausaEmAndamento

  return Math.max(0, duracao)
}

export function calcularEstatisticasSessoes(
  sessoes: Sessao[],
  agora: Date = new Date(),
): EstatisticasJogo {
  const encerradas = sessoes.filter((sessao) => sessao.fim !== null)
  const duracaoTotalMs = encerradas.reduce(
    (total, sessao) => total + calcularDuracaoSessao(sessao, agora),
    0,
  )
  const totalSessoes = encerradas.length
  const mediaPorSessaoMs = totalSessoes === 0 ? 0 : duracaoTotalMs / totalSessoes

  return {
    horasTotais: duracaoTotalMs / MS_POR_HORA,
    totalSessoes,
    mediaHorasPorSessao: mediaPorSessaoMs / MS_POR_HORA,
    duracaoTotalMs,
    mediaPorSessaoMs,
    sessoesEmAndamento: sessoes.length - totalSessoes,
  }
}

export function calcularTempoTotalAoVivo(
  sessoes: Sessao[],
  agora: Date = new Date(),
): number {
  return sessoes.reduce(
    (total, sessao) => total + calcularDuracaoSessao(sessao, agora),
    0,
  )
}

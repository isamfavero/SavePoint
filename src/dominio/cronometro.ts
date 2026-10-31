import type { Sessao } from '../data'

export function formatarDuracao(duracaoMs: number): string {
  const totalSegundos = Math.max(0, Math.floor(duracaoMs / 1000))
  const horas = Math.floor(totalSegundos / 3_600)
  const minutos = Math.floor((totalSegundos % 3_600) / 60)
  const segundos = totalSegundos % 60

  return [horas, minutos, segundos]
    .map((valor) => String(valor).padStart(2, '0'))
    .join(':')
}

export function formatarTempoCurto(duracaoMs: number): string {
  const totalMinutos = Math.max(0, Math.floor(duracaoMs / 60_000))

  if (totalMinutos < 1) return '0 min'

  if (totalMinutos < 60) return `${totalMinutos} min`

  const horas = Math.floor(totalMinutos / 60)
  const minutos = totalMinutos % 60

  if (minutos === 0) return `${horas}h`

  return `${horas}h ${minutos}`
}

export function formatarQuantidadeSessoes(total: number): string {
  return `${total} ${total === 1 ? 'sessão' : 'sessões'}`
}

export function resolverFimSessao(
  sessao: Pick<Sessao, 'pausadoEm'>,
  instanteCapturado: Date,
): Date {
  return sessao.pausadoEm ?? instanteCapturado
}

export function sessaoEstaPausada(
  sessao: Pick<Sessao, 'pausadoEm'> | null,
): boolean {
  return Boolean(sessao?.pausadoEm)
}

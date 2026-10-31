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

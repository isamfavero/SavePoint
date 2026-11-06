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

export function formatarHorasCurto(horas: number): string {
  const minutosTotais = Math.max(0, Math.floor(horas * 60))
  const h = Math.floor(minutosTotais / 60)
  const m = minutosTotais % 60

  if (h === 0 && m === 0) return '0h'
  if (m === 0) return `${h}h`
  return `${h}h${m}`
}

export function formatarDuracaoCurto(ms: number): string {
  const totalMinutos = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(totalMinutos / 60)
  const m = totalMinutos % 60

  if (h === 0 && m === 0) return '<1m'
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h${m}m`
}

export function formatarAcumuladoTrilha(ms: number): string {
  const totalMinutos = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(totalMinutos / 60)
  const m = totalMinutos % 60

  return `${h}h${String(m).padStart(2, '0')}`
}

export function formatarDataSessaoTrilha(data: Date): string {
  const dia = data.getDate()
  const mes = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
  })
    .format(data)
    .replace('.', '')
    .trim()

  return `${dia} ${mes}`
}

export function formatarDuracaoTrilha(ms: number): string {
  const totalMinutos = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(totalMinutos / 60)
  const m = totalMinutos % 60

  if (h === 0 && m === 0) return '0h'
  if (m === 0) return `${h}h`
  return `${h}h${m}`
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

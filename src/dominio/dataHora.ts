function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0')
}

/** Converte uma data para o formato do campo `datetime-local` (hora local, sem segundos). */
export function paraCampoDataHora(data: Date): string {
  return (
    `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}` +
    `T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
  )
}

/** Lê o valor de um campo `datetime-local` como hora local. Devolve null se inválido. */
export function lerCampoDataHora(valor: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor.trim())

  if (!partes) return null

  const [, ano, mes, dia, hora, minuto] = partes.map(Number)
  const data = new Date(ano, mes - 1, dia, hora, minuto)

  if (data.getMonth() !== mes - 1 || data.getDate() !== dia) return null

  return data
}

/** Sessões abertas há mais tempo que isso provavelmente foram esquecidas. */
export const LIMITE_SESSAO_LONGA_MS = 6 * 3_600_000

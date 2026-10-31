export const CHAVE_ENCERRAMENTO = 'savepoint:encerramento'

type ArmazenamentoEncerramento = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type InstanteArmazenado = {
  sessaoId: string
  instante: string
}

function obterArmazenamento(): ArmazenamentoEncerramento | null {
  try {
    if (typeof window === 'undefined') return null
    return window.sessionStorage
  } catch {
    return null
  }
}

export function salvarInstanteEncerramento(
  sessaoId: string,
  instante: Date,
  armazenamento: ArmazenamentoEncerramento | null = obterArmazenamento(),
): void {
  if (!armazenamento) return

  try {
    const dados: InstanteArmazenado = {
      sessaoId,
      instante: instante.toISOString(),
    }
    armazenamento.setItem(CHAVE_ENCERRAMENTO, JSON.stringify(dados))
  } catch {
    // Sem persistência: a tela ainda funciona com o instante capturado em memória.
  }
}

export function lerInstanteEncerramento(
  sessaoId: string,
  armazenamento: ArmazenamentoEncerramento | null = obterArmazenamento(),
): Date | null {
  if (!armazenamento) return null

  try {
    const valor = armazenamento.getItem(CHAVE_ENCERRAMENTO)
    if (!valor) return null

    const dados = JSON.parse(valor) as Partial<InstanteArmazenado>
    if (dados.sessaoId !== sessaoId || !dados.instante) return null

    const instante = new Date(dados.instante)
    return Number.isNaN(instante.getTime()) ? null : instante
  } catch {
    return null
  }
}

export function limparInstanteEncerramento(
  armazenamento: ArmazenamentoEncerramento | null = obterArmazenamento(),
): void {
  if (!armazenamento) return

  try {
    armazenamento.removeItem(CHAVE_ENCERRAMENTO)
  } catch {
    // Sem persistência: nada a limpar.
  }
}

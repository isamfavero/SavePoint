export const CHAVE_JOGO_ATUAL = 'savepoint:jogo-atual'

export type ArmazenamentoJogoAtual = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>

function obterArmazenamento(): ArmazenamentoJogoAtual | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function lerJogoAtualId(
  armazenamento: ArmazenamentoJogoAtual | null = obterArmazenamento(),
): string | null {
  if (!armazenamento) return null

  try {
    const valor = armazenamento.getItem(CHAVE_JOGO_ATUAL)
    return valor && valor.trim() ? valor : null
  } catch {
    return null
  }
}

export function salvarJogoAtualId(
  id: string,
  armazenamento: ArmazenamentoJogoAtual | null = obterArmazenamento(),
): void {
  if (!armazenamento) return

  try {
    armazenamento.setItem(CHAVE_JOGO_ATUAL, id)
  } catch {
    // Sem persistência: o app continua funcionando, mas não lembra o jogo atual.
  }
}

export function limparJogoAtualId(
  armazenamento: ArmazenamentoJogoAtual | null = obterArmazenamento(),
): void {
  if (!armazenamento) return

  try {
    armazenamento.removeItem(CHAVE_JOGO_ATUAL)
  } catch {
    // Sem persistência: o app continua funcionando, mas não lembra o jogo atual.
  }
}

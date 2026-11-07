export const CHAVE_BOAS_VINDAS = 'savepoint:boas-vindas-vista'

type Armazenamento = Pick<Storage, 'getItem' | 'setItem'>

function obterArmazenamento(): Armazenamento | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

/** Diz se as boas-vindas já foram vistas neste navegador. */
export function boasVindasJaVistas(
  armazenamento: Armazenamento | null = obterArmazenamento(),
): boolean {
  if (!armazenamento) return true

  try {
    return armazenamento.getItem(CHAVE_BOAS_VINDAS) === '1'
  } catch {
    // Sem acesso ao armazenamento: não insiste em mostrar as boas-vindas.
    return true
  }
}

export function marcarBoasVindasVistas(
  armazenamento: Armazenamento | null = obterArmazenamento(),
): void {
  if (!armazenamento) return

  try {
    armazenamento.setItem(CHAVE_BOAS_VINDAS, '1')
  } catch {
    // Sem persistência: as boas-vindas podem aparecer de novo, sem outro efeito.
  }
}

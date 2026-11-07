import type { ResumoImportacao } from './backup'
import type { ServicoSavePoint } from './servico'

export type PendentesLocais = {
  jogos: number
  sessoes: number
  registros: number
}

export function temPendentes(pendentes: PendentesLocais): boolean {
  return pendentes.jogos + pendentes.sessoes + pendentes.registros > 0
}

/** Conta o que existe neste navegador e ainda não está na conta (comparando os ids). */
export async function contarPendentesLocais(
  local: ServicoSavePoint,
  nuvem: ServicoSavePoint,
): Promise<PendentesLocais> {
  const [jogosLocais, sessoesLocais, registrosLocais, jogosNuvem, sessoesNuvem, registrosNuvem] =
    await Promise.all([
      local.listarJogos(),
      local.listarTodasSessoes(),
      local.listarTodosRegistros(),
      nuvem.listarJogos(),
      nuvem.listarTodasSessoes(),
      nuvem.listarTodosRegistros(),
    ])

  const faltam = (locais: { id: string }[], remotos: { id: string }[]) => {
    const existentes = new Set(remotos.map((item) => item.id))
    return locais.filter((item) => !existentes.has(item.id)).length
  }

  return {
    jogos: faltam(jogosLocais, jogosNuvem),
    sessoes: faltam(sessoesLocais, sessoesNuvem),
    registros: faltam(registrosLocais, registrosNuvem),
  }
}

/**
 * Copia para a conta tudo o que está neste navegador. Os ids são mantidos, então
 * repetir o envio não duplica nada. Os dados locais continuam aqui como cópia.
 */
export async function enviarLocalParaNuvem(
  local: ServicoSavePoint,
  nuvem: ServicoSavePoint,
): Promise<ResumoImportacao> {
  return nuvem.importarDados(await local.exportarDados())
}

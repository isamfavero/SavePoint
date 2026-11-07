import { useCallback, useEffect, useMemo, useState } from 'react'
import { useContaOpcional } from '../contexts/ContaContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import {
  contarPendentesLocais,
  enviarLocalParaNuvem,
  RepositorioIndexedDb,
  ServicoSavePoint,
  temPendentes,
} from '../data'
import type { PendentesLocais, ResumoImportacao } from '../data'
import { clienteSupabase } from '../conta/servico'

/**
 * Só faz sentido com a conta conectada: compara o que há neste navegador com o
 * que já está na conta e oferece enviar o que falta.
 */
export function useEnvioLocal() {
  const nuvem = useServicoSavePoint()
  const usuarioId = useContaOpcional()?.usuario?.id ?? null
  const ativo = Boolean(clienteSupabase && usuarioId)

  const local = useMemo(
    () => (ativo ? new ServicoSavePoint(new RepositorioIndexedDb()) : null),
    [ativo],
  )

  const [pendentes, setPendentes] = useState<PendentesLocais | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!local) {
      setPendentes(null)
      return
    }

    let vivo = true

    contarPendentesLocais(local, nuvem)
      .then((contagem) => {
        if (vivo) setPendentes(contagem)
      })
      .catch(() => {
        // Sem conseguir comparar, não oferece o envio.
        if (vivo) setPendentes(null)
      })

    return () => {
      vivo = false
    }
  }, [local, nuvem])

  const enviar = useCallback(async () => {
    if (!local) return

    setEnviando(true)
    setErro(null)

    try {
      const feito = await enviarLocalParaNuvem(local, nuvem)
      setResumo(feito)
      setPendentes(await contarPendentesLocais(local, nuvem))
    } catch (falha) {
      setErro(
        falha instanceof Error && falha.message
          ? falha.message
          : 'Não foi possível enviar os dados agora. Tente de novo.',
      )
    } finally {
      setEnviando(false)
    }
  }, [local, nuvem])

  return {
    ativo,
    pendentes,
    temPendentes: pendentes ? temPendentes(pendentes) : false,
    enviando,
    resumo,
    erro,
    enviar,
  }
}

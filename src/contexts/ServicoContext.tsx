import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { RepositorioIndexedDb, RepositorioSupabase, ServicoSavePoint } from '../data'
import { ErroInicial } from '../components/ErrorBoundary'
import { clienteSupabase } from '../conta/servico'
import { useContaOpcional } from './ContaContext'

const ServicoContext = createContext<{
  servico: ServicoSavePoint
  versao: number
  invalidar: () => void
} | null>(null)

export function ServicoProvider({ children }: { children: ReactNode }) {
  const [versao, setVersao] = useState(0)

  // Com a conta conectada, os dados vivem no Supabase, ligados ao usuário. Sem conta
  // (ou sem Supabase configurado), ficam no navegador, como antes.
  const usuarioId = useContaOpcional()?.usuario?.id ?? null

  const servico = useMemo(
    () =>
      new ServicoSavePoint(
        clienteSupabase && usuarioId
          ? new RepositorioSupabase(clienteSupabase, usuarioId)
          : new RepositorioIndexedDb(),
      ),
    [usuarioId],
  )

  useEffect(() => {
    servico.setOnChange(() => setVersao((v) => v + 1))
  }, [servico])

  const [erroInicial, setErroInicial] = useState<Error | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true

    ;(async () => {
      try {
        await servico.listarJogos()
      } catch (erro) {
        if (ativo) setErroInicial(erro as Error)
      }
    })()

    return () => {
      ativo = false
    }
  }, [servico, tentativa])

  if (erroInicial) {
    return (
      <ErroInicial
        erro={erroInicial}
        onTentarNovamente={() => {
          setErroInicial(null)
          setTentativa((t) => t + 1)
        }}
      />
    )
  }

  return (
    <ServicoContext.Provider value={{ servico, versao, invalidar: () => setVersao((v) => v + 1) }}>
      {children}
    </ServicoContext.Provider>
  )
}

export function useServicoSavePoint(): ServicoSavePoint {
  const contexto = useContext(ServicoContext)

  if (!contexto) {
    throw new Error('useServicoSavePoint precisa estar dentro de ServicoProvider.')
  }

  return contexto.servico
}

export function useVersaoDados(): number {
  const contexto = useContext(ServicoContext)

  if (!contexto) {
    throw new Error('useVersaoDados precisa estar dentro de ServicoProvider.')
  }

  return contexto.versao
}

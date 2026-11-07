import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { RepositorioIndexedDb, ServicoSavePoint } from '../data'
import { ErroInicial } from '../components/ErrorBoundary'

const ServicoContext = createContext<{
  servico: ServicoSavePoint
  versao: number
  invalidar: () => void
} | null>(null)

export function ServicoProvider({ children }: { children: ReactNode }) {
  const [versao, setVersao] = useState(0)

  const servico = useState(() => new ServicoSavePoint(new RepositorioIndexedDb()))[0]

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

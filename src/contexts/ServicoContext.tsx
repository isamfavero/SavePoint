import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { RepositorioIndexedDb, ServicoSavePoint } from '../data'
import { ErroInicial } from '../components/ErrorBoundary'

const ServicoContext = createContext<ServicoSavePoint | null>(null)

export function ServicoProvider({ children }: { children: ReactNode }) {
  const [servico] = useState(() => new ServicoSavePoint(new RepositorioIndexedDb()))
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
    <ServicoContext.Provider value={servico}>{children}</ServicoContext.Provider>
  )
}

export function useServicoSavePoint(): ServicoSavePoint {
  const contexto = useContext(ServicoContext)

  if (!contexto) {
    throw new Error('useServicoSavePoint precisa estar dentro de ServicoProvider.')
  }

  return contexto
}

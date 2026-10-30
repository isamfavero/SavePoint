import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  lerJogoAtualId,
  limparJogoAtualId,
  salvarJogoAtualId,
} from '../estado/jogoAtual'

type JogoAtualContextValue = {
  jogoAtualId: string | null
  definirJogoAtual: (id: string) => void
  limparJogoAtual: () => void
}

const JogoAtualContext = createContext<JogoAtualContextValue | null>(null)

export function JogoAtualProvider({ children }: { children: ReactNode }) {
  const [jogoAtualId, setJogoAtualId] = useState<string | null>(() => lerJogoAtualId())

  const definirJogoAtual = useCallback((id: string) => {
    salvarJogoAtualId(id)
    setJogoAtualId(id)
  }, [])

  const limparJogoAtual = useCallback(() => {
    limparJogoAtualId()
    setJogoAtualId(null)
  }, [])

  const valor = useMemo(
    () => ({ jogoAtualId, definirJogoAtual, limparJogoAtual }),
    [definirJogoAtual, jogoAtualId, limparJogoAtual],
  )

  return <JogoAtualContext.Provider value={valor}>{children}</JogoAtualContext.Provider>
}

export function useJogoAtual(): JogoAtualContextValue {
  const contexto = useContext(JogoAtualContext)

  if (!contexto) {
    throw new Error('useJogoAtual precisa estar dentro de JogoAtualProvider.')
  }

  return contexto
}

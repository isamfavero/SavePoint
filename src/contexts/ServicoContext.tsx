import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { RepositorioIndexedDb, ServicoSavePoint } from '../data'

const ServicoContext = createContext<ServicoSavePoint | null>(null)

export function ServicoProvider({ children }: { children: ReactNode }) {
  const [servico] = useState(() => new ServicoSavePoint(new RepositorioIndexedDb()))

  return <ServicoContext.Provider value={servico}>{children}</ServicoContext.Provider>
}

export function useServicoSavePoint(): ServicoSavePoint {
  const contexto = useContext(ServicoContext)

  if (!contexto) {
    throw new Error('useServicoSavePoint precisa estar dentro de ServicoProvider.')
  }

  return contexto
}

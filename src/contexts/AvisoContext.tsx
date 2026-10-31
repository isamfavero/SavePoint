import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type Aviso = {
  id: number
  mensagem: string
}

type AvisoContextValue = {
  aviso: Aviso | null
  mostrarAviso: (mensagem: string) => void
  fecharAviso: () => void
}

const DURACAO_AVISO_MS = 4_000

const AvisoContext = createContext<AvisoContextValue | null>(null)

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const proximoId = useRef(0)
  const temporizador = useRef<number | null>(null)

  const limparTemporizador = useCallback(() => {
    if (temporizador.current !== null) {
      window.clearTimeout(temporizador.current)
      temporizador.current = null
    }
  }, [])

  const fecharAviso = useCallback(() => {
    limparTemporizador()
    setAviso(null)
  }, [limparTemporizador])

  const mostrarAviso = useCallback(
    (mensagem: string) => {
      limparTemporizador()
      proximoId.current += 1
      setAviso({ id: proximoId.current, mensagem })
      temporizador.current = window.setTimeout(() => {
        setAviso(null)
        temporizador.current = null
      }, DURACAO_AVISO_MS)
    },
    [limparTemporizador],
  )

  useEffect(() => {
    return limparTemporizador
  }, [limparTemporizador])

  const valor = useMemo<AvisoContextValue>(
    () => ({ aviso, mostrarAviso, fecharAviso }),
    [aviso, fecharAviso, mostrarAviso],
  )

  return <AvisoContext.Provider value={valor}>{children}</AvisoContext.Provider>
}

export function useAviso(): AvisoContextValue {
  const contexto = useContext(AvisoContext)

  if (!contexto) {
    throw new Error('useAviso precisa estar dentro de AvisoProvider.')
  }

  return contexto
}

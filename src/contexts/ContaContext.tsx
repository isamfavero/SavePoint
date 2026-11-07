import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ServicoAutenticacao, Usuario } from '../conta/autenticacao'
import { servicoAutenticacao } from '../conta/servico'

type ContaContextValue = {
  servico: ServicoAutenticacao
  usuario: Usuario | null
  carregando: boolean
  /** A pessoa chegou pelo link de "esqueci minha senha". */
  recuperandoSenha: boolean
  concluirRecuperacao: () => void
}

const ContaContext = createContext<ContaContextValue | null>(null)

export function ContaProvider({
  children,
  servico = servicoAutenticacao,
}: {
  children: ReactNode
  servico?: ServicoAutenticacao
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(servico.disponivel)
  const [recuperandoSenha, setRecuperandoSenha] = useState(false)

  useEffect(() => {
    let ativo = true

    servico.obterUsuario().then((atual) => {
      if (!ativo) return
      setUsuario(atual)
      setCarregando(false)
    })

    const parar = servico.aoMudar((novo, recuperando) => {
      setUsuario(novo)
      if (recuperando) setRecuperandoSenha(true)
    })

    return () => {
      ativo = false
      parar()
    }
  }, [servico])

  const valor = useMemo<ContaContextValue>(
    () => ({
      servico,
      usuario,
      carregando,
      recuperandoSenha,
      concluirRecuperacao: () => setRecuperandoSenha(false),
    }),
    [carregando, recuperandoSenha, servico, usuario],
  )

  return <ContaContext.Provider value={valor}>{children}</ContaContext.Provider>
}

/** Como `useConta`, mas devolve null fora do provider (telas e testes isolados). */
export function useContaOpcional(): ContaContextValue | null {
  return useContext(ContaContext)
}

export function useConta(): ContaContextValue {
  const contexto = useContext(ContaContext)

  if (!contexto) {
    throw new Error('useConta precisa estar dentro de ContaProvider.')
  }

  return contexto
}

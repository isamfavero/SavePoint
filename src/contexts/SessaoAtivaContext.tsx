import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { calcularDuracaoSessao } from '../data'
import type { DadosEncerramentoSessao, Jogo, Sessao } from '../data'
import { useServicoSavePoint } from './ServicoContext'

type SessaoAtivaContextValue = {
  sessao: Sessao | null
  jogo: Jogo | null
  carregando: boolean
  erro: string | null
  agora: Date
  duracaoMs: number
  pausada: boolean
  recarregar: () => Promise<void>
  iniciarSessao: (jogoId: string) => Promise<Sessao>
  pausarSessao: () => Promise<Sessao>
  retomarSessao: () => Promise<Sessao>
  encerrarSessao: (dados: DadosEncerramentoSessao, fim: Date) => Promise<Sessao>
}

const SessaoAtivaContext = createContext<SessaoAtivaContextValue | null>(null)

export function SessaoAtivaProvider({ children }: { children: ReactNode }) {
  const servico = useServicoSavePoint()
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => new Date())

  const aplicarSessao = useCallback((novaSessao: Sessao | null, novoJogo: Jogo | null) => {
    setSessao(novaSessao)
    setJogo(novoJogo)
    setAgora(new Date())
    setErro(null)
  }, [])

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const ativa = await servico.obterSessaoAtiva()

      if (!ativa) {
        aplicarSessao(null, null)
        return
      }

      const jogoDaSessao = await servico.obterJogo(ativa.jogoId)
      aplicarSessao(ativa, jogoDaSessao)
    } catch {
      setSessao(null)
      setJogo(null)
      setErro('Não foi possível carregar a sessão ativa.')
    } finally {
      setCarregando(false)
    }
  }, [aplicarSessao, servico])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  useEffect(() => {
    setAgora(new Date())

    if (!sessao || sessao.pausadoEm) return

    const intervalo = window.setInterval(() => {
      setAgora(new Date())
    }, 1000)

    return () => window.clearInterval(intervalo)
  }, [sessao])

  const iniciarSessao = useCallback(
    async (jogoId: string) => {
      const novaSessao = await servico.iniciarSessao(jogoId)
      const jogoDaSessao = await servico.obterJogo(jogoId)
      aplicarSessao(novaSessao, jogoDaSessao)
      return novaSessao
    },
    [aplicarSessao, servico],
  )

  const pausarSessao = useCallback(async () => {
    if (!sessao) throw new Error('Nenhuma sessão ativa.')

    const atualizada = await servico.pausarSessao(sessao.id)
    aplicarSessao(atualizada, jogo)
    return atualizada
  }, [aplicarSessao, jogo, servico, sessao])

  const retomarSessao = useCallback(async () => {
    if (!sessao) throw new Error('Nenhuma sessão ativa.')

    const atualizada = await servico.retomarSessao(sessao.id)
    aplicarSessao(atualizada, jogo)
    return atualizada
  }, [aplicarSessao, jogo, servico, sessao])

  const encerrarSessao = useCallback(
    async (dados: DadosEncerramentoSessao, fim: Date) => {
      if (!sessao) throw new Error('Nenhuma sessão ativa.')

      const encerrada = await servico.encerrarSessao(sessao.id, dados, fim)
      aplicarSessao(null, null)
      return encerrada
    },
    [aplicarSessao, servico, sessao],
  )

  const duracaoMs = useMemo(
    () => (sessao ? calcularDuracaoSessao(sessao, agora) : 0),
    [agora, sessao],
  )

  const valor = useMemo<SessaoAtivaContextValue>(
    () => ({
      sessao,
      jogo,
      carregando,
      erro,
      agora,
      duracaoMs,
      pausada: Boolean(sessao?.pausadoEm),
      recarregar,
      iniciarSessao,
      pausarSessao,
      retomarSessao,
      encerrarSessao,
    }),
    [
      agora,
      carregando,
      duracaoMs,
      encerrarSessao,
      erro,
      iniciarSessao,
      jogo,
      pausarSessao,
      recarregar,
      retomarSessao,
      sessao,
    ],
  )

  return (
    <SessaoAtivaContext.Provider value={valor}>{children}</SessaoAtivaContext.Provider>
  )
}

export function useSessaoAtiva(): SessaoAtivaContextValue {
  const contexto = useContext(SessaoAtivaContext)

  if (!contexto) {
    throw new Error('useSessaoAtiva precisa estar dentro de SessaoAtivaProvider.')
  }

  return contexto
}

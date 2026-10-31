import { useEffect, useMemo, useState } from 'react'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import { calcularDuracaoSessao } from '../data'
import type { EstatisticasJogo, Sessao } from '../data'

export function useSessoesDoJogo(jogoId: string | null) {
  const servico = useServicoSavePoint()
  const { sessao, agora } = useSessaoAtiva()
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasJogo | null>(null)
  const [carregando, setCarregando] = useState(Boolean(jogoId))
  const [erro, setErro] = useState<string | null>(null)

  const marcadorSessao = sessao
    ? `${sessao.id}:${sessao.pausadoEm?.getTime() ?? 'ativa'}:${sessao.fim?.getTime() ?? 'aberta'}`
    : 'sem-sessao'

  useEffect(() => {
    let ativo = true

    if (!jogoId) {
      setSessoes([])
      setEstatisticas(null)
      setCarregando(false)
      setErro(null)

      return () => {
        ativo = false
      }
    }

    setCarregando(true)
    setErro(null)

    Promise.all([
      servico.listarSessoesDoJogo(jogoId),
      servico.calcularEstatisticasJogo(jogoId),
    ])
      .then(([lista, resumo]) => {
        if (!ativo) return

        setSessoes(lista)
        setEstatisticas(resumo)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar as sessões deste jogo.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [jogoId, marcadorSessao, servico])

  const tempoTotalMs = useMemo(
    () => sessoes.reduce((total, item) => total + calcularDuracaoSessao(item, agora), 0),
    [agora, sessoes],
  )

  return { sessoes, estatisticas, tempoTotalMs, carregando, erro }
}

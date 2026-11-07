import { useEffect, useRef, useState } from 'react'
import { useServicoSavePoint, useVersaoDados } from '../contexts/ServicoContext'
import type { EstatisticasJogo, Jogo } from '../data'

export type JogoComEstatisticas = {
  jogo: Jogo
  estatisticas: EstatisticasJogo
}

export function useBiblioteca() {
  const servico = useServicoSavePoint()
  const [itens, setItens] = useState<JogoComEstatisticas[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const versao = useVersaoDados()
  const jaCarregou = useRef(false)

  useEffect(() => {
    let ativo = true

    if (!jaCarregou.current) setCarregando(true)
    setErro(null)

    servico
      .listarJogos()
      .then(async (jogos) => {
        const comEstatisticas = await Promise.all(
          jogos.map(async (jogo) => ({
            jogo,
            estatisticas: await servico.calcularEstatisticasJogo(jogo.id),
          })),
        )

        if (!ativo) return

        comEstatisticas.sort(
          (a, b) => b.jogo.atualizadoEm.getTime() - a.jogo.atualizadoEm.getTime(),
        )

        jaCarregou.current = true
        setItens(comEstatisticas)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar sua biblioteca.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [servico, versao])

  return { itens, carregando, erro }
}

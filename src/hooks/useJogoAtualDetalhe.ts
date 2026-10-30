import { useEffect, useState } from 'react'
import { useJogoAtual } from '../contexts/JogoAtualContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import type { Jogo } from '../data'

export function useJogoAtualDetalhe() {
  const { jogoAtualId, limparJogoAtual } = useJogoAtual()
  const servico = useServicoSavePoint()
  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [carregando, setCarregando] = useState(Boolean(jogoAtualId))
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    if (!jogoAtualId) {
      setJogo(null)
      setCarregando(false)
      setErro(null)
      return () => {
        ativo = false
      }
    }

    setCarregando(true)
    setErro(null)

    servico
      .obterJogo(jogoAtualId)
      .then((encontrado) => {
        if (!ativo) return

        if (!encontrado) {
          limparJogoAtual()
          setJogo(null)
        } else {
          setJogo(encontrado)
        }

        setCarregando(false)
      })
      .catch(() => {
        if (!ativo) return
        setErro('Não foi possível carregar o jogo atual.')
        setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [jogoAtualId, limparJogoAtual, servico])

  return { jogo, carregando, erro }
}

import { useEffect, useRef, useState } from 'react'
import { useJogoAtual } from '../contexts/JogoAtualContext'
import { useServicoSavePoint, useVersaoDados } from '../contexts/ServicoContext'
import type { Jogo } from '../data'

export function useJogoAtualDetalhe() {
  const { jogoAtualId, limparJogoAtual } = useJogoAtual()
  const servico = useServicoSavePoint()
  const versao = useVersaoDados()
  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [carregando, setCarregando] = useState(Boolean(jogoAtualId))
  const [erro, setErro] = useState<string | null>(null)
  // Só mostra "carregando" ao trocar de jogo; mudanças nos dados recarregam em silêncio.
  const idCarregado = useRef<string | null>(null)

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

    if (idCarregado.current !== jogoAtualId) setCarregando(true)
    setErro(null)

    servico
      .obterJogo(jogoAtualId)
      .then((encontrado) => {
        if (!ativo) return

        idCarregado.current = jogoAtualId

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
  }, [jogoAtualId, limparJogoAtual, servico, versao])

  return { jogo, carregando, erro }
}

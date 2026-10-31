import { useNavigate } from 'react-router-dom'
import { useJogoAtual } from '../contexts/JogoAtualContext'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import { ChipSessao } from './ChipSessao'

export function MiniCronometro() {
  const { sessao, duracaoMs, pausada, carregando, erro } = useSessaoAtiva()
  const { definirJogoAtual } = useJogoAtual()
  const navigate = useNavigate()

  if (carregando || erro || !sessao) return null

  function abrirJornada() {
    if (!sessao) return

    definirJogoAtual(sessao.jogoId)
    navigate('/jornada')
  }

  return (
    <div className="mini-cronometro-area">
      <ChipSessao
        numero={sessao.numero}
        duracaoMs={duracaoMs}
        pausada={pausada}
        onClick={abrirJornada}
        ariaLabel={`Sessão ${sessao.numero}${pausada ? ', pausada' : ''}. Abrir a Jornada`}
      />
    </div>
  )
}

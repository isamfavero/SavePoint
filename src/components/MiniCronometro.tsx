import { useNavigate } from 'react-router-dom'
import { useJogoAtual } from '../contexts/JogoAtualContext'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import { formatarDuracao } from '../dominio/cronometro'

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
      <button
        type="button"
        className={`mini-cronometro${pausada ? ' mini-cronometro-pausado' : ''}`}
        onClick={abrirJornada}
        aria-label={`Sessão ${sessao.numero}${pausada ? ', pausada' : ''}. Abrir a Jornada`}
      >
        <span className="mini-cronometro-ponto" aria-hidden="true" />
        <span className="mini-cronometro-rotulo">Sessão {sessao.numero}</span>
        <span className="mini-cronometro-tempo">
          {pausada ? 'Pausada' : formatarDuracao(duracaoMs)}
        </span>
      </button>
    </div>
  )
}

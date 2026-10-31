import { BookOpen, ChevronDown, Clock } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useRef, useState } from 'react'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { SITUACOES_JOGO, type SituacaoJogo } from '../constantes'
import type { Jogo } from '../data'
import { formatarTempoCurto, formatarQuantidadeSessoes } from '../dominio/cronometro'
import { JogoCapa } from './JogoCapa'

type JogoAtualCardProps = {
  jogo: Jogo
  carregandoSessoes: boolean
  tempoTotalMs: number
  totalSessoes: number
}

export function JogoAtualCard({
  jogo,
  carregandoSessoes,
  tempoTotalMs,
  totalSessoes,
}: JogoAtualCardProps) {
  const servico = useServicoSavePoint()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const botaoRef = useRef<HTMLButtonElement>(null)

  async function aoMudarSituacao(situacao: SituacaoJogo) {
    if (!jogo || situacao === jogo.situacao) {
      setAberto(false)
      return
    }

    setSalvando(true)

    try {
      await servico.atualizarJogo(jogo.id, { situacao })
    } finally {
      setSalvando(false)
      setAberto(false)
    }
  }

  const estiloMenu = aberto && botaoRef.current
    ? {
        top: `${Math.min(botaoRef.current.getBoundingClientRect().bottom + 6, window.innerHeight - 8)}px`,
        left: `${Math.max(8, Math.min(botaoRef.current.getBoundingClientRect().right - 130, window.innerWidth - 138))}px`,
      }
    : undefined

  return (
    <section className="jogo-atual-card" aria-label="Jogo atual">
      <div className="jogo-atual-topo">
        <div className="jogo-atual-capa">
          <JogoCapa capa={jogo.capa} alt={`Capa de ${jogo.nome}`} />
        </div>

        <div className="jogo-atual-titulo">
          <span className="jogo-atual-rotulo">JOGO ATUAL</span>
          <h2 className="jogo-atual-nome">{jogo.nome}</h2>
        </div>
      </div>

      <div className="jogo-atual-info">
        <span className="chip chip-tempo">
          <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
          {carregandoSessoes ? '—' : formatarTempoCurto(tempoTotalMs)}
        </span>

        <span className="chip chip-sessoes">
          <BookOpen size={14} strokeWidth={1.75} aria-hidden="true" />
          {carregandoSessoes
            ? '—'
            : formatarQuantidadeSessoes(totalSessoes)}
        </span>

        <div className="chip chip-situacao situacao-selector">
          <button
            ref={botaoRef}
            type="button"
            className="situacao-botao"
            onClick={() => setAberto(!aberto)}
            aria-expanded={aberto}
            aria-label={`Situação atual: ${jogo.situacao}. Abrir seletor.`}
          >
            <span
              className={`situacao-chip ${jogo.situacao
                .toLowerCase()
                .replace(/ /g, '-')}`}
            >
              {jogo.situacao}
            </span>
            <ChevronDown size={12} strokeWidth={1.75} aria-hidden="true" />
          </button>

          {aberto && createPortal(
            <div
              className="situacao-menu"
              role="menu"
              style={estiloMenu}
            >
              {SITUACOES_JOGO.map((situacao) => {
                const selecionado = situacao === jogo.situacao

                return (
                  <button
                    key={situacao}
                    type="button"
                    role="menuitem"
                    aria-checked={selecionado}
                    className={[
                      'situacao-item',
                      selecionado ? 'situacao-item-selecionado' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => void aoMudarSituacao(situacao)}
                    disabled={salvando}
                  >
                    {situacao}
                    {selecionado && (
                      <span className="situacao-item-check" aria-hidden="true" />
                    )}
                  </button>
                )
              })}
            </div>,
            document.body,
          )}
        </div>
      </div>
    </section>
  );
}

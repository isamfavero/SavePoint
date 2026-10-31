import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import type { Jogo, SituacaoJogo } from '../data'
import { SITUACOES_JOGO } from '../data'

type SituacaoSelectorProps = {
  jogo: Jogo | null
  className?: string
}

export function SituacaoSelector({ jogo, className }: SituacaoSelectorProps) {
  const servico = useServicoSavePoint()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

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

  if (!jogo) return null

  return (
    <div className={['situacao-selector', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="situacao-botao"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-label={`Situação atual: ${jogo.situacao}. Abrir seletor.`}
      >
        <span
          className={`situacao-chip ${jogo.situacao.toLowerCase().replace(/ /g, '-')}`}
        >
          {jogo.situacao}
        </span>
        <ChevronDown size={13} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {aberto && (
        <div className="situacao-menu" role="menu">
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
        </div>
      )}
    </div>
  )
}

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { SITUACOES_JOGO, type SituacaoJogo } from '../constantes'
import type { Jogo } from '../data'

type SituacaoSelectorProps = {
  jogo: Jogo | null
}

export function SituacaoSelector({ jogo }: SituacaoSelectorProps) {
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
    <div className="situacao-selector">
      <button
        type="button"
        className="chip situacao-botao"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-label={`Situação atual: ${jogo.situacao}. Abrir seletor.`}
      >
        {jogo.situacao}
        <ChevronDown size={12} strokeWidth={1.75} aria-hidden="true" />
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

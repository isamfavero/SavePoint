import { Check, SquarePen } from 'lucide-react'
import { useState } from 'react'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import type { Registro } from '../data'
import { formatarTempoRelativo } from '../dominio/biblioteca'

type ObjetivosListaProps = {
  jogoId: string
  objetivos: Registro[]
  sessaoAtiva: { id: string; numero: number } | null
  aoIniciarSessao: () => void
}

export function ObjetivosLista({
  jogoId,
  objetivos,
  sessaoAtiva,
  aoIniciarSessao,
}: ObjetivosListaProps) {
  const servico = useServicoSavePoint()
  const { sessao } = useSessaoAtiva()
  const [modalAberto, setModalAberto] = useState(false)
  const [textoNovo, setTextoNovo] = useState('')
  const [iniciando, setIniciando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  const aberta = sessaoAtiva?.id ?? null

  const abertos = objetivos.filter((o) => !o.concluido)
  const concluidos = objetivos.filter((o) => o.concluido)

  async function aoAlternarConclusao(objetivo: Registro) {
    setSalvandoId(objetivo.id)
    setErro(null)

    try {
      if (objetivo.concluido) {
        await servico.reabrirObjetivo(objetivo.id)
      } else {
        await servico.concluirObjetivo(objetivo.id, {
          concluidoSessaoId: aberta,
        })
      }
    } catch {
      setErro('Não foi possível atualizar o objetivo.')
    } finally {
      setSalvandoId(null)
    }
  }

  async function aoAdicionarObjetivo() {
    if (!sessao) {
      setModalAberto(true)
      return
    }

    setIniciando(true)
    setErro(null)

    try {
      if (!textoNovo.trim()) {
        setErro('Informe o objetivo.')
        return
      }

      await servico.criarRegistro({
        jogoId,
        sessaoId: sessao.id,
        tipo: 'Objetivo',
        texto: textoNovo.trim(),
      })

      setTextoNovo('')
    } catch {
      setErro('Não foi possível criar o objetivo.')
    } finally {
      setIniciando(false)
    }
  }

  function abrirModalIniciarSessao() {
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
  }

  return (
    <section className="objetivos" aria-label="Objetivos">
      <div className="objetivos-topo">
        <h2 className="objetivos-titulo">Objetivos</h2>

        {aberta && (
          <div className="objetivo-novo">
            <span className="objetivo-novo-hash" aria-hidden="true">
              #
            </span>
            <input
              type="text"
              value={textoNovo}
              onChange={(evento) => {
                setTextoNovo(evento.target.value)
                if (erro) setErro(null)
              }}
              placeholder="Novo objetivo"
              aria-label="Novo objetivo"
            />
            <button
              type="button"
              className="botao-mini objetivo-botao-adicionar"
              onClick={aoAdicionarObjetivo}
              disabled={iniciando}
            >
              {iniciando ? 'Criando...' : <SquarePen size={14} strokeWidth={2} aria-hidden="true" />}
            </button>
          </div>
        )}
      </div>

      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}

      {!aberta && (
        <div className="objetivo-sem-sessao">
          <p>
            Para adicionar objetivos, inicie uma sessão primeiro.
          </p>
          <button
            type="button"
            className="botao-primario compacto"
            onClick={abrirModalIniciarSessao}
            disabled={iniciando}
          >
            {iniciando ? 'Iniciando...' : 'Iniciar sessão'}
          </button>
        </div>
      )}

      {abertos.length > 0 && (
        <>
          <h3 className="objetivos-grupo-titulo">Em aberto</h3>
          <ul className="objetivos-lista">
            {abertos.map((objetivo) => (
              <li key={objetivo.id} className="objetivo-item">
                <button
                  type="button"
                  className="objetivo-caixa"
                  onClick={() => void aoAlternarConclusao(objetivo)}
                  disabled={salvandoId === objetivo.id}
                  aria-pressed="false"
                >
                  <span className="objetivo-caixa-texto">
                    {objetivo.texto}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {concluidos.length > 0 && (
        <>
          <h3 className="objetivos-grupo-titulo">Concluídos</h3>
          <ul className="objetivos-lista">
            {concluidos.map((objetivo) => (
              <li key={objetivo.id} className="objetivo-item">
                <button
                  type="button"
                  className="objetivo-caixa objetivo-caixa-concluido"
                  onClick={() => void aoAlternarConclusao(objetivo)}
                  disabled={salvandoId === objetivo.id}
                  aria-pressed="true"
                >
                  <Check size={15} strokeWidth={2} aria-hidden="true" />
                  <span className="objetivo-caixa-texto">
                    {objetivo.texto}
                  </span>
                  {objetivo.concluidoSessaoId === aberta && (
                    <span className="objetivo-status">Concluído nesta sessão</span>
                  )}
                  {!objetivo.concluidoSessaoId && objetivo.concluidoEm && (
                    <span className="objetivo-status">
                      Concluído {formatarTempoRelativo(objetivo.concluidoEm)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {abertos.length === 0 && concluidos.length === 0 && (
        <div className="estado-vazio objetivos-vazio">
          <span className="estado-vazio-icone" aria-hidden="true">
            <SquarePen size={32} strokeWidth={1.75} />
          </span>
          <h2>Nenhum objetivo ainda</h2>
          <p>
            Crie objetivos para marcar o que você ainda quer conquistar neste
            jogo.
          </p>
        </div>
      )}

      {aberta && modalAberto && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-objetivo-sessao"
          >
            <h2 id="titulo-objetivo-sessao">Para adicionar objetivos, inicie uma sessão</h2>
            <p>
              Os objetivos ficam vinculados à sessão atual do jogo.
            </p>

            <div className="modal-acoes">
              <button
                type="button"
                className="botao-secundario"
                onClick={fecharModal}
                disabled={iniciando}
                autoFocus
              >
                Cancelar
              </button>
              <button
                type="button"
                className="botao-primario compacto"
                onClick={() => {
                  fecharModal()
                  aoIniciarSessao()
                }}
                disabled={iniciando}
              >
                {iniciando ? 'Iniciando...' : 'Iniciar sessão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

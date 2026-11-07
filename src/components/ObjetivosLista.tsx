import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import type { Registro } from '../data'

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

  const abertos = objetivos
    .filter((o) => !o.concluido)
    .sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime())
  const concluidos = objetivos
    .filter((o) => o.concluido)
    .sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime())

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

  function fecharModal() {
    setModalAberto(false)
  }

  return (
    <section className="objetivos" aria-label="Objetivos">
      <div className="objetivos-cabecalho">
        <div className="objetivos-cabecalho-esquerda">
          <span className="objetivos-cabecalho-icone" aria-hidden="true">
            <Check size={20} strokeWidth={2} />
          </span>
          <span className="objetivos-cabecalho-titulo">
            OBJETIVOS EM ABERTO
          </span>
        </div>
        <div className="objetivos-cabecalho-direita">
          {concluidos.length > 0 && (
            <span className="objetivos-contador">
              {concluidos.length} Concluído
            </span>
          )}
          {aberta ? (
            <>
              <input
                type="text"
                className="objetivos-input-novo"
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
                className="objetivos-botao-adicionar"
                onClick={aoAdicionarObjetivo}
                disabled={iniciando}
                aria-label="Adicionar objetivo"
              >
                {iniciando ? 'Criando...' : <Plus size={16} strokeWidth={2} aria-hidden="true" />}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="objetivos-botao-adicionar"
              onClick={() => setModalAberto(true)}
              aria-label="Adicionar objetivo"
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {erro && (
        <p className="campo-erro" role="alert">{erro}</p>
      )}

      {abertos.length === 0 && concluidos.length === 0 && (
        <p className="objetivos-vazio">
          Nenhum objetivo ainda. Toque em + para adicionar o primeiro.
        </p>
      )}

      {abertos.length > 0 && (
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
                <span className="objetivo-checkbox" aria-hidden="true" />
                <span className="objetivo-texto">{objetivo.texto}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {concluidos.length > 0 && (
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
                <span className="objetivo-checkbox objetivo-checkbox-marcado" aria-hidden="true">
                  <Check size={16} strokeWidth={2} />
                </span>
                <span className="objetivo-texto objetivo-texto-concluido">
                  {objetivo.texto}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {modalAberto && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-objetivo-sessao"
          >
            <h2 id="titulo-objetivo-sessao">
              Para adicionar objetivos, inicie uma sessão
            </h2>
            {!aberta && (
              <p>Os objetivos ficam vinculados à sessão atual do jogo.</p>
            )}
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

import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
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
  const [iniciando, setIniciando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [novoObjetivoAberto, setNovoObjetivoAberto] = useState(false)
  const [textoNovo, setTextoNovo] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  const [objetivoParaApagar, setObjetivoParaApagar] = useState<Registro | null>(null)

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

  async function aoCriarObjetivo() {
    if (!sessao) {
      setModalAberto(true)
      return
    }

    setIniciando(true)
    setErro(null)

    try {
      if (!textoNovo.trim()) return

      await servico.criarRegistro({
        jogoId,
        sessaoId: sessao.id,
        tipo: 'Objetivo',
        texto: textoNovo.trim(),
      })

      setTextoNovo('')
      setNovoObjetivoAberto(false)
    } catch {
      setErro('Não foi possível criar o objetivo.')
    } finally {
      setIniciando(false)
    }
  }

  function aoCancelarNovoObjetivo() {
    setTextoNovo('')
    setNovoObjetivoAberto(false)
    setErro(null)
  }

  function aoAdicionarObjetivo() {
    if (!sessao) {
      setModalAberto(true)
      return
    }

    setNovoObjetivoAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
  }

  function abrirEdicao(objetivo: Registro) {
    setEditandoId(objetivo.id)
    setTextoEdicao(objetivo.texto)
    setErro(null)
  }

  async function aoSalvarEdicao(objetivo: Registro) {
    const limpo = textoEdicao.trim()

    if (!limpo) {
      setErro('O objetivo precisa de um texto.')
      return
    }

    if (limpo === objetivo.texto) {
      setEditandoId(null)
      return
    }

    setSalvandoId(objetivo.id)
    setErro(null)

    try {
      await servico.atualizarRegistro(objetivo.id, { texto: limpo })
      setEditandoId(null)
    } catch {
      setErro('Não foi possível salvar o objetivo.')
    } finally {
      setSalvandoId(null)
    }
  }

  async function aoApagar() {
    if (!objetivoParaApagar) return

    const alvo = objetivoParaApagar
    setSalvandoId(alvo.id)
    setErro(null)

    try {
      await servico.excluirRegistro(alvo.id)
      setObjetivoParaApagar(null)
      setEditandoId(null)
    } catch {
      setErro('Não foi possível apagar o objetivo.')
    } finally {
      setSalvandoId(null)
    }
  }

  function renderizarItem(objetivo: Registro) {
    const concluido = Boolean(objetivo.concluido)

    if (editandoId === objetivo.id) {
      return (
        <li key={objetivo.id} className="objetivo-item">
          <div className="objetivos-novo-campo objetivo-edicao">
            <input
              type="text"
              className="objetivos-input-novo"
              value={textoEdicao}
              onChange={(evento) => setTextoEdicao(evento.target.value)}
              aria-label="Texto do objetivo"
              autoFocus
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') {
                  evento.preventDefault()
                  void aoSalvarEdicao(objetivo)
                } else if (evento.key === 'Escape') {
                  setEditandoId(null)
                }
              }}
            />
            <button
              type="button"
              className="objetivos-botao-confirmar"
              onClick={() => void aoSalvarEdicao(objetivo)}
              disabled={salvandoId === objetivo.id || !textoEdicao.trim()}
              aria-label="Salvar objetivo"
            >
              <Check size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="objetivos-botao-cancelar objetivo-botao-apagar"
              onClick={() => setObjetivoParaApagar(objetivo)}
              aria-label="Apagar objetivo"
            >
              <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="objetivos-botao-cancelar"
              onClick={() => setEditandoId(null)}
              aria-label="Cancelar edição"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </li>
      )
    }

    return (
      <li key={objetivo.id} className="objetivo-item">
        <button
          type="button"
          className={`objetivo-caixa${concluido ? ' objetivo-caixa-concluido' : ''}`}
          onClick={() => void aoAlternarConclusao(objetivo)}
          disabled={salvandoId === objetivo.id}
          aria-pressed={concluido}
        >
          <span
            className={`objetivo-checkbox${concluido ? ' objetivo-checkbox-marcado' : ''}`}
            aria-hidden="true"
          >
            {concluido && <Check size={16} strokeWidth={2} />}
          </span>
          <span className={`objetivo-texto${concluido ? ' objetivo-texto-concluido' : ''}`}>
            {objetivo.texto}
          </span>
        </button>
        <button
          type="button"
          className="objetivo-editar"
          onClick={() => abrirEdicao(objetivo)}
          aria-label={`Editar objetivo: ${objetivo.texto}`}
        >
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </li>
    )
  }

  return (
    <section className="objetivos" aria-label="Objetivos">
      <div className="objetivos-cabecalho">
        <div className="objetivos-cabecalho-linha1">
          <span className="objetivos-cabecalho-icone" aria-hidden="true">
            <Check size={20} strokeWidth={2} />
          </span>
          <span className="objetivos-cabecalho-titulo">OBJETIVOS EM ABERTO</span>
        </div>
        <div className="objetivos-cabecalho-linha2">
          {concluidos.length > 0 && (
            <span className="objetivos-contador">
              {concluidos.length} Concluído{concluidos.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            className="objetivos-botao-adicionar"
            onClick={aoAdicionarObjetivo}
            aria-label="Adicionar objetivo"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      {erro && (
        <p className="campo-erro" role="alert">{erro}</p>
      )}

      {novoObjetivoAberto && (
        <div className="objetivos-novo-campo">
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
            autoFocus
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault()
                void aoCriarObjetivo()
              } else if (evento.key === 'Escape') {
                aoCancelarNovoObjetivo()
              }
            }}
          />
          <button
            type="button"
            className="objetivos-botao-confirmar"
            onClick={() => void aoCriarObjetivo()}
            disabled={iniciando || !textoNovo.trim()}
            aria-label="Confirmar novo objetivo"
          >
            <Check size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="objetivos-botao-cancelar"
            onClick={aoCancelarNovoObjetivo}
            aria-label="Cancelar novo objetivo"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}

      {abertos.length === 0 && concluidos.length === 0 && (
        <p className="objetivos-vazio">
          Nenhum objetivo ainda. Toque em + para adicionar o primeiro.
        </p>
      )}

      {abertos.length > 0 && (
        <ul className="objetivos-lista">
          {abertos.map((objetivo) => renderizarItem(objetivo))}
        </ul>
      )}

      {concluidos.length > 0 && (
        <ul className="objetivos-lista">
          {concluidos.map((objetivo) => renderizarItem(objetivo))}
        </ul>
      )}

      {objetivoParaApagar && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-apagar-objetivo"
          >
            <h2 id="titulo-apagar-objetivo">Apagar objetivo?</h2>
            <p>“{objetivoParaApagar.texto}” sai da lista. Não dá para desfazer.</p>
            <div className="modal-acoes">
              <button
                type="button"
                className="botao-secundario"
                onClick={() => setObjetivoParaApagar(null)}
                autoFocus
              >
                Cancelar
              </button>
              <button
                type="button"
                className="botao-perigo compacto"
                onClick={() => void aoApagar()}
                disabled={salvandoId === objetivoParaApagar.id}
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
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

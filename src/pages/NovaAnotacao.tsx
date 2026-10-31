import {
  BookOpen,
  Check,
  FileText,
  Flag,
  KeyRound,
  Lightbulb,
  Map,
  Plus,
  Puzzle,
  Target,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChipSessao } from '../components/ChipSessao'
import { useAviso } from '../contexts/AvisoContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import type { TipoRegistro } from '../data'

const TAGS_SUGERIDAS = [
  '#código',
  '#personagem',
  '#local',
  '#teoria',
  '#puzzle',
  '#lore',
  '#dica',
]

const CORES_TAG = ['tag-cor-1', 'tag-cor-2', 'tag-cor-3', 'tag-cor-4', 'tag-cor-5']

type OpcaoTipo = {
  tipo: TipoRegistro
  descricao: string
  Icone: LucideIcon
  largo?: boolean
}

const CATEGORIAS: OpcaoTipo[] = [
  { tipo: 'Diário', descricao: 'Crônicas', Icone: BookOpen },
  { tipo: 'Senhas', descricao: 'Chaves & IDs', Icone: KeyRound },
  { tipo: 'Manuscritos', descricao: 'Pergaminhos', Icone: FileText },
  { tipo: 'Puzzles', descricao: 'Enigmas', Icone: Puzzle },
  { tipo: 'Lembretes', descricao: 'Minhas dicas & pendências', Icone: Lightbulb, largo: true },
]

const PROGRESSO: OpcaoTipo[] = [
  { tipo: 'Marco', descricao: 'Conquistas', Icone: Flag },
  { tipo: 'Região mapeada', descricao: 'Áreas exploradas', Icone: Map },
  { tipo: 'Objetivo', descricao: 'Metas da jornada', Icone: Target, largo: true },
]

type ErrosFormulario = {
  texto?: string
  tipo?: string
}

function mensagemDoErro(erro: unknown, padrao: string): string {
  return erro instanceof Error && erro.message ? erro.message : padrao
}

function corDaTag(tag: string): string {
  let soma = 0

  for (const caractere of tag) {
    soma += caractere.charCodeAt(0)
  }

  return CORES_TAG[soma % CORES_TAG.length]
}

function normalizarNovaTag(valor: string): { tag: string | null; erro: string | null } {
  const semCerquilha = valor.trim().replace(/^#+/, '')

  if (!semCerquilha) {
    return { tag: null, erro: 'Digite um nome para a tag.' }
  }

  if (/\s/.test(semCerquilha)) {
    return { tag: null, erro: 'Tags não podem ter espaços.' }
  }

  return { tag: `#${semCerquilha.toLowerCase()}`, erro: null }
}

function CartaoTipo({
  opcao,
  selecionado,
  onSelecionar,
}: {
  opcao: OpcaoTipo
  selecionado: boolean
  onSelecionar: () => void
}) {
  const Icone = opcao.Icone

  return (
    <button
      type="button"
      className={[
        'tipo-cartao',
        opcao.largo ? 'tipo-cartao-largo' : '',
        selecionado ? 'tipo-cartao-selecionado' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={selecionado}
      onClick={onSelecionar}
    >
      <span className="tipo-cartao-icone" aria-hidden="true">
        <Icone size={18} strokeWidth={1.75} />
      </span>
      <span className="tipo-cartao-texto">
        <strong>{opcao.tipo}</strong>
        <small>{opcao.descricao}</small>
      </span>
      {selecionado && <span className="tipo-cartao-marca" aria-hidden="true" />}
    </button>
  )
}

export function NovaAnotacao() {
  const servico = useServicoSavePoint()
  const { mostrarAviso } = useAviso()
  const {
    sessao,
    jogo,
    carregando,
    duracaoMs,
    pausada,
  } = useSessaoAtiva()
  const navigate = useNavigate()

  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<TipoRegistro | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagsUsadas, setTagsUsadas] = useState<string[]>([])
  const [tagsCriadas, setTagsCriadas] = useState<string[]>([])
  const [novaTagAberta, setNovaTagAberta] = useState(false)
  const [novaTagTexto, setNovaTagTexto] = useState('')
  const [erroTag, setErroTag] = useState<string | null>(null)
  const [erros, setErros] = useState<ErrosFormulario>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)

  const jogoId = sessao?.jogoId ?? null

  useEffect(() => {
    if (carregando) return

    if (!sessao) {
      navigate('/jornada', { replace: true })
    }
  }, [carregando, navigate, sessao])

  useEffect(() => {
    let ativo = true

    if (!jogoId) return

    servico
      .listarTagsUsadas(jogoId)
      .then((lista) => {
        if (ativo) setTagsUsadas(lista)
      })
      .catch(() => {
        if (ativo) setTagsUsadas([])
      })

    return () => {
      ativo = false
    }
  }, [jogoId, servico])

  const tagsDisponiveis = useMemo(() => {
    const vistas = new Set<string>()

    return [...TAGS_SUGERIDAS, ...tagsUsadas, ...tagsCriadas].filter((tag) => {
      const chave = tag.toLowerCase()

      if (vistas.has(chave)) return false

      vistas.add(chave)
      return true
    })
  }, [tagsCriadas, tagsUsadas])

  function voltar() {
    const indice = window.history.state?.idx

    if (typeof indice === 'number' && indice > 0) {
      navigate(-1)
      return
    }

    navigate('/jornada', { replace: true })
  }

  function aoFechar() {
    if (texto.trim()) {
      setConfirmarDescarte(true)
      return
    }

    voltar()
  }

  function alternarTag(tag: string) {
    setTags((atuais) =>
      atuais.includes(tag)
        ? atuais.filter((item) => item !== tag)
        : [...atuais, tag],
    )
  }

  function adicionarNovaTag() {
    const { tag, erro } = normalizarNovaTag(novaTagTexto)

    if (!tag) {
      setErroTag(erro)
      return
    }

    if (!tagsDisponiveis.some((disponivel) => disponivel.toLowerCase() === tag)) {
      setTagsCriadas((atuais) => [...atuais, tag])
    }

    setTags((atuais) => (atuais.includes(tag) ? atuais : [...atuais, tag]))
    setNovaTagTexto('')
    setNovaTagAberta(false)
    setErroTag(null)
  }

  function aoTeclarNovaTag(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== 'Enter') return

    evento.preventDefault()
    adicionarNovaTag()
  }

  async function aoSalvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const novosErros: ErrosFormulario = {}

    if (!texto.trim()) {
      novosErros.texto = 'Escreva o que você descobriu.'
    }

    if (!tipo) {
      novosErros.tipo = 'Escolha um tipo de anotação.'
    }

    setErros(novosErros)
    setErroGeral(null)

    if (!texto.trim() || !tipo || !sessao) return

    setSalvando(true)

    try {
      await servico.criarRegistro({
        jogoId: sessao.jogoId,
        sessaoId: sessao.id,
        tipo,
        texto: texto.trim(),
        tags,
      })

      mostrarAviso(`Anotação registrada na Sessão ${sessao.numero}.`)
      voltar()
    } catch (falha) {
      setErroGeral(mensagemDoErro(falha, 'Não foi possível registrar a anotação.'))
      setSalvando(false)
    }
  }

  if (carregando || !sessao) {
    return (
      <div className="app-shell app-shell-anotacao">
        <main className="app-main anotacao-main">
          <p className="biblioteca-aviso">Carregando a sessão...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell app-shell-anotacao">
      <main className="app-main anotacao-main">
        <div className="anotacao-topo">
          <button
            type="button"
            className="botao-voltar"
            onClick={aoFechar}
            aria-label="Fechar nova anotação"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <ChipSessao numero={sessao.numero} duracaoMs={duracaoMs} pausada={pausada} />
        </div>

        <p className="anotacao-jogo">{jogo?.nome ?? 'Jogo'}</p>
        <h1 className="formulario-titulo">Nova anotação</h1>

        <form id="form-nova-anotacao" className="anotacao-form" onSubmit={aoSalvar} noValidate>
          <div className="campo">
            <label className="campo-rotulo" htmlFor="texto-anotacao">
              O que você descobriu?
            </label>
            <textarea
              id="texto-anotacao"
              className="campo-textarea anotacao-textarea"
              rows={6}
              value={texto}
              onChange={(evento) => {
                setTexto(evento.target.value)
                if (erros.texto) setErros((atuais) => ({ ...atuais, texto: undefined }))
              }}
              placeholder="Achei o alinhamento das três engrenagens de bronze no pátio sul. O pilar revelou uma cavidade com símbolo lunar."
              aria-invalid={Boolean(erros.texto)}
              aria-describedby={erros.texto ? 'erro-texto-anotacao' : undefined}
            />
            {erros.texto && (
              <p className="campo-erro" id="erro-texto-anotacao" role="alert">
                {erros.texto}
              </p>
            )}
          </div>

          <div className="campo">
            <div className="campo-rotulo">
              <span>Categoria</span>
              <span className="campo-opcional">Escolha única</span>
            </div>

            <div className="tipo-grade" role="group" aria-label="Categoria da anotação">
              {CATEGORIAS.map((opcao) => (
                <CartaoTipo
                  key={opcao.tipo}
                  opcao={opcao}
                  selecionado={tipo === opcao.tipo}
                  onSelecionar={() => {
                    setTipo(opcao.tipo)
                    if (erros.tipo) setErros((atuais) => ({ ...atuais, tipo: undefined }))
                  }}
                />
              ))}
            </div>

            {erros.tipo && (
              <p className="campo-erro" role="alert">
                {erros.tipo}
              </p>
            )}

            <div className="tipo-grupo">
              <span className="tipo-grupo-rotulo">Progresso do jogo</span>
              <div className="tipo-grade" role="group" aria-label="Progresso do jogo">
                {PROGRESSO.map((opcao) => (
                  <CartaoTipo
                    key={opcao.tipo}
                    opcao={opcao}
                    selecionado={tipo === opcao.tipo}
                    onSelecionar={() => {
                      setTipo(opcao.tipo)
                      if (erros.tipo) setErros((atuais) => ({ ...atuais, tipo: undefined }))
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="campo">
            <div className="campo-rotulo">
              <span>Tags</span>
              <span className="campo-opcional">Opcional</span>
            </div>

            <div className="chips tags-chips" role="group" aria-label="Tags">
              {tagsDisponiveis.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="chip chip-tag"
                  aria-pressed={tags.includes(tag)}
                  onClick={() => alternarTag(tag)}
                >
                  <span className={`tag-ponto ${corDaTag(tag)}`} aria-hidden="true" />
                  {tag}
                </button>
              ))}

              <button
                type="button"
                className="chip chip-nova-tag"
                onClick={() => {
                  setNovaTagAberta(true)
                  setErroTag(null)
                }}
              >
                <Plus size={13} strokeWidth={2} aria-hidden="true" />
                Nova tag
              </button>
            </div>

            {novaTagAberta && (
              <div className="nova-tag">
                <span className="nova-tag-hash" aria-hidden="true">
                  #
                </span>
                <input
                  type="text"
                  value={novaTagTexto}
                  onChange={(evento) => {
                    setNovaTagTexto(evento.target.value)
                    if (erroTag) setErroTag(null)
                  }}
                  onKeyDown={aoTeclarNovaTag}
                  placeholder="nome-da-tag"
                  aria-label="Nome da nova tag"
                  autoFocus
                />
                <button
                  type="button"
                  className="botao-mini"
                  onClick={adicionarNovaTag}
                >
                  Adicionar
                </button>
              </div>
            )}

            {erroTag && (
              <p className="campo-erro" role="alert">
                {erroTag}
              </p>
            )}
          </div>

          {erroGeral && (
            <p className="campo-erro" role="alert">
              {erroGeral}
            </p>
          )}
        </form>
      </main>

      <div className="form-acoes anotacao-acoes">
        <button
          type="submit"
          form="form-nova-anotacao"
          className="botao-primario"
          disabled={salvando}
        >
          <Check size={18} strokeWidth={2.2} aria-hidden="true" />
          {salvando ? 'Registrando...' : 'Registrar anotação'}
        </button>
        <p className="anotacao-vinculo">
          Vinculada automaticamente à Sessão {sessao.numero}
        </p>
      </div>

      {confirmarDescarte && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-descartar"
          >
            <h2 id="titulo-descartar">Descartar anotação?</h2>
            <p>O texto que você escreveu será perdido.</p>
            <div className="modal-acoes">
              <button
                type="button"
                className="botao-secundario"
                onClick={() => setConfirmarDescarte(false)}
                autoFocus
              >
                Continuar escrevendo
              </button>
              <button
                type="button"
                className="botao-primario compacto"
                onClick={() => {
                  setConfirmarDescarte(false)
                  voltar()
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

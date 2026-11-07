import {
  BookOpen,
  Check,
  FileText,
  Flag,
  KeyRound,
  Lightbulb,
  Map,
  Pencil,
  Plus,
  Puzzle,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChipSessao } from '../components/ChipSessao'
import { useAviso } from '../contexts/AvisoContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import type { Registro, TipoRegistro } from '../data'

type DadosEdicao = {
  registro: Registro
  numeroSessao: number | null
  nomeJogo: string | null
}

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
  { tipo: 'Documentos', descricao: 'Cartas & arquivos', Icone: FileText },
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
  const { registroId } = useParams()
  const modoEdicao = Boolean(registroId)

  const [edicao, setEdicao] = useState<DadosEdicao | null>(null)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

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

  const jogoId = modoEdicao ? (edicao?.registro.jogoId ?? null) : (sessao?.jogoId ?? null)

  useEffect(() => {
    if (modoEdicao || carregando) return

    if (!sessao) {
      navigate('/jornada', { replace: true })
    }
  }, [carregando, modoEdicao, navigate, sessao])

  // Modo edição: carrega a anotação e preenche o formulário.
  useEffect(() => {
    if (!registroId) return

    let ativo = true

    ;(async () => {
      try {
        const registro = await servico.obterRegistro(registroId)

        if (!registro) {
          if (ativo) setErroEdicao('Esta anotação não existe mais.')
          return
        }

        const [sessaoDoRegistro, jogoDoRegistro] = await Promise.all([
          servico.obterSessao(registro.sessaoId),
          servico.obterJogo(registro.jogoId),
        ])

        if (!ativo) return

        setEdicao({
          registro,
          numeroSessao: sessaoDoRegistro?.numero ?? null,
          nomeJogo: jogoDoRegistro?.nome ?? null,
        })
        setTexto(registro.texto)
        setTipo(registro.tipo)
        setTags(registro.tags)
        setTagsCriadas(registro.tags)
      } catch {
        if (ativo) setErroEdicao('Não foi possível abrir esta anotação.')
      }
    })()

    return () => {
      ativo = false
    }
  }, [registroId, servico])

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

  function houveMudanca(): boolean {
    if (!edicao) return Boolean(texto.trim())

    const original = edicao.registro
    return (
      texto.trim() !== original.texto ||
      tipo !== original.tipo ||
      tags.join(' ') !== original.tags.join(' ')
    )
  }

  async function aoExcluir() {
    if (!edicao) return

    setExcluindo(true)

    try {
      await servico.excluirRegistro(edicao.registro.id)
      mostrarAviso('Anotação apagada.')
      voltar()
    } catch (falha) {
      setConfirmarExclusao(false)
      setExcluindo(false)
      setErroGeral(mensagemDoErro(falha, 'Não foi possível apagar a anotação.'))
    }
  }

  function aoFechar() {
    if (houveMudanca()) {
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

    if (!texto.trim() || !tipo) return

    if (edicao) {
      setSalvando(true)

      try {
        await servico.atualizarRegistro(edicao.registro.id, {
          texto: texto.trim(),
          tipo,
          tags,
        })
        mostrarAviso('Anotação atualizada.')
        voltar()
      } catch (falha) {
        setErroGeral(mensagemDoErro(falha, 'Não foi possível salvar a anotação.'))
        setSalvando(false)
      }

      return
    }

    if (!sessao) return

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

  if (modoEdicao && erroEdicao) {
    return (
      <div className="app-shell app-shell-anotacao">
        <main className="app-main anotacao-main">
          <div className="estado-vazio">
            <h2>Não foi possível abrir</h2>
            <p>{erroEdicao}</p>
            <button type="button" className="botao-secundario" onClick={voltar}>
              Voltar
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (modoEdicao ? !edicao : carregando || !sessao) {
    return (
      <div className="app-shell app-shell-anotacao">
        <main className="app-main anotacao-main">
          <p className="biblioteca-aviso">
            {modoEdicao ? 'Carregando a anotação...' : 'Carregando a sessão...'}
          </p>
        </main>
      </div>
    )
  }

  const numeroSessao = edicao ? edicao.numeroSessao : (sessao?.numero ?? null)
  const nomeJogo = edicao ? edicao.nomeJogo : (jogo?.nome ?? null)

  return (
    <div className="app-shell app-shell-anotacao">
      <main className="app-main anotacao-main">
        <div className="anotacao-topo">
          <button
            type="button"
            className="botao-voltar"
            onClick={aoFechar}
            aria-label={edicao ? 'Fechar edição da anotação' : 'Fechar nova anotação'}
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>

          {edicao ? (
            <span className="selo-novo">
              <Pencil size={11} strokeWidth={1.75} aria-hidden="true" />
              {numeroSessao ? `Sessão ${numeroSessao}` : 'Editando'}
            </span>
          ) : (
            sessao && (
              <ChipSessao numero={sessao.numero} duracaoMs={duracaoMs} pausada={pausada} />
            )
          )}
        </div>

        <p className="anotacao-jogo">{nomeJogo?.toUpperCase() ?? 'JOGO'}</p>
        <h1 className="formulario-titulo">{edicao ? 'Editar anotação' : 'Nova anotação'}</h1>

        <form id="form-nova-anotacao" className="anotacao-form" onSubmit={aoSalvar} noValidate>
          <div className="campo">
            <label className="campo-rotulo" htmlFor="texto-anotacao">
              O QUE VOCÊ DESCOBRIU?
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
          {edicao
            ? salvando
              ? 'Salvando...'
              : 'Salvar alterações'
            : salvando
              ? 'Registrando...'
              : 'Registrar anotação'}
        </button>
        {edicao ? (
          <button
            type="button"
            className="botao-perigo-texto"
            onClick={() => setConfirmarExclusao(true)}
            disabled={salvando}
          >
            <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
            Apagar anotação
          </button>
        ) : (
          <p className="anotacao-vinculo">
            Vinculada automaticamente à Sessão {numeroSessao}
          </p>
        )}
      </div>

      {confirmarExclusao && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-apagar-anotacao"
          >
            <h2 id="titulo-apagar-anotacao">Apagar anotação?</h2>
            <p>Ela sai da sessão, da Jornada e da busca. Não dá para desfazer.</p>
            <div className="modal-acoes">
              <button
                type="button"
                className="botao-secundario"
                onClick={() => setConfirmarExclusao(false)}
                disabled={excluindo}
                autoFocus
              >
                Cancelar
              </button>
              <button
                type="button"
                className="botao-perigo compacto"
                onClick={() => void aoExcluir()}
                disabled={excluindo}
              >
                {excluindo ? 'Apagando...' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmarDescarte && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-descartar"
          >
            <h2 id="titulo-descartar">
              {edicao ? 'Descartar alterações?' : 'Descartar anotação?'}
            </h2>
            <p>
              {edicao
                ? 'As mudanças que você fez nesta anotação serão perdidas.'
                : 'O texto que você escreveu será perdido.'}
            </p>
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

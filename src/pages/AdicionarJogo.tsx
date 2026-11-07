import {
  ArrowLeft,
  Check,
  Diamond,
  Image as ImageIcon,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MiniCronometro } from '../components/MiniCronometro'
import { useAviso } from '../contexts/AvisoContext'
import { useJogoAtual } from '../contexts/JogoAtualContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import type { Jogo, SituacaoJogo } from '../data'
import { existeJogoDuplicado } from '../dominio/biblioteca'
import { reduzirImagemParaBlob } from '../dominio/imagem'
import { useObjectUrl } from '../hooks/useObjectUrl'

const PLATAFORMAS = [
  'PC',
  'PlayStation',
  'Xbox',
  'Mobile',
  'Nintendo Switch',
  'Outro',
] as const

const GENEROS = [
  'Aventura',
  'Puzzle',
  'RPG',
  'Mistério',
  'Ação',
  'Terror',
  'Estratégia',
  'Plataforma',
  'Simulação',
  'Indie',
] as const

const SITUACOES: SituacaoJogo[] = ['Jogando', 'Pausado', 'Concluído', 'Quero jogar']

type ErrosFormulario = {
  nome?: string
  plataforma?: string
}

export function AdicionarJogo() {
  const servico = useServicoSavePoint()
  const { jogoAtualId, definirJogoAtual, limparJogoAtual } = useJogoAtual()
  const { mostrarAviso } = useAviso()
  const navigate = useNavigate()
  const { jogoId } = useParams()
  const [params] = useSearchParams()
  const vemDasBoasVindas = params.get('origem') === 'boas-vindas'
  const seletorArquivo = useRef<HTMLInputElement>(null)

  const [jogoEditado, setJogoEditado] = useState<Jogo | null>(null)
  const [erroCarregar, setErroCarregar] = useState<string | null>(null)
  const [capa, setCapa] = useState<Blob | null>(null)
  const [erroCapa, setErroCapa] = useState<string | null>(null)
  const [processandoCapa, setProcessandoCapa] = useState(false)
  const [nome, setNome] = useState(() => params.get('nome')?.trim() ?? '')
  const [plataforma, setPlataforma] = useState<string | null>(null)
  const [generos, setGeneros] = useState<string[]>([])
  const [situacao, setSituacao] = useState<SituacaoJogo>('Jogando')
  const [erros, setErros] = useState<ErrosFormulario>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmarDuplicado, setConfirmarDuplicado] = useState(false)
  const [exclusao, setExclusao] = useState<{ sessoes: number; registros: number } | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const urlCapa = useObjectUrl(capa)

  useEffect(() => {
    if (!jogoId) return

    let ativo = true

    servico
      .obterJogo(jogoId)
      .then((jogo) => {
        if (!ativo) return

        if (!jogo) {
          setErroCarregar('Este jogo não existe mais.')
          return
        }

        setJogoEditado(jogo)
        setNome(jogo.nome)
        setPlataforma(jogo.plataforma)
        setGeneros(jogo.generos)
        setSituacao(jogo.situacao)
        setCapa(jogo.capa)
      })
      .catch(() => {
        if (ativo) setErroCarregar('Não foi possível abrir este jogo.')
      })

    return () => {
      ativo = false
    }
  }, [jogoId, servico])

  // Valores fora das listas (de versões antigas ou importados) continuam visíveis.
  const plataformas = useMemo(
    () =>
      plataforma && !(PLATAFORMAS as readonly string[]).includes(plataforma)
        ? [...PLATAFORMAS, plataforma]
        : [...PLATAFORMAS],
    [plataforma],
  )
  const opcoesGeneros = useMemo(
    () => [
      ...GENEROS,
      ...(jogoEditado?.generos ?? []).filter(
        (genero) => !(GENEROS as readonly string[]).includes(genero),
      ),
    ],
    [jogoEditado],
  )

  function voltarParaJornada() {
    const indice = window.history.state?.idx

    if (typeof indice === 'number' && indice > 0) navigate(-1)
    else navigate('/jornada', { replace: true })
  }

  function sair() {
    if (jogoEditado) {
      voltarParaJornada()
      return
    }

    navigate(vemDasBoasVindas ? '/boas-vindas' : '/biblioteca')
  }

  async function pedirExclusao() {
    if (!jogoEditado) return

    try {
      setExclusao(await servico.contarDependentesDoJogo(jogoEditado.id))
    } catch {
      setExclusao({ sessoes: 0, registros: 0 })
    }
  }

  async function aoExcluir() {
    if (!jogoEditado) return

    setExcluindo(true)

    try {
      await servico.excluirJogo(jogoEditado.id)
      if (jogoAtualId === jogoEditado.id) limparJogoAtual()
      mostrarAviso(`${jogoEditado.nome} foi apagado.`)
      navigate('/biblioteca', { replace: true })
    } catch {
      setExcluindo(false)
      setExclusao(null)
      setErroGeral('Não foi possível apagar o jogo. Tente novamente.')
    }
  }

  function abrirSeletorDeArquivo() {
    seletorArquivo.current?.click()
  }

  async function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''

    if (!arquivo) return

    setErroCapa(null)

    if (!arquivo.type.startsWith('image/')) {
      setErroCapa('Não foi possível usar essa imagem')
      return
    }

    setProcessandoCapa(true)

    try {
      const reduzida = await reduzirImagemParaBlob(arquivo)
      setCapa(reduzida)
    } catch {
      setErroCapa('Não foi possível usar essa imagem')
    } finally {
      setProcessandoCapa(false)
    }
  }

  function alternarGenero(genero: string) {
    setGeneros((atuais) => {
      if (atuais.includes(genero)) {
        return atuais.filter((item) => item !== genero)
      }

      if (atuais.length >= 3) return atuais

      return [...atuais, genero]
    })
  }

  async function salvarJogo() {
    if (!plataforma) return

    setSalvando(true)
    setErroGeral(null)

    try {
      if (jogoEditado) {
        await servico.atualizarJogo(jogoEditado.id, {
          nome,
          plataforma,
          generos,
          situacao,
          capa,
        })
        mostrarAviso('Jogo atualizado.')
        voltarParaJornada()
        return
      }

      const jogo = await servico.criarJogo({
        nome,
        plataforma,
        generos,
        situacao,
        capa,
      })

      if (!jogoAtualId || vemDasBoasVindas) {
        definirJogoAtual(jogo.id)
      }

      if (vemDasBoasVindas) {
        navigate(`/boas-vindas/pronto/${jogo.id}`, { replace: true })
        return
      }

      navigate('/biblioteca')
    } catch {
      setSalvando(false)
      setConfirmarDuplicado(false)
      setErroGeral('Não foi possível salvar o jogo. Tente novamente.')
    }
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const novosErros: ErrosFormulario = {}

    if (!nome.trim()) {
      novosErros.nome = 'Informe o nome do jogo.'
    }

    if (!plataforma) {
      novosErros.plataforma = 'Escolha uma plataforma.'
    }

    setErros(novosErros)
    setErroGeral(null)

    if (novosErros.nome || novosErros.plataforma || !plataforma) return

    try {
      const jogos = (await servico.listarJogos()).filter(
        (jogo) => jogo.id !== jogoEditado?.id,
      )

      if (existeJogoDuplicado(jogos, nome, plataforma)) {
        setConfirmarDuplicado(true)
        return
      }
    } catch {
      setErroGeral('Não foi possível verificar sua biblioteca. Tente novamente.')
      return
    }

    await salvarJogo()
  }

  if (jogoId && !jogoEditado) {
    return (
      <div className="app-shell app-shell-formulario">
        <main className="app-main formulario-main">
          {erroCarregar ? (
            <div className="estado-vazio">
              <h2>Não foi possível abrir</h2>
              <p>{erroCarregar}</p>
              <button
                type="button"
                className="botao-secundario"
                onClick={() => navigate('/biblioteca', { replace: true })}
              >
                Ir para a Biblioteca
              </button>
            </div>
          ) : (
            <p className="biblioteca-aviso">Carregando o jogo...</p>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell app-shell-formulario">
      <MiniCronometro />
      <main className="app-main formulario-main">
        <div className="formulario-topo">
          <button
            type="button"
            className="botao-voltar"
            onClick={sair}
            aria-label={jogoEditado ? 'Voltar sem salvar' : 'Voltar para a biblioteca'}
          >
            <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <span className="selo-novo">
            {jogoEditado ? (
              <Pencil size={11} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Diamond size={11} strokeWidth={1.75} aria-hidden="true" />
            )}
            {jogoEditado ? 'EDITAR REGISTRO' : 'NOVO REGISTRO'}
          </span>
        </div>

        <h1 className="formulario-titulo">{jogoEditado ? 'Editar jogo' : 'Adicionar jogo'}</h1>
        <p className="formulario-descricao">
          {jogoEditado
            ? 'Corrija o nome, a capa ou os detalhes. Sessões e anotações continuam no lugar.'
            : 'Dê um lar para suas anotações. Você pode editar depois.'}
        </p>

        <form id="form-adicionar-jogo" onSubmit={aoEnviar} noValidate>
          <div className="campo">
            <span className="campo-rotulo">Foto de capa</span>

            <input
              ref={seletorArquivo}
              type="file"
              accept="image/*"
              className="entrada-arquivo"
              onChange={aoEscolherArquivo}
              tabIndex={-1}
              aria-hidden="true"
            />

            {urlCapa ? (
              <div className="capa-preview">
                <img src={urlCapa} alt="Prévia da capa escolhida" />
                <div className="capa-preview-acoes">
                  <button
                    type="button"
                    className="botao-mini"
                    onClick={abrirSeletorDeArquivo}
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    className="botao-mini"
                    onClick={() => setCapa(null)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="capa-vazia"
                onClick={abrirSeletorDeArquivo}
                disabled={processandoCapa}
              >
                <span className="capa-icone" aria-hidden="true">
                  <ImageIcon size={20} strokeWidth={1.75} />
                </span>
                <strong>
                  {processandoCapa
                    ? 'Preparando imagem...'
                    : 'Toque para adicionar uma foto'}
                </strong>
                <span>Print, capa oficial ou uma imagem sua</span>
              </button>
            )}

            {erroCapa && (
              <p className="campo-erro" role="alert">
                {erroCapa}
              </p>
            )}
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="nome-jogo">
              <span>
                Nome do jogo <span className="obrigatorio">*</span>
              </span>
            </label>
            <span className="campo-input">
              <Search size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                id="nome-jogo"
                type="text"
                value={nome}
                onChange={(evento) => {
                  setNome(evento.target.value)
                  if (erros.nome) setErros((atuais) => ({ ...atuais, nome: undefined }))
                }}
                placeholder="Ecos da Torre"
                aria-invalid={Boolean(erros.nome)}
                aria-describedby={erros.nome ? 'erro-nome' : undefined}
              />
            </span>
            {erros.nome && (
              <p className="campo-erro" id="erro-nome" role="alert">
                {erros.nome}
              </p>
            )}
          </div>

          <div className="campo">
            <span className="campo-rotulo">
              <span>
                Plataforma <span className="obrigatorio">*</span>
              </span>
            </span>
            <div className="chips" role="group" aria-label="Plataforma">
              {plataformas.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  className="chip"
                  aria-pressed={plataforma === opcao}
                  onClick={() => {
                    setPlataforma(opcao)
                    if (erros.plataforma) {
                      setErros((atuais) => ({ ...atuais, plataforma: undefined }))
                    }
                  }}
                >
                  {plataforma === opcao && (
                    <Check size={13} strokeWidth={2.25} aria-hidden="true" />
                  )}
                  {opcao}
                </button>
              ))}
            </div>
            {erros.plataforma && (
              <p className="campo-erro" role="alert">
                {erros.plataforma}
              </p>
            )}
          </div>

          <div className="campo">
            <div className="campo-rotulo">
              <span>Gênero</span>
              <span className="contador-generos">{generos.length} de 3</span>
            </div>
            <div className="chips" role="group" aria-label="Gêneros">
              {opcoesGeneros.map((opcao) => {
                const selecionado = generos.includes(opcao)
                const bloqueado = !selecionado && generos.length >= 3

                return (
                  <button
                    key={opcao}
                    type="button"
                    className="chip"
                    aria-pressed={selecionado}
                    disabled={bloqueado}
                    onClick={() => alternarGenero(opcao)}
                  >
                    {selecionado && (
                      <Check size={13} strokeWidth={2.25} aria-hidden="true" />
                    )}
                    {opcao}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="campo">
            <span className="campo-rotulo">Situação</span>
            <div className="chips" role="group" aria-label="Situação">
              {SITUACOES.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  className="chip"
                  aria-pressed={situacao === opcao}
                  onClick={() => setSituacao(opcao)}
                >
                  {situacao === opcao && (
                    <Check size={13} strokeWidth={2.25} aria-hidden="true" />
                  )}
                  {opcao}
                </button>
              ))}
            </div>
          </div>

          {!jogoEditado && (
            <div className="aviso">
              <Info size={18} strokeWidth={1.75} aria-hidden="true" />
              <p>
                Suas sessões, pistas e códigos ficarão organizados no caderno deste
                jogo.
              </p>
            </div>
          )}

          {erroGeral && (
            <p className="campo-erro" role="alert">
              {erroGeral}
            </p>
          )}
        </form>
      </main>

      <div className="form-acoes">
        <button
          type="submit"
          form="form-adicionar-jogo"
          className="botao-primario"
          disabled={salvando || processandoCapa}
        >
          {jogoEditado ? (
            <Check size={18} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
          )}
          {jogoEditado
            ? salvando
              ? 'Salvando...'
              : 'Salvar alterações'
            : salvando
              ? 'Adicionando...'
              : 'Adicionar à biblioteca'}
        </button>
        {jogoEditado ? (
          <button
            type="button"
            className="botao-perigo-texto"
            onClick={() => void pedirExclusao()}
            disabled={salvando}
          >
            <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
            Apagar jogo
          </button>
        ) : (
          <button type="button" className="botao-cancelar" onClick={sair}>
            Cancelar
          </button>
        )}
      </div>

      {exclusao && jogoEditado && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-apagar-jogo"
          >
            <h2 id="titulo-apagar-jogo">Apagar {jogoEditado.nome}?</h2>
            <p>
              {exclusao.sessoes === 0 && exclusao.registros === 0
                ? 'O jogo sai da sua biblioteca. Não dá para desfazer.'
                : `Também serão apagadas ${exclusao.sessoes} ${
                    exclusao.sessoes === 1 ? 'sessão' : 'sessões'
                  } e ${exclusao.registros} ${
                    exclusao.registros === 1 ? 'anotação' : 'anotações'
                  }. Não dá para desfazer.`}
            </p>
            <div className="modal-acoes">
              <button
                type="button"
                className="botao-secundario"
                onClick={() => setExclusao(null)}
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

      {confirmarDuplicado && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-duplicado"
          >
            <h2 id="titulo-duplicado">Jogo já cadastrado</h2>
            <p>
              Já existe um jogo com esse nome e plataforma na sua biblioteca.
              Deseja adicionar mesmo assim?
            </p>
            <div className="modal-acoes">
              <button
                type="button"
                className="botao-secundario"
                onClick={() => setConfirmarDuplicado(false)}
                autoFocus
              >
                Cancelar
              </button>
              <button
                type="button"
                className="botao-primario compacto"
                onClick={() => void salvarJogo()}
                disabled={salvando}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

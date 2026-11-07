import { NotebookPen, Search, SearchX, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CabecalhoMarca } from '../components/CabecalhoMarca'
import { ICONE_POR_TIPO } from '../components/iconesTipo'
import { TIPOS_REGISTRO, type TipoRegistro } from '../constantes'
import { useServicoSavePoint, useVersaoDados } from '../contexts/ServicoContext'
import type { Jogo, Registro, Sessao } from '../data'
import { normalizarTexto } from '../dominio/biblioteca'
import {
  destacarTrecho,
  ESPERA_BUSCA_MS,
  RECENTES_NA_DICA,
  RESULTADOS_POR_PAGINA,
} from '../dominio/busca'

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const FORMATADOR_HORA = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

function lerTipos(valor: string | null): TipoRegistro[] {
  if (!valor) return []
  return valor
    .split(',')
    .filter((tipo): tipo is TipoRegistro => (TIPOS_REGISTRO as readonly string[]).includes(tipo))
}

type Resultado = {
  registros: Registro[]
  haMais: boolean
  existemAnotacoes: boolean
}

export function Buscar() {
  const servico = useServicoSavePoint()
  const versao = useVersaoDados()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const campoRef = useRef<HTMLInputElement>(null)

  // A busca vive no endereço: ao abrir uma nota e voltar, o texto e os filtros continuam.
  const termo = params.get('q') ?? ''
  const jogoFiltro = params.get('jogo') ?? ''
  const tiposFiltro = useMemo(() => lerTipos(params.get('tipos')), [params])
  const chaveTipos = tiposFiltro.join(',')

  const [texto, setTexto] = useState(termo)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [sessoes, setSessoes] = useState<Map<string, Sessao>>(new Map())
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const chaveBusca = `${termo}|${jogoFiltro}|${chaveTipos}`
  const [paginacao, setPaginacao] = useState({ chave: chaveBusca, pagina: 1 })
  const pagina = paginacao.chave === chaveBusca ? paginacao.pagina : 1

  const temCriterio = Boolean(termo || jogoFiltro || tiposFiltro.length > 0)
  const termoNormalizado = normalizarTexto(termo)

  function atualizarParams(mudancas: Record<string, string>) {
    const novos = new URLSearchParams(params)

    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(chave, valor)
      else novos.delete(chave)
    }

    setParams(novos, { replace: true })
  }

  useEffect(() => {
    campoRef.current?.focus()
  }, [])

  // Espera a pessoa parar de digitar antes de buscar.
  useEffect(() => {
    const limpo = texto.trim()
    if (limpo === termo) return

    const espera = window.setTimeout(() => atualizarParams({ q: limpo }), ESPERA_BUSCA_MS)
    return () => window.clearTimeout(espera)
  }, [texto, termo])

  useEffect(() => {
    let ativo = true
    const limite = temCriterio ? pagina * RESULTADOS_POR_PAGINA : RECENTES_NA_DICA

    setCarregando(true)
    setErro(null)

    Promise.all([
      servico.buscarRegistros(termo, jogoFiltro, tiposFiltro, limite + 1),
      servico.buscarRegistros('', undefined, undefined, 1),
      servico.listarJogos(),
      servico.listarTodasSessoes(),
    ])
      .then(([encontrados, algum, listaJogos, listaSessoes]) => {
        if (!ativo) return

        setJogos([...listaJogos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
        setSessoes(new Map(listaSessoes.map((sessao) => [sessao.id, sessao])))
        setResultado({
          registros: encontrados.slice(0, limite),
          haMais: temCriterio && encontrados.length > limite,
          existemAnotacoes: algum.length > 0,
        })
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível buscar nas suas anotações. Tente de novo.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [servico, versao, termo, jogoFiltro, chaveTipos, pagina, temCriterio])

  const nomesDosJogos = useMemo(
    () => new Map(jogos.map((jogo) => [jogo.id, jogo.nome])),
    [jogos],
  )

  function alternarTipo(tipo: TipoRegistro) {
    const novos = tiposFiltro.includes(tipo)
      ? tiposFiltro.filter((item) => item !== tipo)
      : [...tiposFiltro, tipo]

    atualizarParams({ tipos: TIPOS_REGISTRO.filter((t) => novos.includes(t)).join(',') })
  }

  function limparTudo() {
    setTexto('')
    setParams(new URLSearchParams(), { replace: true })
    campoRef.current?.focus()
  }

  const registros = resultado?.registros ?? []
  const semNenhumaAnotacao = resultado !== null && !resultado.existemAnotacoes

  return (
    <section className="page buscar" aria-label="Buscar">
      <CabecalhoMarca />

      <h1 className="biblioteca-titulo">Encontre uma anotação</h1>

      <form
        className="busca-form"
        role="search"
        onSubmit={(evento) => {
          evento.preventDefault()
          atualizarParams({ q: texto.trim() })
          campoRef.current?.blur()
        }}
      >
        <label className="campo-input busca-campo">
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          <input
            ref={campoRef}
            type="search"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Palavra, frase ou #tag"
            aria-label="Buscar nas anotações"
            enterKeyHint="search"
            autoComplete="off"
          />
          {texto && (
            <button
              type="button"
              className="busca-limpar"
              onClick={() => {
                setTexto('')
                atualizarParams({ q: '' })
                campoRef.current?.focus()
              }}
              aria-label="Limpar busca"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </label>
      </form>

      {jogos.length > 1 && (
        <div className="filtros busca-filtro-jogos" role="group" aria-label="Filtrar por jogo">
          <button
            type="button"
            className="filtro"
            aria-pressed={!jogoFiltro}
            onClick={() => atualizarParams({ jogo: '' })}
          >
            Todos os jogos
          </button>
          {jogos.map((jogo) => (
            <button
              key={jogo.id}
              type="button"
              className="filtro"
              aria-pressed={jogoFiltro === jogo.id}
              onClick={() => atualizarParams({ jogo: jogoFiltro === jogo.id ? '' : jogo.id })}
            >
              {jogo.nome}
            </button>
          ))}
        </div>
      )}

      <div className="busca-tipos">
        <div className="campo-rotulo">
          <span>Tipo</span>
          {tiposFiltro.length > 0 && (
            <button
              type="button"
              className="botao-texto"
              onClick={() => atualizarParams({ tipos: '' })}
            >
              Limpar tipos
            </button>
          )}
        </div>
        <div className="chips" role="group" aria-label="Filtrar por tipo">
          {TIPOS_REGISTRO.map((tipo) => {
            const Icone = ICONE_POR_TIPO[tipo]
            return (
              <button
                key={tipo}
                type="button"
                className="chip"
                aria-pressed={tiposFiltro.includes(tipo)}
                onClick={() => alternarTipo(tipo)}
              >
                <Icone size={13} strokeWidth={1.75} aria-hidden="true" />
                {tipo}
              </button>
            )
          })}
        </div>
      </div>

      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}

      {!erro && semNenhumaAnotacao && (
        <div className="estado-vazio busca-estado">
          <span className="estado-vazio-icone" aria-hidden="true">
            <NotebookPen size={24} strokeWidth={1.75} />
          </span>
          <h2>Nenhuma anotação ainda</h2>
          <p>
            Inicie uma sessão na Jornada e registre o que descobrir. Tudo o que
            você anotar aparece aqui para buscar depois.
          </p>
          <Link className="botao-secundario" to="/jornada">
            Ir para a Jornada
          </Link>
        </div>
      )}

      {!erro && resultado && !semNenhumaAnotacao && (
        <>
          <p className="busca-contagem" aria-live="polite">
            {!temCriterio
              ? 'Anotações recentes'
              : registros.length === 0
                ? ''
                : `${registros.length}${resultado.haMais ? '+' : ''} ${
                    registros.length === 1 ? 'resultado' : 'resultados'
                  }`}
          </p>

          {temCriterio && registros.length === 0 && !carregando && (
            <div className="estado-vazio busca-estado">
              <span className="estado-vazio-icone" aria-hidden="true">
                <SearchX size={24} strokeWidth={1.75} />
              </span>
              <h2>Nada encontrado</h2>
              <p>
                Tente outra palavra, procure por uma tag como #lore ou tire
                alguns filtros.
              </p>
              <button type="button" className="botao-secundario" onClick={limparTudo}>
                Limpar busca e filtros
              </button>
            </div>
          )}

          {registros.length > 0 && (
            <ul className="busca-resultados">
              {registros.map((registro) => {
                const Icone = ICONE_POR_TIPO[registro.tipo]
                const trecho = destacarTrecho(registro.texto, termoNormalizado)
                const sessao = sessoes.get(registro.sessaoId)

                return (
                  <li key={registro.id}>
                    <button
                      type="button"
                      className="busca-resultado"
                      onClick={() => navigate(`/jornada/sessao/${registro.sessaoId}/notas`)}
                    >
                      <span className="busca-resultado-topo">
                        <span className="busca-resultado-tipo">
                          <Icone size={14} strokeWidth={1.75} aria-hidden="true" />
                          {registro.tipo}
                        </span>
                        <time dateTime={registro.dataHora.toISOString()}>
                          {FORMATADOR_DATA.format(registro.dataHora)} ·{' '}
                          {FORMATADOR_HORA.format(registro.dataHora)}
                        </time>
                      </span>

                      <span className="busca-trecho">
                        {trecho.antes}
                        {trecho.destaque && <mark>{trecho.destaque}</mark>}
                        {trecho.depois}
                      </span>

                      {registro.tags.length > 0 && (
                        <span className="notas-tags">
                          {registro.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`nota-tag${
                                termoNormalizado.startsWith('#') &&
                                normalizarTexto(tag).includes(termoNormalizado)
                                  ? ' nota-tag-destaque'
                                  : ''
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}

                      <span className="busca-resultado-meta">
                        {nomesDosJogos.get(registro.jogoId) ?? 'Jogo'}
                        {sessao ? ` · Sessão ${sessao.numero}` : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {!temCriterio && registros.length > 0 && (
            <p className="busca-dica">
              Busque por palavra ou por tag, como #lore. Maiúsculas e acentos não
              fazem diferença.
            </p>
          )}

          {resultado.haMais && (
            <button
              type="button"
              className="botao-secundario busca-mais"
              onClick={() => setPaginacao({ chave: chaveBusca, pagina: pagina + 1 })}
              disabled={carregando}
            >
              {carregando ? 'Carregando...' : 'Mostrar mais'}
            </button>
          )}
        </>
      )}

      {!resultado && carregando && <p className="biblioteca-aviso">Buscando...</p>}
    </section>
  )
}

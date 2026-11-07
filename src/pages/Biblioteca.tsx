import {
  BookOpen,
  Clock,
  Gamepad2,
  LibraryBig,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CabecalhoMarca } from '../components/CabecalhoMarca'
import { CartaoEnvioLocal } from '../components/CartaoEnvioLocal'
import { JogoCapa } from '../components/JogoCapa'
import { useAviso } from '../contexts/AvisoContext'
import { useJogoAtual } from '../contexts/JogoAtualContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import {
  classeDaSituacao,
  buscarJogos,
  contarJogosPorSituacao,
  escolherJogoEmDestaque,
  FILTROS_BIBLIOTECA,
  filtrarJogos,
  formatarHoras,
  formatarSessoes,
  formatarTempoRelativo,
} from '../dominio/biblioteca'
import type { FiltroBiblioteca } from '../dominio/biblioteca'
import { boasVindasJaVistas } from '../estado/boasVindas'
import { useBiblioteca } from '../hooks/useBiblioteca'
import type { Jogo } from '../data'

export function Biblioteca() {
  const { itens, carregando, erro } = useBiblioteca()
  const { jogoAtualId, definirJogoAtual, limparJogoAtual } = useJogoAtual()
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<FiltroBiblioteca>('Todos')
  const [busca, setBusca] = useState('')
  const servico = useServicoSavePoint()
  const { mostrarAviso } = useAviso()
  const [menuJogoId, setMenuJogoId] = useState<string | null>(null)
  const [exclusao, setExclusao] = useState<
    { jogo: Jogo; sessoes: number; registros: number } | null
  >(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  // Fecha o menu de opções com Esc.
  useEffect(() => {
    if (!menuJogoId) return

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setMenuJogoId(null)
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [menuJogoId])

  const jogos = useMemo(() => itens.map((item) => item.jogo), [itens])

  // Primeira abertura, sem nenhum jogo: mostra as boas-vindas uma única vez.
  useEffect(() => {
    if (carregando || erro || jogos.length > 0) return
    if (!boasVindasJaVistas()) navigate('/boas-vindas', { replace: true })
  }, [carregando, erro, jogos.length, navigate])

  useEffect(() => {
    if (carregando || erro || !jogoAtualId) return
    if (!jogos.some((jogo) => jogo.id === jogoAtualId)) {
      limparJogoAtual()
    }
  }, [carregando, erro, jogos, jogoAtualId, limparJogoAtual])

  const estatisticasPorJogo = useMemo(
    () => new Map(itens.map((item) => [item.jogo.id, item.estatisticas])),
    [itens],
  )

  const destaque = escolherJogoEmDestaque(jogos, jogoAtualId)
  // A busca vem primeiro: as contagens dos filtros mostram quantos jogos há em cada
  // situação entre os que combinam com o que foi digitado.
  const buscaAtiva = busca.trim().length > 0
  const jogosBuscados = buscarJogos(jogos, busca)
  const contagens = contarJogosPorSituacao(jogosBuscados)
  const jogosFiltrados = filtrarJogos(jogosBuscados, filtro)

  async function pedirExclusao(jogo: Jogo) {
    setMenuJogoId(null)
    setErroExclusao(null)

    try {
      setExclusao({ jogo, ...(await servico.contarDependentesDoJogo(jogo.id)) })
    } catch {
      setExclusao({ jogo, sessoes: 0, registros: 0 })
    }
  }

  async function confirmarExclusao() {
    if (!exclusao) return

    setExcluindo(true)
    setErroExclusao(null)

    try {
      await servico.excluirJogo(exclusao.jogo.id)
      if (jogoAtualId === exclusao.jogo.id) limparJogoAtual()
      mostrarAviso(`${exclusao.jogo.nome} foi excluído.`)
      setExclusao(null)
    } catch {
      setErroExclusao('Não foi possível excluir o jogo. Tente novamente.')
    } finally {
      setExcluindo(false)
    }
  }

  function abrirJogo(jogo: Jogo) {
    definirJogoAtual(jogo.id)
    navigate('/jornada')
  }

  return (
    <section className="page biblioteca" aria-label="Biblioteca">
      <CabecalhoMarca />

      <p className="saudacao">
        <span className="saudacao-dot" aria-hidden="true" />
        BOM TE VER!
      </p>
      <h1 className="biblioteca-titulo">O que vamos jogar hoje?</h1>

      <CartaoEnvioLocal compacto />

      {carregando && <p className="biblioteca-aviso">Carregando sua biblioteca...</p>}

      {erro && (
        <p className="biblioteca-aviso" role="alert">
          {erro}
        </p>
      )}

      {!carregando && !erro && jogos.length === 0 && (
        <div className="estado-vazio">
          <span className="estado-vazio-icone" aria-hidden="true">
            <LibraryBig size={26} strokeWidth={1.5} />
          </span>
          <h2>Sua biblioteca está vazia</h2>
          <p>
            Adicione o primeiro jogo para começar seu caderno e guardar suas
            sessões em um só lugar.
          </p>
          <button
            type="button"
            className="botao-primario"
            onClick={() => navigate('/adicionar-jogo')}
          >
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            Adicionar meu primeiro jogo
          </button>
        </div>
      )}

      {destaque && (
        <article className="destaque" aria-label={`Jogo em destaque: ${destaque.nome}`}>
          <div className="destaque-imagem">
            <JogoCapa capa={destaque.capa} alt={`Capa de ${destaque.nome}`} />
            <div className="destaque-pilulas">
              <span className={`selo-situacao ${classeDaSituacao(destaque.situacao)}`}>
                <span className="selo-ponto" aria-hidden="true" />
                {destaque.situacao === 'Jogando' ? 'Jogando agora' : destaque.situacao}
              </span>
              <span className="selo-tempo">
                <Clock size={12} strokeWidth={1.5} aria-hidden="true" />
                {formatarTempoRelativo(destaque.atualizadoEm)}
              </span>
            </div>
          </div>

          <div className="destaque-corpo">
            <p className="destaque-plataforma">
              <span>{destaque.plataforma}</span>
              {destaque.generos.length > 0 && (
                <span className="destaque-generos">{destaque.generos.join(' · ')}</span>
              )}
            </p>
            <h2 className="destaque-nome">{destaque.nome}</h2>

            <div className="destaque-rodape">
              <span className="meta-pill">
                <Clock size={13} strokeWidth={1.5} aria-hidden="true" />
                {formatarHoras(
                  estatisticasPorJogo.get(destaque.id)?.duracaoTotalMs ?? 0,
                )}
              </span>
              <span className="meta-pill">
                <BookOpen size={13} strokeWidth={1.5} aria-hidden="true" />
                {formatarSessoes(
                  estatisticasPorJogo.get(destaque.id)?.totalSessoes ?? 0,
                )}
              </span>
              <button
                type="button"
                className="botao-retomar"
                onClick={() => abrirJogo(destaque)}
              >
                <Play size={14} strokeWidth={2} aria-hidden="true" />
                Retomar
              </button>
            </div>
          </div>
        </article>
      )}

      {jogos.length > 0 && (
        <>
          <h2 className="secao-titulo">Filtrar jogos</h2>

          <div className="biblioteca-busca" role="search">
            <Search size={16} strokeWidth={1.75} aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar jogo"
              aria-label="Buscar jogo na biblioteca"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {busca && (
              <button
                type="button"
                className="biblioteca-busca-limpar"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="filtros" role="group" aria-label="Filtrar jogos por situação">
            {FILTROS_BIBLIOTECA.map((opcao) => (
              <button
                key={opcao}
                type="button"
                className="filtro"
                aria-pressed={filtro === opcao}
                onClick={() => setFiltro(opcao)}
              >
                {opcao}
                <span className="filtro-contagem">{contagens[opcao]}</span>
              </button>
            ))}
          </div>

          {jogosFiltrados.length === 0 ? (
            <div className="filtro-vazio">
              <Gamepad2 size={22} strokeWidth={1.5} aria-hidden="true" />
              <p>
                {buscaAtiva
                  ? `Nenhum jogo encontrado para “${busca.trim()}”${
                      filtro === 'Todos' ? '' : ` em “${filtro}”`
                    }.`
                  : `Nenhum jogo em “${filtro}” por enquanto.`}
              </p>
            </div>
          ) : (
            <div className="grade-jogos">
              {jogosFiltrados.map((jogo) => {
                const estatisticas = estatisticasPorJogo.get(jogo.id)
                const menuAberto = menuJogoId === jogo.id

                return (
                  <div key={jogo.id} className="jogo-card-item">
                  <button
                    type="button"
                    className="jogo-card"
                    onClick={() => abrirJogo(jogo)}
                    aria-label={`Abrir ${jogo.nome}`}
                  >
                    <span className="jogo-card-capa">
                      <JogoCapa capa={jogo.capa} alt="" tamanhoIcone={26} />
                      <span className={`chip-situacao ${classeDaSituacao(jogo.situacao)}`}>
                        {jogo.situacao}
                      </span>
                    </span>

                    <span className="jogo-card-corpo">
                      {jogo.generos.length > 0 && (
                        <div className="jogo-card-info">
                          <span className="jogo-card-plataforma">{jogo.plataforma}</span>
                          <span className="jogo-card-generos">{jogo.generos.join(' · ')}</span>
                        </div>
                      )}
                      <span className="jogo-card-nome">{jogo.nome}</span>
                      <span className="jogo-card-meta">
                        <span>
                          <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                          {formatarHoras(estatisticas?.duracaoTotalMs ?? 0)}
                        </span>
                        <span>
                          <BookOpen size={13} strokeWidth={1.75} aria-hidden="true" />
                          {formatarSessoes(estatisticas?.totalSessoes ?? 0)}
                        </span>
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="jogo-card-opcoes"
                    onClick={() => setMenuJogoId(menuAberto ? null : jogo.id)}
                    aria-label={`Opções de ${jogo.nome}`}
                    aria-haspopup="menu"
                    aria-expanded={menuAberto}
                  >
                    <MoreVertical size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>

                  {menuAberto && (
                    <>
                      <div
                        className="jogo-card-menu-fundo"
                        onClick={() => setMenuJogoId(null)}
                        aria-hidden="true"
                      />
                      <div className="jogo-card-menu" role="menu" aria-label={`Opções de ${jogo.nome}`}>
                        <button
                          type="button"
                          role="menuitem"
                          className="jogo-card-menu-item"
                          onClick={() => navigate(`/jogo/${jogo.id}/editar`)}
                          autoFocus
                        >
                          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
                          Editar
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="jogo-card-menu-item jogo-card-menu-perigo"
                          onClick={() => void pedirExclusao(jogo)}
                        >
                          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {!carregando && !erro && jogos.length > 0 && (
        <button
          type="button"
          className="fab"
          onClick={() => navigate('/adicionar-jogo')}
          aria-label="Adicionar jogo"
        >
          <Plus size={26} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}

      {exclusao && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-excluir-jogo"
          >
            <h2 id="titulo-excluir-jogo">Excluir {exclusao.jogo.nome}?</h2>
            <p>
              {exclusao.sessoes === 0 && exclusao.registros === 0
                ? 'O jogo sai da sua biblioteca. Não dá para desfazer.'
                : `Também serão apagadas ${formatarSessoes(exclusao.sessoes)} e ${
                    exclusao.registros
                  } ${exclusao.registros === 1 ? 'anotação' : 'anotações'}. Não dá para desfazer.`}
            </p>
            {erroExclusao && (
              <p className="campo-erro" role="alert">
                {erroExclusao}
              </p>
            )}
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
                onClick={() => void confirmarExclusao()}
                disabled={excluindo}
              >
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

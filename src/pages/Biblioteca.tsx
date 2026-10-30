import {
  BookOpen,
  Clock,
  Gamepad2,
  Gem,
  LibraryBig,
  Play,
  Plus,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JogoCapa } from '../components/JogoCapa'
import { useJogoAtual } from '../contexts/JogoAtualContext'
import {
  classeDaSituacao,
  contarJogosPorSituacao,
  escolherJogoEmDestaque,
  FILTROS_BIBLIOTECA,
  filtrarJogos,
  formatarHoras,
  formatarSessoes,
  formatarTempoRelativo,
} from '../dominio/biblioteca'
import type { FiltroBiblioteca } from '../dominio/biblioteca'
import { useBiblioteca } from '../hooks/useBiblioteca'
import type { Jogo } from '../data'

export function Biblioteca() {
  const { itens, carregando, erro } = useBiblioteca()
  const { jogoAtualId, definirJogoAtual, limparJogoAtual } = useJogoAtual()
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<FiltroBiblioteca>('Todos')

  const jogos = useMemo(() => itens.map((item) => item.jogo), [itens])

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
  const contagens = contarJogosPorSituacao(jogos)
  const jogosFiltrados = filtrarJogos(jogos, filtro)

  function abrirJogo(jogo: Jogo) {
    definirJogoAtual(jogo.id)
    navigate('/jornada')
  }

  return (
    <section className="page biblioteca" aria-label="Biblioteca">
      <header className="marca">
        <span className="marca-logo" aria-hidden="true">
          <Gem size={20} strokeWidth={1.75} />
        </span>
        <span>
          <span className="marca-nome">SavePoint</span>
          <span className="marca-sub">Gaming journal</span>
        </span>
      </header>

      <p className="saudacao">Bom te ver!</p>
      <h1 className="biblioteca-titulo">O que vamos jogar hoje?</h1>

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
          <div className="destaque-capa">
            <JogoCapa capa={destaque.capa} alt={`Capa de ${destaque.nome}`} tamanhoIcone={40} />
            <div className="destaque-selos">
              <span className={`selo-status ${classeDaSituacao(destaque.situacao)}`}>
                <span className="selo-ponto" aria-hidden="true" />
                {destaque.situacao === 'Jogando' ? 'Jogando agora' : destaque.situacao}
              </span>
              <span className="selo-tempo">
                <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
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
                <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                {formatarHoras(
                  estatisticasPorJogo.get(destaque.id)?.duracaoTotalMs ?? 0,
                )}
              </span>
              <span className="meta-pill">
                <BookOpen size={14} strokeWidth={1.75} aria-hidden="true" />
                {formatarSessoes(
                  estatisticasPorJogo.get(destaque.id)?.totalSessoes ?? 0,
                )}
              </span>
              <button
                type="button"
                className="botao-retomar"
                onClick={() => abrirJogo(destaque)}
              >
                <Play size={15} strokeWidth={2} aria-hidden="true" />
                Retomar
              </button>
            </div>
          </div>
        </article>
      )}

      {jogos.length > 0 && (
        <>
          <h2 className="secao-titulo">Filtrar jogos</h2>

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
              <p>Nenhum jogo em “{filtro}” por enquanto.</p>
            </div>
          ) : (
            <div className="grade-jogos">
              {jogosFiltrados.map((jogo) => {
                const estatisticas = estatisticasPorJogo.get(jogo.id)

                return (
                  <button
                    key={jogo.id}
                    type="button"
                    className="jogo-card"
                    onClick={() => abrirJogo(jogo)}
                    aria-label={`Abrir ${jogo.nome}`}
                  >
                    <span className="jogo-card-capa">
                      <JogoCapa capa={jogo.capa} alt="" tamanhoIcone={26} />
                      <span className="chip-plataforma">{jogo.plataforma}</span>
                      <span className={`chip-situacao ${classeDaSituacao(jogo.situacao)}`}>
                        {jogo.situacao}
                      </span>
                    </span>

                    <span className="jogo-card-corpo">
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
    </section>
  )
}

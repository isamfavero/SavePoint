import { BookOpen, ChartLine, Clock, Pause, Play, Square } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Cronometro } from '../components/Cronometro'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import {
  classeDaSituacao,
  formatarHoras,
  formatarSessoes,
} from '../dominio/biblioteca'
import { salvarInstanteEncerramento } from '../estado/encerramento'
import { useJogoAtualDetalhe } from '../hooks/useJogoAtualDetalhe'
import { useSessoesDoJogo } from '../hooks/useSessoesDoJogo'

type AcaoEmAndamento = 'iniciar' | 'pausar' | 'retomar' | null

function mensagemDoErro(erro: unknown, padrao: string): string {
  return erro instanceof Error && erro.message ? erro.message : padrao
}

export function Jornada() {
  const { jogo, carregando, erro } = useJogoAtualDetalhe()
  const {
    sessao,
    jogo: jogoDaSessao,
    duracaoMs,
    pausada,
    iniciarSessao,
    pausarSessao,
    retomarSessao,
  } = useSessaoAtiva()
  const {
    estatisticas,
    tempoTotalMs,
    carregando: carregandoSessoes,
    erro: erroSessoes,
  } = useSessoesDoJogo(jogo?.id ?? null)
  const navigate = useNavigate()
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<AcaoEmAndamento>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)

  const sessaoDoJogoAtual =
    sessao && jogo && sessao.jogoId === jogo.id ? sessao : null
  const sessaoEmOutroJogo =
    sessao && jogo && sessao.jogoId !== jogo.id ? sessao : null

  async function aoIniciarSessao() {
    if (!jogo) return

    setAcaoEmAndamento('iniciar')
    setErroAcao(null)

    try {
      await iniciarSessao(jogo.id)
    } catch (falha) {
      setErroAcao(mensagemDoErro(falha, 'Não foi possível iniciar a sessão.'))
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  async function aoAlternarPausa() {
    if (!sessaoDoJogoAtual) return

    const acao = pausada ? 'retomar' : 'pausar'
    setAcaoEmAndamento(acao)
    setErroAcao(null)

    try {
      if (pausada) {
        await retomarSessao()
      } else {
        await pausarSessao()
      }
    } catch (falha) {
      setErroAcao(
        mensagemDoErro(
          falha,
          pausada ? 'Não foi possível retomar a sessão.' : 'Não foi possível pausar a sessão.',
        ),
      )
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  function aoEncerrarSessao() {
    if (!sessaoDoJogoAtual) return

    salvarInstanteEncerramento(
      sessaoDoJogoAtual.id,
      sessaoDoJogoAtual.pausadoEm ?? new Date(),
    )
    navigate('/encerrar-sessao')
  }

  return (
    <section className="page" aria-label="Jornada">
      <header className="page-header">
        <span className="page-icon" aria-hidden="true">
          <ChartLine size={22} strokeWidth={1.75} />
        </span>
        <p className="page-kicker">SavePoint</p>
        <h1 className="page-title">Jornada</h1>
        <p className="page-description">
          Acompanhe o jogo atual e o tempo que você já dedicou a ele.
        </p>
      </header>

      {carregando && <p className="biblioteca-aviso">Carregando o jogo atual...</p>}

      {erro && (
        <p className="biblioteca-aviso" role="alert">
          {erro}
        </p>
      )}

      {!carregando && !erro && jogo && (
        <>
          <div className="jornada-atual">
            <span className="jornada-rotulo">Jogo atual</span>
            <h2 className="jornada-nome">{jogo.nome}</h2>
            <p className="jornada-info">
              {jogo.plataforma}
              <span className={`chip-situacao-inline ${classeDaSituacao(jogo.situacao)}`}>
                {jogo.situacao}
              </span>
            </p>

            <div className="jornada-resumo">
              <span className="meta-pill">
                <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                {carregandoSessoes ? '—' : formatarHoras(tempoTotalMs)}
              </span>
              <span className="meta-pill">
                <BookOpen size={14} strokeWidth={1.75} aria-hidden="true" />
                {carregandoSessoes
                  ? '—'
                  : formatarSessoes(estatisticas?.totalSessoes ?? 0)}
              </span>
            </div>
          </div>

          <div
            className={`jornada-sessao${sessaoDoJogoAtual ? ' jornada-sessao-ativa' : ''}`}
          >
            {sessaoDoJogoAtual ? (
              <>
                <Cronometro
                  numero={sessaoDoJogoAtual.numero}
                  duracaoMs={duracaoMs}
                  pausada={pausada}
                />

                <div className="jornada-acoes">
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={aoAlternarPausa}
                    disabled={acaoEmAndamento !== null}
                  >
                    {pausada ? (
                      <Play size={16} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Pause size={16} strokeWidth={2} aria-hidden="true" />
                    )}
                    {acaoEmAndamento === 'pausar'
                      ? 'Pausando...'
                      : acaoEmAndamento === 'retomar'
                        ? 'Retomando...'
                        : pausada
                          ? 'Retomar'
                          : 'Pausar'}
                  </button>

                  <button
                    type="button"
                    className="botao-primario"
                    onClick={aoEncerrarSessao}
                    disabled={acaoEmAndamento !== null}
                  >
                    <Square size={15} strokeWidth={2} aria-hidden="true" />
                    Encerrar
                  </button>
                </div>
              </>
            ) : sessaoEmOutroJogo ? (
              <>
                <p className="jornada-bloqueio">
                  Há uma sessão em andamento em {jogoDaSessao?.nome ?? 'outro jogo'}
                </p>
                <button
                  type="button"
                  className="botao-primario sessao-bloqueada"
                  disabled
                >
                  <Play size={16} strokeWidth={2} aria-hidden="true" />
                  Iniciar sessão
                </button>
              </>
            ) : (
              <>
                <p className="jornada-convite">
                  Pronto para jogar? Inicie uma sessão para acompanhar o tempo.
                </p>
                <button
                  type="button"
                  className="botao-primario"
                  onClick={aoIniciarSessao}
                  disabled={acaoEmAndamento !== null}
                >
                  <Play size={16} strokeWidth={2} aria-hidden="true" />
                  {acaoEmAndamento === 'iniciar' ? 'Iniciando...' : 'Iniciar sessão'}
                </button>
              </>
            )}

            {erroSessoes && (
              <p className="campo-erro" role="alert">
                {erroSessoes}
              </p>
            )}

            {erroAcao && (
              <p className="campo-erro" role="alert">
                {erroAcao}
              </p>
            )}
          </div>
        </>
      )}

      {!carregando && !erro && !jogo && (
        <div className="jornada-atual jornada-sem-jogo">
          <span className="jornada-rotulo">Jogo atual</span>
          <p className="jornada-info">
            Nenhum jogo escolhido ainda. Abra a Biblioteca para selecionar um jogo.
          </p>
          <Link className="botao-secundario" to="/biblioteca">
            Ir para a Biblioteca
          </Link>
        </div>
      )}

      <div className="placeholder-card">
        <span className="placeholder-label">
          <span className="placeholder-dot" aria-hidden="true" />
          Em preparação
        </span>
        <p>
          A trilha, os objetivos e o diário de sessões chegam nas próximas fatias.
        </p>
      </div>
    </section>
  )
}

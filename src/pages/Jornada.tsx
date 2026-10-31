import {
  BookOpen,
  ChevronLeft,
  Clock,
  NotebookPen,
  Pause,
  Play,
  Square,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CabecalhoMarca } from '../components/CabecalhoMarca'
import { Cronometro } from '../components/Cronometro'
import { EstatisticasJogo } from '../components/EstatisticasJogo'
import { FabAnotar } from '../components/FabAnotar'
import { JogoCapa } from '../components/JogoCapa'
import { ObjetivosLista } from '../components/ObjetivosLista'
import { SituacaoSelector } from '../components/SituacaoSelector'
import { Tabs } from '../components/Tabs'
import { TrilhaCronologica } from '../components/TrilhaCronologica'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import {
  formatarData,
  formatarHoras,
  formatarSessoes,
} from '../dominio/biblioteca'
import { salvarInstanteEncerramento } from '../estado/encerramento'
import { useJogoAtualDetalhe } from '../hooks/useJogoAtualDetalhe'
import { useSessoesDoJogo } from '../hooks/useSessoesDoJogo'
import type { Registro } from '../data'

type AcaoEmAndamento = 'iniciar' | 'pausar' | 'retomar' | null

function mensagemDoErro(erro: unknown, padrao: string): string {
  return erro instanceof Error && erro.message ? erro.message : padrao
}

const ABAS_JORNADA = [
  { id: 'trilha', label: 'Trilha' },
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'estatisticas', label: 'Estatísticas' },
  { id: 'diario', label: 'Diário' },
]

export function Jornada() {
  const servico = useServicoSavePoint()
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
    sessoes,
  } = useSessoesDoJogo(jogo?.id ?? null)
  const navigate = useNavigate()
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<AcaoEmAndamento>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [horasNaSemana, setHorasNaSemana] = useState(0)
  const [aba, setAba] = useState<'trilha' | 'objetivos' | 'estatisticas' | 'diario'>('trilha')
  const [ultimosResumos, setUltimosResumos] = useState<
    Array<{
      totalAnotacoes: number
      marcos: number
      regioesMapeadas: number
      objetivosConcluidos: number
      tagsUsadas: string[]
    }>
  >([])
  const [totalSessoesEncerradas, setTotalSessoesEncerradas] = useState(0)

  const sessaoDoJogoAtual =
    sessao && jogo && sessao.jogoId === jogo.id ? sessao : null
  const sessaoEmOutroJogo =
    sessao && jogo && sessao.jogoId !== jogo.id ? sessao : null

  const sessoesOrdenadas = [...sessoes].sort((a, b) => b.numero - a.numero)

  const sessoesEncerradas = sessoes.filter((s) => s.fim !== null).sort(
    (a, b) => b.numero - a.numero,
  )

  const registrosPorSessao = registros.reduce<Record<string, Registro[]>>(
    (acc, registro) => {
      acc[registro.sessaoId] = [...(acc[registro.sessaoId] ?? []), registro]
      return acc
    },
    {},
  )

  const objetivos = registros.filter(
    (registro) => registro.tipo === 'Objetivo',
  )

  const sessaoAtivaResumo =
    sessaoDoJogoAtual
      ? { id: sessaoDoJogoAtual.id, numero: sessaoDoJogoAtual.numero }
      : null

  const horasTotais = estatisticas?.horasTotais ?? 0

  useEffect(() => {
    if (!jogo?.id) {
      setRegistros([])
      return
    }

    servico
      .listarRegistrosDoJogo(jogo.id)
      .then((lista) => {
        setRegistros(lista)
      })
      .catch(() => {
        setRegistros([])
      })

    servico
      .calcularHorasNaSemana(jogo.id)
      .then((horas) => {
        setHorasNaSemana(horas)
      })
      .catch(() => {
        setHorasNaSemana(0)
      })

    // Calcular resumos de sessões para o Diário
    // Usar as sessões já obtidas do hook
    const sessoesEncerradasDoHook = sessoes.filter((s) => s.fim !== null)
    const ultimasTres = sessoesEncerradasDoHook.slice(0, 3)
    const resumosPromise = ultimasTres.map((sessao) =>
          servico.resumirSessao(sessao.id),
        )
        Promise.all(resumosPromise).then((resumos) => {
          setUltimosResumos(resumos)
          setTotalSessoesEncerradas(sessoesEncerradasDoHook.length)
        })
  }, [jogo?.id, servico])

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
    <section className="page jornada" aria-label="Jornada">
      <CabecalhoMarca />

      <a
        href="/biblioteca"
        onClick={(evento) => {
          evento.preventDefault()
          navigate('/biblioteca')
        }}
        className="link-voltar"
      >
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        voltar à biblioteca
      </a>

      {carregando && <p className="biblioteca-aviso">Carregando o jogo atual...</p>}

      {erro && (
        <p className="biblioteca-aviso" role="alert">{erro}</p>
      )}

      {!carregando && !erro && jogo && (
        <>
          <div className="jornada-atual">
            <div className="jogo-linha">
              <div className="jogo-miniatura">
                <JogoCapa capa={jogo.capa} alt={`Capa de ${jogo.nome}`} />
              </div>

              <div className="jogo-info">
                <span className="jogo-rotulo">JOGO ATUAL</span>
                <h2 className="jogo-titulo">{jogo.nome}</h2>
                <p className="jogo-info-linha">
                  {jogo.plataforma}
                  <SituacaoSelector jogo={jogo} />
                </p>

                <div className="jornada-resumo">
                  <span className="meta-pill">
                    <Clock size={13} strokeWidth={1.5} aria-hidden="true" />
                    {carregandoSessoes ? '—' : `${formatarHoras(tempoTotalMs)} jogadas`}
                  </span>
                  <span className="meta-pill">
                    <BookOpen size={13} strokeWidth={1.5} aria-hidden="true" />
                    {carregandoSessoes
                      ? '—'
                      : `${formatarSessoes(estatisticas?.totalSessoes ?? 0)} sessões arquivadas`}
                  </span>
                </div>
              </div>
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
              <p className="campo-erro" role="alert">{erroSessoes}</p>
            )}

            {erroAcao && (
              <p className="campo-erro" role="alert">{erroAcao}</p>
            )}
          </div>

          <Tabs
            tabs={ABAS_JORNADA}
            valorInicial="trilha"
            aoMudar={(id: string) => setAba(id as 'trilha' | 'objetivos' | 'estatisticas' | 'diario')}
          />

          {aba === 'trilha' && (
            <TrilhaCronologica
              jogoId={jogo.id}
              sessoes={sessoesOrdenadas}
              registrosPorSessao={registrosPorSessao}
              sessaoAtiva={sessaoDoJogoAtual ?? null}
              horasTotais={horasTotais}
            />
          )}

          {aba === 'objetivos' && (
            <ObjetivosLista
              jogoId={jogo.id}
              objetivos={objetivos}
              sessaoAtiva={sessaoAtivaResumo}
              aoIniciarSessao={aoIniciarSessao}
            />
          )}

          {aba === 'estatisticas' && (
            <EstatisticasJogo
              estatisticas={{
                horasTotais: estatisticas?.horasTotais ?? 0,
                totalSessoes: estatisticas?.totalSessoes ?? 0,
                mediaHorasPorSessao: estatisticas?.mediaHorasPorSessao ?? 0,
                duracaoTotalMs: estatisticas?.duracaoTotalMs ?? 0,
                mediaPorSessaoMs: estatisticas?.mediaPorSessaoMs ?? 0,
                sessoesEmAndamento: estatisticas?.sessoesEmAndamento ?? 0,
              }}
              horasNaSemana={horasNaSemana}
              totalRegistros={registros.length}
            />
          )}

          {aba === 'diario' && (
            <div className="jornada-diario">
              {totalSessoesEncerradas === 0 && (
                <div className="estado-vazio diario-vazio">
                  <span className="estado-vazio-icone" aria-hidden="true">
                    <BookOpen size={32} strokeWidth={1.75} />
                  </span>
                  <h2>Diário de sessões</h2>
                  <p>
                    Ainda não há sessões encerradas. Complete sua primeira sessão
                    para começar a anotar.
                  </p>
                </div>
              )}
              <div className="sessoes-lista">
                {ultimosResumos.map((resumo, index) => {
                  // Obter a sessão do índice
                  const sessaoInfo = sessoesEncerradas[index] || null
                  if (!sessaoInfo) return null
                  const duracao = sessaoInfo.fim
                    ? formatarHoras((sessaoInfo.fim.getTime() - sessaoInfo.inicio.getTime()))
                    : '—'

                  const tagsDisplay =
                    resumo.tagsUsadas.length > 0
                      ? resumo.tagsUsadas.join(', ')
                      : ''

                  return (
                    <div
                      key={index}
                      className="card-sessao"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/jornada/sessao/${sessaoInfo.id}/notas`)}
                    >
                      <div className="card-cabecalho">
                        <span className="card-numero">
                          Sessão {sessaoInfo.numero}
                        </span>
                        <span className="card-data">
                          {formatarData(sessaoInfo.inicio)}
                        </span>
                        <span className="card-duracao">{duracao}</span>
                      </div>

                      <div className="card-conteudo">
                        <p className="card-oQueFiz">
                          {sessaoInfo.oQueFiz || '—'}
                        </p>
                        <p className="card-oOndeParei">
                          {sessaoInfo.ondeParei || '—'}
                        </p>
                        <p className="card-proxPasso">
                          {sessaoInfo.proximoPasso || '—'}
                        </p>
                      </div>

                      <div className="card-meta">
                        <span className="card-anotacoes">
                          {resumo.totalAnotacoes} anota{'cao'}{resumo.totalAnotacoes !== 1 ? 's' : ''}
                        </span>
                        <span className="card-selos">
                          {resumo.marcos > 0 && (
                            <span className="selo">
                              {resumo.marcos} Marco{resumo.marcos !== 1 ? 's' : ''}
                            </span>
                          )}
                          {resumo.regioesMapeadas > 0 && (
                            <span className="selo">
                              {resumo.regioesMapeadas} Região{
                                resumo.regioesMapeadas !== 1 ? 's' : ''
                              } mapeada
                            </span>
                          )}
                          {resumo.objetivosConcluidos > 0 && (
                            <span className="selo">
                              {resumo.objetivosConcluidos} Objetivo{
                                resumo.objetivosConcluidos !== 1 ? 's' : ''
                              } concluido
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="card-tags">
                        {tagsDisplay ? (
                          <span className="tags-texto">{tagsDisplay}</span>
                        ) : (
                          <span className="tags-vazio">—</span>
                        )}
                      </div>

                      {resumo.totalAnotacoes > 0 ? (
                        <button
                          className="botao-mini botao-terciario"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/jornada/sessao/${sessaoInfo.id}/notas`)
                          }}
                        >
                          Abrir notas
                        </button>
                      ) : (
                        <span className="botao-desativado">Sem notas</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {totalSessoesEncerradas > 3 && (
                <div className="ver-todas">
                  <button
                    className="botao-link"
                    onClick={() => {
                      navigate('/jornada/todas-sessoes')
                    }}
                  >
                    Ver todas as {totalSessoesEncerradas} sessões
                  </button>
                </div>
              )}
            </div>
          )}

          {sessao && (
            <Link className="jornada-notas" to={`/jornada/sessao/${sessao.id}/notas`}>
              <span className="jornada-notas-icone" aria-hidden="true">
                <NotebookPen size={19} strokeWidth={1.75} />
              </span>
              <span className="jornada-notas-texto">
                <strong>Notas da sessão atual</strong>
                <small>
                  Sessão {sessao.numero}
                  {jogoDaSessao ? ` · ${jogoDaSessao.nome}` : ''}
                </small>
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          )}

          <FabAnotar jogo={jogo} />
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
    </section>
  )
}

import {
  AlarmClock,
  BookOpen,
  ChevronLeft,
  NotebookPen,
  Play,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CabecalhoMarca } from '../components/CabecalhoMarca'
import { DiarioLista } from '../components/DiarioSessoes'
import { Cronometro } from '../components/Cronometro'
import { EstatisticasJogo } from '../components/EstatisticasJogo'
import { FabAnotar } from '../components/FabAnotar'
import { JogoAtualCard } from '../components/JogoAtualCard'
import { ObjetivosLista } from '../components/ObjetivosLista'
import { Tabs } from '../components/Tabs'
import { TrilhaCronologica } from '../components/TrilhaCronologica'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import { useServicoSavePoint, useVersaoDados } from '../contexts/ServicoContext'
import { LIMITE_SESSAO_LONGA_MS } from '../dominio/dataHora'
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
  const location = useLocation()
  const versao = useVersaoDados()
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<AcaoEmAndamento>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [horasNaSemana, setHorasNaSemana] = useState(0)
  const [aba, setAba] = useState<'trilha' | 'objetivos' | 'estatisticas' | 'diario'>('trilha')

  const sessaoDoJogoAtual =
    sessao && jogo && sessao.jogoId === jogo.id ? sessao : null
  const sessaoEmOutroJogo =
    sessao && jogo && sessao.jogoId !== jogo.id ? sessao : null

  const sessoesOrdenadas = [...sessoes].sort((a, b) => b.numero - a.numero)

  const totalSessoesEncerradas = sessoes.filter((s) => s.fim !== null).length
  const SESSOES_NO_DIARIO = 3

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
  }, [jogo?.id, servico, versao, location.pathname, sessoes])

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
        <div className="cartoes-jornada">
          <JogoAtualCard
            jogo={jogo}
            carregandoSessoes={carregandoSessoes}
            tempoTotalMs={tempoTotalMs}
            totalSessoes={estatisticas?.totalSessoes ?? 0}
          />

          {sessaoDoJogoAtual ? (
            <Cronometro
              numero={sessaoDoJogoAtual.numero}
              duracaoMs={duracaoMs}
              pausada={pausada}
              aoPausarOuRetomar={aoAlternarPausa}
              aoEncerrar={aoEncerrarSessao}
              acaoEmAndamento={acaoEmAndamento}
              estaPausada={pausada}
            />
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
              <Cronometro
                numero={0}
                duracaoMs={0}
                semSessao
                aoIniciar={aoIniciarSessao}
                acaoEmAndamento={acaoEmAndamento}
              />
            </>
          )}

          {sessaoDoJogoAtual &&
            Date.now() - sessaoDoJogoAtual.inicio.getTime() > LIMITE_SESSAO_LONGA_MS && (
              <div className="aviso aviso-sessao-longa" role="status">
                <AlarmClock size={18} strokeWidth={1.75} aria-hidden="true" />
                <p>
                  Esta sessão está aberta há mais de 6 horas. Esqueceu de encerrar?{' '}
                  <Link to={`/jornada/sessao/${sessaoDoJogoAtual.id}/editar`}>
                    Corrigir o horário
                  </Link>
                </p>
              </div>
            )}

          {erroSessoes && (
            <p className="campo-erro" role="alert">{erroSessoes}</p>
          )}

          {erroAcao && (
            <p className="campo-erro" role="alert">{erroAcao}</p>
          )}

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
            <section className="jornada-diario" aria-labelledby="titulo-diario">
              <div className="diario-cabecalho">
                <BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />
                <h2 id="titulo-diario">Diário de Sessões</h2>
                {(totalSessoesEncerradas > 0 || sessaoDoJogoAtual) && (
                  <span className="diario-contagem">
                    {totalSessoesEncerradas + (sessaoDoJogoAtual ? 1 : 0)}
                  </span>
                )}
              </div>

              {totalSessoesEncerradas === 0 && !sessaoDoJogoAtual ? (
                <div className="estado-vazio diario-vazio">
                  <span className="estado-vazio-icone" aria-hidden="true">
                    <BookOpen size={24} strokeWidth={1.75} />
                  </span>
                  <h2>Nenhuma sessão ainda</h2>
                  <p>
                    Inicie uma sessão no cronômetro acima. Ao encerrar, o resumo do
                    que você fez aparece aqui.
                  </p>
                </div>
              ) : (
                <DiarioLista
                  sessoes={sessoes}
                  registros={registros}
                  sessaoAtiva={sessaoDoJogoAtual}
                  duracaoAtivaMs={duracaoMs}
                  limite={SESSOES_NO_DIARIO}
                />
              )}

              {totalSessoesEncerradas > SESSOES_NO_DIARIO && (
                <Link className="botao-secundario diario-ver-todas" to="/jornada/todas-sessoes">
                  Ver todas as {totalSessoesEncerradas} sessões
                </Link>
              )}
            </section>
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
        </div>
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

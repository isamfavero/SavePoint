import { ChevronsUpDown, Route, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ICONE_POR_TIPO } from './iconesTipo'

const MAXIMO_REGISTROS_POR_SESSAO = 5
import {
  formatarAcumuladoTrilha,
  formatarDataSessaoTrilha,
  formatarDuracaoCurto,
  formatarDuracaoTrilha,
} from '../dominio/cronometro'
import type { Registro, Sessao } from '../data'

type RegistroTrilha = Registro & {
  sessaoId: string
}

type TrilhaCronologicaProps = {
  jogoId: string
  sessoes: Sessao[]
  registrosPorSessao: Record<string, Registro[]>
  sessaoAtiva: Sessao | null
  horasTotais: number
}

type PontoRotulo = {
  posicao: number
  horas: number
  texto: string
  ehUltimo: boolean
}

export function calcularRotulosTrilha(
  sessoes: Sessao[],
  horasTotais: number,
): PontoRotulo[] {
  const pontos = calcularPontosTrilha(sessoes, horasTotais)
  if (pontos.length === 0) return []

  // Regra de sobreposição: o rótulo "0h" e o rótulo do último ponto SEMPRE aparecem.
  // Se dois rótulos ficarem a menos de 36 px um do outro, esconde-se o anterior,
  // nunca o último.
  const resultado: PontoRotulo[] = [pontos[0]]

  for (let i = 1; i < pontos.length; i++) {
    const ponto = pontos[i]
    const ultimoMantido = resultado[resultado.length - 1]
    const muitoPerto = ponto.posicao - ultimoMantido.posicao < 36

    if (ponto.ehUltimo) {
      if (muitoPerto && resultado.length > 1) {
        resultado.pop()
      }
      resultado.push(ponto)
    } else if (!muitoPerto) {
      resultado.push(ponto)
    }
  }

  return resultado
}

export function calcularPontosTrilha(
  sessoes: Sessao[],
  horasTotais: number,
): PontoRotulo[] {
  const encerradas = sessoes.filter((s) => s.fim !== null)

  if (encerradas.length === 0) return []

  const ordenadas = [...encerradas].sort(
    (a, b) => a.inicio.getTime() - b.inicio.getTime(),
  )

  const pontos: PontoRotulo[] = [
    { posicao: 0, horas: 0, texto: '0h', ehUltimo: false },
  ]

  let acumuladoMs = 0
  const totalMs = horasTotais * 3_600_000

  for (const sessao of ordenadas) {
    acumuladoMs += calcularDuracaoSessao(sessao)

    pontos.push({
      posicao: totalMs > 0 ? Math.min((acumuladoMs / totalMs) * 100, 100) : 100,
      horas: acumuladoMs / 3_600_000,
      texto: formatarDuracaoTrilha(acumuladoMs),
      ehUltimo: false,
    })
  }

  if (pontos.length > 1) {
    const ultimo = pontos[pontos.length - 1]
    ultimo.ehUltimo = true
    ultimo.texto = formatarDuracaoTrilha(totalMs)
    ultimo.horas = horasTotais
  }

  return pontos
}

function calcularDuracaoSessao(sessao: Sessao): number {
  const referencia = sessao.fim ?? new Date()
  const pausaEmAndamento = sessao.pausadoEm
    ? Math.max(0, referencia.getTime() - sessao.pausadoEm.getTime())
    : 0

  return Math.max(
    0,
    referencia.getTime() - sessao.inicio.getTime() - sessao.tempoPausado - pausaEmAndamento,
  )
}

function textoCurto(texto: string): string {
  const linhas = texto.split('\n')

  if (linhas.length <= 2) return texto

  return `${linhas[0]} ${linhas[1]}...`
}

export function trilhasOrdenadas(
  sessaoAtiva: Sessao | null,
  encerradas: Sessao[],
): Sessao[] {
  // A lista recebida pode já conter a sessão ativa; ela entra uma vez só, no topo.
  const ordenadas = encerradas
    .filter((sessao) => sessao.id !== sessaoAtiva?.id)
    .sort((a, b) => b.inicio.getTime() - a.inicio.getTime())

  if (sessaoAtiva) {
    return [sessaoAtiva, ...ordenadas]
  }

  return ordenadas
}

export function TrilhaCronologica({
  sessoes,
  registrosPorSessao,
  sessaoAtiva,
  horasTotais,
}: TrilhaCronologicaProps) {
  const navigate = useNavigate()
  const [expandirAnteriores, setExpandirAnteriores] = useState(false)
  const [expansoes, setExpansoes] = useState<Set<string>>(new Set())

  const todasOrdenadas = trilhasOrdenadas(sessaoAtiva, sessoes)
  const sessaoMaisRecenteId = todasOrdenadas.length > 0 ? todasOrdenadas[0].id : null

  const sessoesFinalizadas = todasOrdenadas.filter((s) => s.fim !== null)
  const ultimaEncerrada = sessoesFinalizadas.length > 0 ? sessoesFinalizadas[0] : null

  const ultimoMarco =
    registrosPorSessao[ultimaEncerrada?.id ?? '']?.filter(
      (r) => r.tipo === 'Marco' || r.tipo === 'Região mapeada',
    )?.[0] ?? null

  const tipoOndeParei: 'marco' | 'sessao' | null =
    ultimoMarco ? 'marco' : ultimaEncerrada ? 'sessao' : null
  const textoOndeParei =
    tipoOndeParei === 'marco'
      ? ultimoMarco?.texto
      : tipoOndeParei === 'sessao'
        ? ultimaEncerrada?.oQueFiz
        : null

  const pontos = calcularPontosTrilha(sessoesFinalizadas, horasTotais)
  const rotulos = calcularRotulosTrilha(sessoesFinalizadas, horasTotais)

  function alternarExpansao(registroId: string) {
    setExpansoes((atuais) => {
      const nova = new Set(atuais)

      if (nova.has(registroId)) {
        nova.delete(registroId)
      } else {
        nova.add(registroId)
      }

      return nova
    })
  }

  if (todasOrdenadas.length === 0) {
    return (
      <section className="trilha" aria-label="Trilha cronológica">
        <div className="trilha-vazia">
          Suas sessões vão aparecer aqui, na trilha do jogo.
        </div>
      </section>
    )
  }

  // Agrupamento:
  // Se o total de sessões for 3 ou menos (ou seja, anteriores tem <= 1 sessão), mostra tudo completo sem agrupar.
  // Se houver mais de 1 sessão anterior (ou seja, total de sessões > 3 e anteriores > 1), agrupa as anteriores.
  const temAgrupamento = todasOrdenadas.length > 3
  const sessoesVisuais = temAgrupamento ? todasOrdenadas.slice(0, 2) : todasOrdenadas
  const sessoesRecolhidas = temAgrupamento ? todasOrdenadas.slice(2) : []

  // Calcular estatísticas das anteriores recolhidas
  // Exemplos: "Sessões 1 & 2 (Primeiras 6h45 · 2 marcos)" ou "Sessões 1 a 4 (...)"
  const numerosAnteriores = sessoesRecolhidas.map((s) => s.numero).sort((a, b) => a - b)
  const textoFaixa =
    numerosAnteriores.length === 2
      ? `Sessões ${numerosAnteriores[0]} & ${numerosAnteriores[1]}`
      : numerosAnteriores.length > 2
        ? `Sessões ${numerosAnteriores[0]} a ${numerosAnteriores[numerosAnteriores.length - 1]}`
        : ''

  const duracaoTotalRecolhidasMs = sessoesRecolhidas.reduce(
    (total, s) => total + calcularDuracaoSessao(s),
    0,
  )
  const duracaoRecolhidasFormatada = formatarDuracaoCurto(duracaoTotalRecolhidasMs)

  const totalMarcosRecolhidas = sessoesRecolhidas.reduce((total, s) => {
    const regs = registrosPorSessao[s.id] ?? []
    return total + regs.filter((r) => r.tipo === 'Marco').length
  }, 0)

  const textoResumoRecolhidas =
    numerosAnteriores.length > 0
      ? `${textoFaixa} (Primeiras ${duracaoRecolhidasFormatada} · ${totalMarcosRecolhidas} ${totalMarcosRecolhidas === 1 ? 'marco' : 'marcos'})`
      : ''

  // Função para calcular horas acumuladas até uma sessão específica
  function obterAcumuladoMs(sessao: Sessao): number {
    return sessoes
      .filter((s) => s.inicio.getTime() <= sessao.inicio.getTime())
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
      .reduce((total, s) => total + calcularDuracaoSessao(s), 0)
  }

  return (
    <section className="trilha" aria-label="Trilha cronológica">
      <div className="trilha-titulo">
        <Route size={18} strokeWidth={1.75} className="trilha-titulo-icone" aria-hidden="true" />
        <h2 className="trilha-titulo-texto">Trilha Cronológica</h2>
      </div>

      <div className="trilha-card">
        <div className="trilha-barra-container">
          <div className="trilha-eixos">
            {rotulos.map((rotulo, indice) => (
              <span
                key={`${indice}-${rotulo.texto}`}
                className={`trilha-eixo${rotulo.ehUltimo ? ' trilha-eixo-ultimo' : ''}`}
                style={{ left: `${rotulo.posicao}%` }}
              >
                {rotulo.texto}
              </span>
            ))}
          </div>

          <div className="trilha-barra-trilho">
            <div className="trilha-barra" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}>
              <div className="trilha-linha" />
            </div>
            {pontos.map((ponto, index) => (
              <div
                key={`${ponto.texto}-${index}`}
                className={`trilha-ponto${ponto.ehUltimo ? ' trilha-ponto-ultimo' : ''}`}
                style={{ left: `${ponto.posicao}%` }}
                aria-label={`Fim da sessão em ${ponto.texto}`}
              />
            ))}
          </div>
        </div>

        <div className="trilha-corpo">
          <div className="trilha-coluna-esquerda" aria-hidden="true">
            <div className="trilha-linha-vertical" />
          </div>

          <div className="trilha-coluna-direita">
            <div className="trilha-item-linha trilha-item-voce">
              <span className="trilha-ponto-aqui" aria-hidden="true" />
              <div className="trilha-voce-esta-aqui">
                <div className="trilha-voce-textos">
                  <span className="trilha-rotulo-aqui">
                    VOCÊ ESTÁ AQUI · {formatarDuracaoTrilha(horasTotais * 3_600_000)}
                  </span>
                  <p className="trilha-ondem-parei">
                    {tipoOndeParei && textoOndeParei
                      ? textoCurto(textoOndeParei)
                      : 'Registre onde parou ao encerrar uma sessão.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="trilha-sessoes">
              {sessoesVisuais.map((sessao) => {
                const duracaoMs = calcularDuracaoSessao(sessao)
                const acumuladoMs = obterAcumuladoMs(sessao)
                const registrosTrilha = registrosPorSessao[sessao.id] ?? []

                return (
                  <SessaoTrilha
                    key={sessao.id}
                    sessao={sessao}
                    duracaoMs={duracaoMs}
                    acumuladoMs={acumuladoMs}
                    registros={registrosTrilha}
                    expansoes={expansoes}
                    aoAlternarExpansao={alternarExpansao}
                    estaAtiva={sessao.id === sessaoAtiva?.id}
                    isMaisRecente={sessao.id === sessaoMaisRecenteId}
                    aoNavegarNotas={() => navigate(`/jornada/sessao/${sessao.id}/notas`)}
                  />
                )
              })}

              {sessoesRecolhidas.length > 0 && (
                <div className="trilha-grupo-anteriores">
                  <button
                    type="button"
                    className="trilha-botao-expandir"
                    onClick={() => setExpandirAnteriores(!expandirAnteriores)}
                  >
                    <div className="trilha-expandir-info">
                      <ChevronsUpDown size={16} strokeWidth={1.75} aria-hidden="true" className="trilha-expandir-icone" />
                      <span className="trilha-expandir-texto">{textoResumoRecolhidas}</span>
                    </div>
                    <span className="trilha-expandir-acao">
                      {expandirAnteriores ? 'RECOLHER' : 'EXPANDIR'}
                    </span>
                  </button>

                  {expandirAnteriores && (
                    <div className="trilha-sessoes-recolhidas-lista">
                      {sessoesRecolhidas.map((sessao) => {
                        const duracaoMs = calcularDuracaoSessao(sessao)
                        const acumuladoMs = obterAcumuladoMs(sessao)
                        const registrosTrilha = registrosPorSessao[sessao.id] ?? []

                        return (
                          <SessaoTrilha
                            key={sessao.id}
                            sessao={sessao}
                            duracaoMs={duracaoMs}
                            acumuladoMs={acumuladoMs}
                            registros={registrosTrilha}
                            expansoes={expansoes}
                            aoAlternarExpansao={alternarExpansao}
                            estaAtiva={sessao.id === sessaoAtiva?.id}
                            isMaisRecente={sessao.id === sessaoMaisRecenteId}
                            aoNavegarNotas={() => navigate(`/jornada/sessao/${sessao.id}/notas`)}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

type SessaoTrilhaProps = {
  sessao: Sessao
  duracaoMs: number
  acumuladoMs: number
  registros: RegistroTrilha[]
  expansoes: Set<string>
  aoAlternarExpansao: (registroId: string) => void
  aoNavegarNotas: () => void
  estaAtiva?: boolean
  isMaisRecente?: boolean
}

function SessaoTrilha({
  sessao,
  duracaoMs,
  acumuladoMs,
  registros,
  expansoes,
  aoAlternarExpansao,
  aoNavegarNotas,
  estaAtiva,
  isMaisRecente = false,
}: SessaoTrilhaProps) {
  const semRegistros = registros.length === 0
  const ehMaisRecente = estaAtiva || isMaisRecente

  // Todos os registros da sessão, na ordem em que foram feitos. Para a trilha
  // não ficar longa demais, mostra os mais recentes e indica quantos faltam.
  const emOrdem = [...registros].sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime())
  const ocultos = Math.max(0, emOrdem.length - MAXIMO_REGISTROS_POR_SESSAO)
  const itensExibidos: RegistroTrilha[] = emOrdem.slice(ocultos)

  const dataTexto = formatarDataSessaoTrilha(sessao.inicio)
  const duracaoTexto = estaAtiva
    ? 'em andamento'
    : formatarDuracaoCurto(duracaoMs)
  const acumuladoTexto = formatarAcumuladoTrilha(acumuladoMs)
  const metaTexto = estaAtiva
    ? `${dataTexto} · em andamento`
    : `${dataTexto} · ${duracaoTexto} (Acum. ${acumuladoTexto})`

  return (
    <article className={`trilha-sessao${estaAtiva ? ' trilha-sessao-ativa-item' : ''}`}>
      <div
        className={`trilha-ponto-sessao${ehMaisRecente ? ' trilha-ponto-sessao-recente' : ''}`}
        aria-hidden="true"
      />
      <div className="trilha-sessao-card">
        <div className="trilha-sessao-topo">
          <button
            type="button"
            className="trilha-sessao-cabecalho"
            onClick={aoNavegarNotas}
            aria-label={`Abrir notas da Sessão ${sessao.numero}`}
          >
            <span className="trilha-sessao-titulo">Sessão {sessao.numero}</span>
            <span className="trilha-sessao-meta">{metaTexto}</span>
          </button>
          <Link
            className="trilha-sessao-ajustes"
            to={`/jornada/sessao/${sessao.id}/editar`}
            aria-label={`Ajustes da Sessão ${sessao.numero}`}
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>

        {semRegistros && (
          <p className="trilha-sem-registros">Sem registros nesta sessão.</p>
        )}

        {itensExibidos.length > 0 && (
          <div className="trilha-itens-lista">
            {ocultos > 0 && (
              <button type="button" className="trilha-mais-registros" onClick={aoNavegarNotas}>
                + {ocultos} {ocultos === 1 ? 'registro anterior' : 'registros anteriores'}
              </button>
            )}
            {itensExibidos.map((registro) => {
              const expandido = expansoes.has(registro.id)
              const ehDiario = registro.tipo === 'Diário'
              const Icone = ICONE_POR_TIPO[registro.tipo]
              const concluido = registro.tipo === 'Objetivo' && registro.concluido

              return (
                <div
                  key={registro.id}
                  className={[
                    'trilha-item-caixa',
                    ehDiario ? 'trilha-item-diario' : '',
                    concluido ? 'trilha-item-concluido' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => aoAlternarExpansao(registro.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandido}
                  aria-label={`${registro.tipo}: ${registro.texto}`}
                  title={registro.tipo}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      aoAlternarExpansao(registro.id)
                    }
                  }}
                >
                  <span className="trilha-item-icone" aria-hidden="true">
                    <Icone size={16} strokeWidth={1.75} />
                  </span>
                  <p className={`trilha-item-texto${expandido ? ' trilha-item-expandido' : ''}`}>
                    {ehDiario && <span className="trilha-registro-aspas">“</span>}
                    {registro.texto}
                    {ehDiario && <span className="trilha-registro-aspas">”</span>}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </article>
  )
}
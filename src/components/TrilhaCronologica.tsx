import { ChevronRight, Flag, Map, Route } from 'lucide-react'
import { useState } from 'react'
import { formatarDuracaoCurto } from '../dominio/cronometro'
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
  const encerradas = sessoes.filter((s) => s.fim !== null)

  if (encerradas.length === 0) return []

  const ordenadas = [...encerradas].sort(
    (a, b) => a.inicio.getTime() - b.inicio.getTime(),
  )

  const pontos: PontoRotulo[] = [
    { posicao: 0, horas: 0, texto: '0h', ehUltimo: false },
  ]

  let acumuladoHoras = 0
  const barraLargura = horasTotais > 0 ? horasTotais : 1

  for (const sessao of ordenadas) {
    acumuladoHoras += calcularDuracaoSessao(sessao) / 3_600_000

    pontos.push({
      posicao: Math.min((acumuladoHoras / barraLargura) * 100, 100),
      horas: acumuladoHoras,
      texto: formatarDuracaoCurto(acumuladoHoras * 3_600_000),
      ehUltimo: false,
    })
  }

  if (pontos.length > 1) {
    const ultimo = pontos[pontos.length - 1]
    ultimo.ehUltimo = true
    ultimo.texto = formatarDuracaoCurto(horasTotais * 3_600_000)
    ultimo.horas = horasTotais
  }

  const resultado: PontoRotulo[] = []
  let ultimaPosicao: number | null = null

  for (const ponto of pontos) {
    if (
      resultado.length > 0 &&
      resultado[resultado.length - 1].texto === ponto.texto
    ) {
      continue
    }

    if (ultimaPosicao !== null && ponto.posicao - ultimaPosicao < 10) {
      continue
    }

    resultado.push(ponto)
    ultimaPosicao = ponto.posicao
  }

  return resultado
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

function formatarDataCurta(data: Date): string {
  const dia = data.getDate()
  const mes = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
  }).format(data)

  return `${dia} ${mes}`
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
  const ordenadas = [...encerradas].sort(
    (a, b) => b.inicio.getTime() - a.inicio.getTime(),
  )

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
  const [expandirAnteriores, setExpandirAnteriores] = useState(false)
  const [expansoes, setExpansoes] = useState<Set<string>>(new Set())

  const encerradas = sessoes.filter((s) => s.fim !== null)

  const ultimaEncerrada = encerradas.length > 0 ? encerradas[0] : null
  const maisRecenteId = encerradas.length > 0 ? encerradas[0].id : null

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

  const rotulos = calcularRotulosTrilha(encerradas, horasTotais)

  function alternarExpansao(sessaoId: string) {
    setExpansoes((atuais) => {
      const nova = new Set(atuais)

      if (nova.has(sessaoId)) {
        nova.delete(sessaoId)
      } else {
        nova.add(sessaoId)
      }

      return nova
    })
  }

  if (encerradas.length === 0 && !sessaoAtiva) {
    return (
      <section className="trilha" aria-label="Trilha cronológica">
        <div className="trilha-vazia">
          Suas sessões vão aparecer aqui, na trilha do jogo.
        </div>
      </section>
    )
  }

  const sessoesVisuais = encerradas.slice(0, 2)
  const sessoesRecolhidas = encerradas.slice(2)

  return (
    <section className="trilha" aria-label="Trilha cronológica">
      <div className="trilha-titulo">
        <Route size={18} strokeWidth={1.75} className="trilha-titulo-icone" aria-hidden="true" />
        <h2 className="trilha-titulo-texto">Trilha Cronológica</h2>
      </div>

      <div className="trilha-card">
        <div className="trilha-barra-container">
          <div className="trilha-barra" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}>
            <div className="trilha-linha" />
            {rotulos.map((rotulo) => (
              <div
                key={rotulo.texto}
                className={`trilha-ponto${rotulo.ehUltimo ? ' trilha-ponto-ultimo' : ''}`}
                style={{ left: `${rotulo.posicao}%` }}
                aria-label={`Fim da sessão em ${rotulo.texto}`}
              />
            ))}
          </div>

          <div className="trilha-eixos">
            {rotulos.map((rotulo) => (
              <span
                key={rotulo.texto}
                className={`trilha-eixo${rotulo.ehUltimo ? ' trilha-eixo-ultimo' : ''}`}
                style={{ left: `${rotulo.posicao}%` }}
              >
                {rotulo.texto}
              </span>
            ))}
          </div>
        </div>

        <div className="trilha-voce-esta-aqui">
          <span className="trilha-ponto-aqui" aria-hidden="true" />
          <div className="trilha-voce-textos">
            <span className="trilha-rotulo-aqui">VOCÊ ESTÁ AQUI · {formatarDuracaoCurto(horasTotais * 3_600_000)}</span>
            <p className="trilha-ondem-parei">
              {tipoOndeParei && textoOndeParei
                ? textoCurto(textoOndeParei)
                : 'Registre onde parou ao encerrar uma sessão.'}
            </p>
          </div>
        </div>
      </div>

      {sessaoAtiva && (
        <div className="trilha-sessao-atual">
          <div className="trilha-ponto-atual" aria-hidden="true" />
          <div className="trilha-sessao-info">
            <span className="trilha-sessao-titulo">Sessão {sessaoAtiva.numero} · em andamento</span>
            <span className="trilha-sessao-tempo">
              {formatarDuracaoCurto(calcularDuracaoSessao(sessaoAtiva))}
            </span>
          </div>
        </div>
      )}

      <div className="trilha-linha-vertical" aria-hidden="true" />

      <div className="trilha-sessoes">
        {sessoesVisuais.map((sessao) => {
          const acumuladoHoras =
            encerradas
              .filter((s) => s.inicio.getTime() <= sessao.inicio.getTime())
              .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
              .reduce((total, s) => total + calcularDuracaoSessao(s), 0) /
              3_600_000

          const registros = registrosPorSessao[sessao.id] ?? []
          const registrosTrilha = registros.filter(
            (r) => r.tipo === 'Marco' || r.tipo === 'Região mapeada' || r.tipo === 'Diário',
          )

          return (
            <SessaoTrilha
              key={sessao.id}
              sessao={sessao}
              registros={registrosTrilha}
              horasAcumuladas={acumuladoHoras}
              expandido={expansoes.has(sessao.id)}
              aoAlternar={() => alternarExpansao(sessao.id)}
              estaAtiva={sessao.id === sessaoAtiva?.id}
              isMaisRecente={sessao.id === maisRecenteId}
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
              {expandirAnteriores ? 'Ocultar' : 'Expandir'}
              {' '}
              Sessões anteriores ({sessoesRecolhidas.length})
              <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>

            {expandirAnteriores &&
              sessoesRecolhidas.map((sessao) => {
                const acumuladoHoras =
                  encerradas
                    .filter((s) => s.inicio.getTime() <= sessao.inicio.getTime())
                    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
                    .reduce((total, s) => total + calcularDuracaoSessao(s), 0) /
                    3_600_000

                const registros = registrosPorSessao[sessao.id] ?? []
                const registrosTrilha = registros.filter(
                  (r) =>
                    r.tipo === 'Marco' ||
                    r.tipo === 'Região mapeada' ||
                    r.tipo === 'Diário',
                )

                return (
                  <SessaoTrilha
                    key={sessao.id}
                    sessao={sessao}
                    registros={registrosTrilha}
                    horasAcumuladas={acumuladoHoras}
                    expandido={expansoes.has(sessao.id)}
                    aoAlternar={() => alternarExpansao(sessao.id)}
                    estaAtiva={sessao.id === sessaoAtiva?.id}
                    isMaisRecente={sessao.id === maisRecenteId}
                  />
                )
              })}
          </div>
        )}
      </div>
    </section>
  )
}

type SessaoTrilhaProps = {
  sessao: Sessao
  registros: RegistroTrilha[]
  horasAcumuladas: number
  expandido: boolean
  aoAlternar: () => void
  estaAtiva?: boolean
  isMaisRecente?: boolean
}

function SessaoTrilha({
  sessao,
  registros,
  horasAcumuladas,
  expandido,
  aoAlternar,
  estaAtiva,
  isMaisRecente = false,
}: SessaoTrilhaProps) {
  const [expansaoTexto, setExpansaoTexto] = useState(false)

  const duracaoSessao = calcularDuracaoSessao(sessao)
  const linhaCinza = `${formatarDataCurta(sessao.inicio)} · ${formatarDuracaoCurto(duracaoSessao)} (Acum. ${formatarDuracaoCurto(horasAcumuladas * 3_600_000)})`
  const semRegistros = registros.length === 0

  const ehMaisRecente = estaAtiva || isMaisRecente

  return (
    <article className={`trilha-sessao${estaAtiva ? ' trilha-sessao-ativa-item' : ''}`}>
      <div className={`trilha-ponto-sessao${ehMaisRecente ? ' trilha-ponto-sessao-recente' : ''}`} aria-hidden="true" />
      <div className="trilha-sessao-conteudo">
        <button
          type="button"
          className="trilha-sessao-topo"
          onClick={() => aoAlternar()}
          aria-label={`Sessão ${sessao.numero}`}
        >
          <div className="trilha-sessao-numero">
            Sessão {sessao.numero}{estaAtiva ? ' · em andamento' : ''}
          </div>
          <div className="trilha-sessao-linha">{linhaCinza}</div>
        </button>

        {semRegistros && (
          <p className="trilha-sem-registros">Sem registros nesta sessão.</p>
        )}

        {registros.length > 0 && (
          <div className="trilha-registros">
            {registros.map((registro) => (
              <li key={registro.id} className="trilha-registro">
                {registro.tipo === 'Diário' ? (
                  <p className="trilha-registro-diario">
                    <span className="trilha-registro-aspas">“</span>
                    {(expandido || expansaoTexto) ? registro.texto : textoCurto(registro.texto)}{(expandido || expansaoTexto) ? '' : '…'}
                    <span className="trilha-registro-aspas">”</span>
                  </p>
                ) : (
                  <>
                    <span className="trilha-registro-icone" aria-hidden="true">
                      {registro.tipo === 'Marco' ? (
                        <Flag size={14} strokeWidth={1.75} />
                      ) : (
                        <Map size={14} strokeWidth={1.75} />
                      )}
                    </span>
                    <p
                      className={`trilha-registro-texto${(expandido || expansaoTexto) ? '' : ' trilha-texto-curto'}`}
                      onClick={() => setExpansaoTexto(!expansaoTexto)}
                    >
                      {(expandido || expansaoTexto) ? registro.texto : textoCurto(registro.texto)}{(expandido || expansaoTexto) ? '' : '…'}
                    </p>
                  </>
                )}
              </li>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
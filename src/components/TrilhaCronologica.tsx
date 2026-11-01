import { ChevronRight, Crosshair, Milestone, Route } from 'lucide-react'
import { useState } from 'react'
import { formatarDuracao, formatarTempoCurto } from '../dominio/cronometro'
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

function formatarHorasCurto(horas: number): string {
  const minutosTotais = Math.max(0, Math.round(horas * 60))
  const h = Math.floor(minutosTotais / 60)
  const m = minutosTotais % 60

  if (h === 0 && m === 0) return '0h'
  if (m === 0) return `${h}h`
  return `${h}h${m}`
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
      texto: formatarHorasCurto(acumuladoHoras),
      ehUltimo: false,
    })
  }

  if (pontos.length > 1) {
    const ultimo = pontos[pontos.length - 1]
    ultimo.ehUltimo = true
    ultimo.texto = formatarHorasCurto(horasTotais)
    ultimo.horas = horasTotais
  }

  const resultado: PontoRotulo[] = []
  let ultimaPosicao: number | null = null

  for (const ponto of pontos) {
    if (resultado.length > 0 && resultado[resultado.length - 1].texto === ponto.texto) {
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

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data)
}

function textoCurto(texto: string): string {
  const linhas = texto.split('\n')

  if (linhas.length <= 2) return texto

  return `${linhas[0]} ${linhas[1]}...`
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

  const ultimasDuas = encerradas.slice().reverse().slice(0, 2)
  const anteriores = encerradas.slice().reverse().slice(2)

  const ultimaEncerrada = ultimasDuas[0]

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
            <span className="trilha-rotulo-aqui">VOCÊ ESTÁ AQUI · {formatarTempoCurto(horasTotais)}</span>
            <p className="trilha-ondem-parei">
              {tipoOndeParei && textoOndeParei
                ? textoCurto(textoOndeParei)
                : 'Registre onde parou ao encerrar uma sessão.'}
            </p>
          </div>
          <Crosshair size={16} strokeWidth={1.75} className="trilha-crosshair" aria-hidden="true" />
        </div>
      </div>

      {sessaoAtiva && (
        <div className="trilha-sessao-ativa">
          <span className="trilha-sessao-ativa-rotulo">
            Sessão {sessaoAtiva.numero} em andamento
          </span>
          <span className="trilha-sessao-ativa-tempo">
            {formatarDuracao(
              calcularDuracaoSessao(sessaoAtiva),
            )}
          </span>
        </div>
      )}

      <div className="trilha-sessoes">
        {ultimasDuas.map((sessao) => (
          <SessaoTrilha
            key={sessao.id}
            sessao={sessao}
            registros={registrosPorSessao[sessao.id] ?? []}
            horasAcumuladas={
              encerradas
                .filter((s) => s.inicio.getTime() <= sessao.inicio.getTime())
                .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
                .reduce((total, s) => total + calcularDuracaoSessao(s), 0) /
              3_600_000
            }
            expandido={expansoes.has(sessao.id)}
            aoAlternar={() => alternarExpansao(sessao.id)}
          />
        ))}

        {anteriores.length > 0 && (
          <div className="trilha-grupo-anteriores">
            <button
              type="button"
              className="trilha-botao-expandir"
              onClick={() => setExpandirAnteriores(!expandirAnteriores)}
            >
              {expandirAnteriores ? 'Ocultar' : 'Expandir'}
              {' '}
              Sessões anteriores ({anteriores.length})
              <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>

            {expandirAnteriores &&
              anteriores.map((sessao) => (
                <SessaoTrilha
                  key={sessao.id}
                  sessao={sessao}
                  registros={registrosPorSessao[sessao.id] ?? []}
                  horasAcumuladas={
                    encerradas
                      .filter((s) => s.inicio.getTime() <= sessao.inicio.getTime())
                      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
                      .reduce((total, s) => total + calcularDuracaoSessao(s), 0) /
                      3_600_000
                  }
                  expandido={expansoes.has(sessao.id)}
                  aoAlternar={() => alternarExpansao(sessao.id)}
                />
              ))}
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
}

function SessaoTrilha({
  sessao,
  registros,
  horasAcumuladas,
  expandido,
  aoAlternar,
}: SessaoTrilhaProps) {
  const registrosTrilha = registros.filter(
    (r) => r.tipo === 'Marco' || r.tipo === 'Região mapeada',
  )

  const restantes = registrosTrilha.slice(2)

  return (
    <article className="trilha-sessao-card">
      <div className="trilha-sessao-topo" onClick={aoAlternar} role="button" tabIndex={0}>
        <div className="trilha-sessao-numero">
          Sessão {sessao.numero}
        </div>
        <div className="trilha-sessao-detalhes">
          <span>{formatarData(sessao.inicio)}</span>
          <span>·</span>
          <span>{formatarDuracao(calcularDuracaoSessao(sessao))}</span>
          <span>·</span>
          <span>+{horasAcumuladas.toFixed(0)}h acumuladas</span>
        </div>
        <Milestone size={16} strokeWidth={1.75} aria-hidden="true" />
      </div>

      {expandido && (
        <ul className="trilha-registros">
          {registrosTrilha.map((registro) => (
            <li key={registro.id} className="trilha-registro">
              <span className="trilha-registro-tipo">{registro.tipo}</span>
              <p className="trilha-registro-texto">
                {expandido ? registro.texto : textoCurto(registro.texto)}
              </p>
            </li>
          ))}
          {restantes.length > 0 && (
            <li className="trilha-registro trilha-registro-mais">
              + {restantes.length} registro
                {restantes.length !== 1 ? 's' : ''}
            </li>
          )}
        </ul>
      )}
    </article>
  )
}

import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { formatarDuracao } from '../dominio/cronometro'
import { formatarTempoRelativo } from '../dominio/biblioteca'
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
  const dataOndeParei =
    tipoOndeParei === 'marco' ? ultimoMarco?.dataHora : ultimaEncerrada?.inicio

  const barraLargura = horasTotais > 0 ? horasTotais : 1

  function posicaoAcumulada(sessao: Sessao): number {
    const anterioresSessao = encerradas
      .filter((s) => s.inicio.getTime() <= sessao.inicio.getTime())
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())

    return (
      anterioresSessao.reduce((total, s) => total + calcularDuracaoSessao(s), 0) /
      barraLargura
    ) * 100
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

  function horasAcumuladasAte(sessao: Sessao): number {
    const anterioresSessao = encerradas
      .filter((s) => s.inicio.getTime() <= sessao.inicio.getTime())
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())

    return (
      anterioresSessao.reduce(
        (total, s) => total + calcularDuracaoSessao(s),
        0,
      ) / 3_600_000
    )
  }

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

  return (
    <section className="trilha" aria-label="Trilha cronológica">
      <div className="trilha-barra-container">
        <div className="trilha-barra" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}>
          <div className="trilha-linha" />
          {encerradas.map((sessao) => {
            const posicao = posicaoAcumulada(sessao)

            return (
              <div
                key={sessao.id}
                className="trilha-ponto"
                style={{ left: `${posicao}%` }}
                aria-label={`Fim da sessão ${sessao.numero}`}
              />
            )
          })}

          {sessaoAtiva && (
            <div
              className="trilha-ponto trilha-ponto-ativa"
              style={{ left: `${Math.min(posicaoAcumulada(sessaoAtiva), 100)}%` }}
              aria-label={`Sessão ${sessaoAtiva.numero} em andamento`}
            />
          )}
        </div>

        <div className="trilha-eixos">
          <span className="trilha-eixo">0h</span>
          {encerradas.length > 0 && (
            <>
              {encerradas
                .slice()
                .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
                .map((sessao) => {
                  const posicao = posicaoAcumulada(sessao)
                  const acumulado = horasAcumuladasAte(sessao)

                  return (
                    <span
                      key={sessao.id}
                      className="trilha-eixo"
                      style={{ left: `${Math.min(posicao, 100)}%` }}
                    >
                      {acumulado.toFixed(0)}h
                    </span>
                  )
                })}
            </>
          )}
          <span className="trilha-eixo trilha-eixo-final">{horasTotais.toFixed(0)}h</span>
        </div>
      </div>

      <div className="trilha-voce-esta-aqui">
        <span className="trilha-rotulo">Você está aqui</span>
        <span className="trilha-valor">{horasTotais.toFixed(0)}h</span>
        {tipoOndeParei && textoOndeParei && dataOndeParei && (
          <span className="trilha-ondem-parei">
            {tipoOndeParei === 'marco' ? 'Último Marco:' : 'Onde parei:'}
            {textoCurto(textoOndeParei)} · {formatarTempoRelativo(dataOndeParei)}
          </span>
        )}
      </div>

      {sessaoAtiva && (
        <div className="trilha-sessao-ativa">
          <span className="trilha-sessao-ativa-rotulo">
            Sessão {sessaoAtiva.numero} em andamento
          </span>
          <span className="trilha-sessao-ativa-tempo">
            {formatarDuracao(calcularDuracaoSessao(sessaoAtiva))}
          </span>
        </div>
      )}

      <div className="trilha-sessoes">
        {ultimasDuas.map((sessao) => (
          <SessaoTrilha
            key={sessao.id}
            sessao={sessao}
            registros={registrosPorSessao[sessao.id] ?? []}
            horasAcumuladas={horasAcumuladasAte(sessao)}
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
                  horasAcumuladas={horasAcumuladasAte(sessao)}
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
        <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
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

function calcularDuracaoSessao(sessao: Pick<Sessao, 'inicio' | 'fim' | 'tempoPausado' | 'pausadoEm'>): number {
  const referencia = sessao.fim ?? new Date()
  const pausaEmAndamento = sessao.pausadoEm
    ? Math.max(0, referencia.getTime() - sessao.pausadoEm.getTime())
    : 0

  return Math.max(
    0,
    referencia.getTime() - sessao.inicio.getTime() - sessao.tempoPausado - pausaEmAndamento,
  )
}

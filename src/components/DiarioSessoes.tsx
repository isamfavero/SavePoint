import {
  ArrowRight,
  CircleCheck,
  Clock,
  Flag,
  Footprints,
  Map,
  MapPin,
  NotebookPen,
  SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { calcularDuracaoSessao } from '../data'
import type { Registro, Sessao } from '../data'
import { formatarDuracaoCurto } from '../dominio/cronometro'

const FORMATADOR_DIA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const FORMATADOR_HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const MAXIMO_TAGS = 4

function plural(total: number, singular: string, varios: string): string {
  return `${total} ${total === 1 ? singular : varios}`
}

type Selo = { chave: string; texto: string; Icone: LucideIcon }

type CartaoProps = {
  sessao: Sessao
  /** Registros feitos nesta sessão. */
  registros: Registro[]
  /** Objetivos (de qualquer sessão) concluídos durante esta sessão. */
  objetivosConcluidos: number
  ativa: boolean
  duracaoMs: number
}

export function CartaoDiarioSessao({
  sessao,
  registros,
  objetivosConcluidos,
  ativa,
  duracaoMs,
}: CartaoProps) {
  const navigate = useNavigate()

  const marcos = registros.filter((r) => r.tipo === 'Marco').length
  const regioes = registros.filter((r) => r.tipo === 'Região mapeada').length

  const selos: Selo[] = [
    marcos > 0 && { chave: 'marco', texto: plural(marcos, 'Marco', 'Marcos'), Icone: Flag },
    regioes > 0 && {
      chave: 'regiao',
      texto: plural(regioes, 'Região mapeada', 'Regiões mapeadas'),
      Icone: Map,
    },
    objetivosConcluidos > 0 && {
      chave: 'objetivo',
      texto: plural(objetivosConcluidos, 'Objetivo concluído', 'Objetivos concluídos'),
      Icone: CircleCheck,
    },
  ].filter((selo): selo is Selo => Boolean(selo))

  const tags = [...new Set(registros.flatMap((r) => r.tags))]
  const tagsVisiveis = tags.slice(0, MAXIMO_TAGS)

  const resumo = [
    { chave: 'fiz', rotulo: 'O que fiz', texto: sessao.oQueFiz, Icone: Footprints },
    { chave: 'parei', rotulo: 'Onde parei', texto: sessao.ondeParei, Icone: MapPin },
    { chave: 'proximo', rotulo: 'Próximo passo', texto: sessao.proximoPasso, Icone: ArrowRight },
  ].filter((bloco) => bloco.texto.trim())

  const ultimaNota = [...registros].sort(
    (a, b) => b.dataHora.getTime() - a.dataHora.getTime(),
  )[0]

  const horario = sessao.fim
    ? `${FORMATADOR_HORA.format(sessao.inicio)} – ${FORMATADOR_HORA.format(sessao.fim)}`
    : `desde ${FORMATADOR_HORA.format(sessao.inicio)}`

  return (
    <article
      className={`diario-cartao${ativa ? ' diario-cartao-ativo' : ''}`}
      aria-label={`Sessão ${sessao.numero}${ativa ? ', em andamento' : ''}`}
    >
      <header className="diario-cartao-topo">
        <div className="diario-cartao-titulos">
          <h3 className="diario-cartao-titulo">Sessão {sessao.numero}</h3>
          <p className="diario-cartao-data">
            {FORMATADOR_DIA.format(sessao.inicio).replace('.', '')} · {horario}
          </p>
        </div>

        {ativa ? (
          <span className="diario-selo-ao-vivo">
            <span className="diario-ponto-ao-vivo" aria-hidden="true" />
            {formatarDuracaoCurto(duracaoMs)}
          </span>
        ) : (
          <span className="diario-duracao">
            <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
            {formatarDuracaoCurto(duracaoMs)}
          </span>
        )}
      </header>

      {selos.length > 0 && (
        <ul className="diario-selos" aria-label="Destaques da sessão">
          {selos.map(({ chave, texto, Icone }) => (
            <li key={chave} className={`diario-selo diario-selo-${chave}`}>
              <Icone size={13} strokeWidth={1.75} aria-hidden="true" />
              {texto}
            </li>
          ))}
        </ul>
      )}

      {resumo.length > 0 ? (
        <dl className="diario-resumo">
          {resumo.map(({ chave, rotulo, texto, Icone }) => (
            <div key={chave} className="diario-resumo-bloco">
              <dt>
                <Icone size={13} strokeWidth={1.75} aria-hidden="true" />
                {rotulo}
              </dt>
              <dd>{texto}</dd>
            </div>
          ))}
        </dl>
      ) : ativa ? (
        <p className="diario-aviso">
          {ultimaNota ? (
            <>
              <span className="diario-aviso-rotulo">Última anotação</span>
              {ultimaNota.texto}
            </>
          ) : (
            'Sessão em andamento. O resumo é escrito ao encerrar.'
          )}
        </p>
      ) : (
        <p className="diario-aviso">
          Sem resumo desta sessão.{' '}
          <Link to={`/jornada/sessao/${sessao.id}/editar`}>Escrever agora</Link>
        </p>
      )}

      {tagsVisiveis.length > 0 && (
        <div className="notas-tags diario-tags">
          {tagsVisiveis.map((tag) => (
            <span key={tag} className="nota-tag">
              {tag}
            </span>
          ))}
          {tags.length > MAXIMO_TAGS && (
            <span className="nota-tag diario-tag-mais">+{tags.length - MAXIMO_TAGS}</span>
          )}
        </div>
      )}

      <footer className="diario-cartao-rodape">
        <button
          type="button"
          className="diario-abrir-notas"
          onClick={() => navigate(`/jornada/sessao/${sessao.id}/notas`)}
          disabled={registros.length === 0}
        >
          <NotebookPen size={15} strokeWidth={1.75} aria-hidden="true" />
          {registros.length === 0
            ? 'Sem notas'
            : `Abrir ${plural(registros.length, 'nota', 'notas')}`}
        </button>
        <Link
          className="trilha-sessao-ajustes"
          to={`/jornada/sessao/${sessao.id}/editar`}
          aria-label={`Ajustes da Sessão ${sessao.numero}`}
        >
          <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  )
}

type ListaProps = {
  sessoes: Sessao[]
  registros: Registro[]
  sessaoAtiva: Sessao | null
  duracaoAtivaMs: number
  /** Quantas sessões encerradas mostrar (todas, se omitido). */
  limite?: number
}

/** Sessão em andamento no topo e, abaixo, as encerradas da mais recente para a mais antiga. */
export function DiarioLista({ sessoes, registros, sessaoAtiva, duracaoAtivaMs, limite }: ListaProps) {
  const encerradas = sessoes
    .filter((sessao) => sessao.fim !== null && sessao.id !== sessaoAtiva?.id)
    .sort((a, b) => b.inicio.getTime() - a.inicio.getTime())
  const visiveis = limite === undefined ? encerradas : encerradas.slice(0, limite)
  const lista = sessaoAtiva ? [sessaoAtiva, ...visiveis] : visiveis

  const porSessao = new globalThis.Map<string, Registro[]>()
  const concluidosPorSessao = new globalThis.Map<string, number>()

  for (const registro of registros) {
    porSessao.set(registro.sessaoId, [...(porSessao.get(registro.sessaoId) ?? []), registro])

    if (registro.tipo === 'Objetivo' && registro.concluido && registro.concluidoSessaoId) {
      concluidosPorSessao.set(
        registro.concluidoSessaoId,
        (concluidosPorSessao.get(registro.concluidoSessaoId) ?? 0) + 1,
      )
    }
  }

  return (
    <div className="diario-lista">
      {lista.map((sessao) => {
        const ativa = sessao.id === sessaoAtiva?.id

        return (
          <CartaoDiarioSessao
            key={sessao.id}
            sessao={sessao}
            registros={porSessao.get(sessao.id) ?? []}
            objetivosConcluidos={concluidosPorSessao.get(sessao.id) ?? 0}
            ativa={ativa}
            duracaoMs={ativa ? duracaoAtivaMs : calcularDuracaoSessao(sessao)}
          />
        )
      })}
    </div>
  )
}

import { BookOpen, Clock } from 'lucide-react'

type EstatisticasJogoProps = {
  estatisticas: {
    horasTotais: number
    totalSessoes: number
    mediaHorasPorSessao: number
    duracaoTotalMs: number
    mediaPorSessaoMs: number
    sessoesEmAndamento: number
  }
  horasNaSemana: number
  totalRegistros: number
}

export function EstatisticasJogo({
  estatisticas,
  horasNaSemana,
  totalRegistros,
}: EstatisticasJogoProps) {
  const horasTotais = estatisticas.horasTotais
  const totalSessoes = estatisticas.totalSessoes
  const sessoesEmAndamento = estatisticas.sessoesEmAndamento
  const mediaHoras = estatisticas.mediaHorasPorSessao

  return (
    <section className="estatisticas" aria-label="Estatísticas">
      <div className="estatisticas-grid">
        <div className="estatistica-card">
          <div className="estatistica-topo">
            <Clock size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="estatistica-rotulo">Horas totais</span>
          </div>
          <p className="estatistica-valor">{horasTotais.toFixed(2)}h</p>
          <p className="estatistica-subtitulo">
            {horasNaSemana.toFixed(2)}h nesta semana
          </p>
        </div>

        <div className="estatistica-card">
          <div className="estatistica-topo">
            <BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="estatistica-rotulo">Sessões feitas</span>
          </div>
          <p className="estatistica-valor">
            {totalSessoes}
            {sessoesEmAndamento > 0 ? ` · ${sessoesEmAndamento} em andamento` : ''}
          </p>
        </div>

        <div className="estatistica-card">
          <div className="estatistica-topo">
            <Clock size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="estatistica-rotulo">Média por sessão</span>
          </div>
          <p className="estatistica-valor">{mediaHoras.toFixed(2)}h</p>
          <p className="estatistica-subtitulo">
            {totalSessoes === 0 ? 'Sem sessões encerradas' : 'Calculada a partir das sessões'}
          </p>
        </div>

        <div className="estatistica-card">
          <div className="estatistica-topo">
            <BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="estatistica-rotulo">Anotações registradas</span>
          </div>
          <p className="estatistica-valor">{totalRegistros}</p>
          <p className="estatistica-subtitulo">
            Registros vinculados a sessões deste jogo
          </p>
        </div>
      </div>
    </section>
  )
}

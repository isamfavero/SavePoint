import { formatarDuracao } from '../dominio/cronometro'

type CronometroProps = {
  numero: number
  duracaoMs: number
  pausada?: boolean
}

export function Cronometro({ numero, duracaoMs, pausada = false }: CronometroProps) {
  return (
    <div className={`cronometro${pausada ? ' cronometro-pausado' : ''}`}>
      <span className="cronometro-rotulo">
        <span className="cronometro-ponto" aria-hidden="true" />
        Sessão {numero}
        {pausada && <span className="cronometro-estado">Pausada</span>}
      </span>
      <p className="cronometro-tempo">{formatarDuracao(duracaoMs)}</p>
    </div>
  )
}

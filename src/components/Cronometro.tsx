import { formatarDuracao } from '../dominio/cronometro'
import { Pause, Play, Square } from 'lucide-react'

type CronometroProps = {
  numero: number
  duracaoMs: number
  pausada?: boolean
  semSessao?: boolean
  aoPausarOuRetomar?: () => void
  aoEncerrar?: () => void
  aoIniciar?: () => void
  acaoEmAndamento?: 'iniciar' | 'pausar' | 'retomar' | null
  estaPausada?: boolean
}

export function Cronometro({
  numero,
  duracaoMs,
  pausada = false,
  semSessao = false,
  aoPausarOuRetomar,
  aoEncerrar,
  aoIniciar,
  acaoEmAndamento = null,
  estaPausada = pausada,
}: CronometroProps) {
  const estaRodando = semSessao ? false : !estaPausada

  return (
    <section className="cronometro-card" aria-label="Cronômetro da sessão">
      <span className="cronometro-pilula">
        <span className="cronometro-ponto" aria-hidden="true" />
        {semSessao
          ? 'NOVA SESSÃO'
          : `SESSÃO ${numero}${estaPausada ? ' · PAUSADA' : ''}`}
      </span>

      <p className={`cronometro-tempo${estaPausada && !semSessao ? ' cronometro-tempo-esmaecido' : ''}`}>
        {semSessao ? '00:00:00' : formatarDuracao(duracaoMs)}
      </p>

      {semSessao && aoIniciar ? (
        <button
          type="button"
          className="botao-iniciar-sessao"
          onClick={aoIniciar}
          disabled={acaoEmAndamento === 'iniciar'}
        >
          <Play size={16} strokeWidth={2} aria-hidden="true" />
          {acaoEmAndamento === 'iniciar' ? 'Iniciando...' : 'Iniciar sessão'}
        </button>
      ) : (
        <div className="cronometro-acoes">
          <button
            type="button"
            className="botao-pausar"
            onClick={aoPausarOuRetomar}
            disabled={acaoEmAndamento !== null}
          >
            {acaoEmAndamento === 'pausar'
              ? 'Pausando...'
              : acaoEmAndamento === 'retomar'
                ? 'Retomando...'
                : estaRodando
                  ? (
                    <>
                      <Pause size={16} strokeWidth={2} aria-hidden="true" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play size={16} strokeWidth={2} aria-hidden="true" />
                      Retomar
                    </>
                  )}
          </button>

          {aoEncerrar && (
            <button
              type="button"
              className="botao-encerrar"
              onClick={aoEncerrar}
              disabled={acaoEmAndamento !== null}
            >
              <Square size={15} strokeWidth={2} aria-hidden="true" />
              Encerrar
            </button>
          )}
        </div>
      )}
    </section>
  );
}

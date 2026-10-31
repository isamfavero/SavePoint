import { formatarDuracao } from '../dominio/cronometro'

type ChipSessaoProps = {
  numero: number
  duracaoMs: number
  pausada?: boolean
  onClick?: () => void
  ariaLabel?: string
  className?: string
}

export function ChipSessao({
  numero,
  duracaoMs,
  pausada = false,
  onClick,
  ariaLabel,
  className,
}: ChipSessaoProps) {
  const classes = [
    'mini-cronometro',
    pausada ? 'mini-cronometro-pausado' : '',
    onClick ? '' : 'mini-cronometro-estatico',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const conteudo = (
    <>
      <span className="mini-cronometro-ponto" aria-hidden="true" />
      <span className="mini-cronometro-rotulo">Sessão {numero}</span>
      <span className="mini-cronometro-tempo">
        {pausada ? 'Pausada' : formatarDuracao(duracaoMs)}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} aria-label={ariaLabel}>
        {conteudo}
      </button>
    )
  }

  return <span className={classes}>{conteudo}</span>
}

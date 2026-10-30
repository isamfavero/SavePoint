import { Gamepad2 } from 'lucide-react'
import { useObjectUrl } from '../hooks/useObjectUrl'

type JogoCapaProps = {
  capa: Blob | null
  alt: string
  className?: string
  tamanhoIcone?: number
}

export function JogoCapa({
  capa,
  alt,
  className = '',
  tamanhoIcone = 28,
}: JogoCapaProps) {
  const url = useObjectUrl(capa)

  if (url) {
    return <img className={`jogo-capa ${className}`.trim()} src={url} alt={alt} />
  }

  return (
    <span className={`jogo-capa-vazia ${className}`.trim()} aria-hidden="true">
      <Gamepad2 size={tamanhoIcone} strokeWidth={1.5} />
    </span>
  )
}

import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

type CampoSenhaProps = {
  id: string
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  autoComplete: 'new-password' | 'current-password'
  erro?: string
  ajuda?: ReactNode
}

export function CampoSenha({ id, rotulo, valor, aoMudar, autoComplete, erro, ajuda }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false)
  const idErro = `${id}-erro`
  const idAjuda = `${id}-ajuda`

  return (
    <div className="campo">
      <label className="campo-rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <span className="campo-input">
        <LockKeyhole size={18} strokeWidth={1.75} aria-hidden="true" />
        <input
          id={id}
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(erro)}
          aria-describedby={[erro ? idErro : '', ajuda ? idAjuda : ''].filter(Boolean).join(' ') || undefined}
        />
        <button
          type="button"
          className="busca-limpar"
          onClick={() => setVisivel(!visivel)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
        >
          {visivel ? (
            <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </span>
      {ajuda && (
        <div className="campo-ajuda" id={idAjuda}>
          {ajuda}
        </div>
      )}
      {erro && (
        <p className="campo-erro" id={idErro} role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}

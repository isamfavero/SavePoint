import { CheckCircle2, X } from 'lucide-react'
import { useAviso } from '../contexts/AvisoContext'

export function AvisoGlobal() {
  const { aviso, fecharAviso } = useAviso()

  if (!aviso) return null

  return (
    <div key={aviso.id} className="aviso-global" role="status" aria-live="polite">
      <CheckCircle2 size={18} strokeWidth={1.9} aria-hidden="true" />
      <p>{aviso.mensagem}</p>
      <button
        type="button"
        className="aviso-global-fechar"
        onClick={fecharAviso}
        aria-label="Fechar aviso"
      >
        <X size={15} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}

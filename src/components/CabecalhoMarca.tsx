import { Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useConta } from '../contexts/ContaContext'

export function CabecalhoMarca() {
  const { usuario } = useConta()
  const inicial = usuario?.nome.trim().charAt(0).toUpperCase() || usuario?.email.charAt(0).toUpperCase()

  return (
    <header className="marca">
      <img
        src="/logo.png"
        alt="SavePoint"
        className="marca-logo-img"
      />
      <div className="marca-textos">
        <span className="marca-nome">SavePoint</span>
        <span className="marca-sub">GAMING JOURNAL</span>
      </div>
      {usuario ? (
        <Link
          className="marca-ajustes marca-avatar"
          to="/ajustes"
          aria-label={`Conta de ${usuario.nome}, ajustes e backup`}
        >
          {inicial}
        </Link>
      ) : (
        <Link className="marca-ajustes" to="/ajustes" aria-label="Ajustes e backup">
          <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}

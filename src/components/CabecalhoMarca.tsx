export function CabecalhoMarca() {
  return (
    <header className="marca">
      <div className="marca-esquerda">
        <img
          src="/logo.png"
          alt="SavePoint"
          className="marca-logo-img"
        />
        <div className="marca-textos">
          <span className="marca-nome">SavePoint</span>
          <span className="marca-sub">GAMING JOURNAL</span>
        </div>
      </div>
      <div className="marca-avatar" aria-label="Perfil do jogador">
        <span className="marca-avatar-letra">S</span>
      </div>
    </header>
  )
}


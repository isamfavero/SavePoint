import { ChartLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useJogoAtualDetalhe } from '../hooks/useJogoAtualDetalhe'
import { classeDaSituacao } from '../dominio/biblioteca'

export function Jornada() {
  const { jogo, carregando, erro } = useJogoAtualDetalhe()

  return (
    <section className="page" aria-label="Jornada">
      <header className="page-header">
        <span className="page-icon" aria-hidden="true">
          <ChartLine size={22} strokeWidth={1.75} />
        </span>
        <p className="page-kicker">SavePoint</p>
        <h1 className="page-title">Jornada</h1>
        <p className="page-description">
          Acompanhe o jogo atual e o tempo que você já dedicou a ele.
        </p>
      </header>

      {carregando && <p className="biblioteca-aviso">Carregando o jogo atual...</p>}

      {erro && (
        <p className="biblioteca-aviso" role="alert">
          {erro}
        </p>
      )}

      {!carregando && !erro && jogo && (
        <div className="jornada-atual">
          <span className="jornada-rotulo">Jogo atual</span>
          <h2 className="jornada-nome">{jogo.nome}</h2>
          <p className="jornada-info">
            {jogo.plataforma}
            <span className={`chip-situacao-inline ${classeDaSituacao(jogo.situacao)}`}>
              {jogo.situacao}
            </span>
          </p>
        </div>
      )}

      {!carregando && !erro && !jogo && (
        <div className="jornada-atual jornada-sem-jogo">
          <span className="jornada-rotulo">Jogo atual</span>
          <p className="jornada-info">
            Nenhum jogo escolhido ainda. Abra a Biblioteca para selecionar um jogo.
          </p>
          <Link className="botao-secundario" to="/biblioteca">
            Ir para a Biblioteca
          </Link>
        </div>
      )}

      <div className="placeholder-card">
        <span className="placeholder-label">
          <span className="placeholder-dot" aria-hidden="true" />
          Em preparação
        </span>
        <p>
          A trilha, os objetivos e o diário de sessões chegam nas próximas fatias.
        </p>
      </div>
    </section>
  )
}

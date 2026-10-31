import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { erro: Error | null }

export function ErroInicial({
  erro,
  onTentarNovamente,
}: {
  erro: Error
  onTentarNovamente: () => void
}) {
  return (
    <div className="erro-raiz" role="alert">
      <h1>Algo deu errado ao abrir o SavePoint</h1>
      <button type="button" onClick={onTentarNovamente}>
        Tentar de novo
      </button>
      <p className="detalhe-tecnico">{erro.message}</p>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  tentarNovamente = () => {
    this.setState({ erro: null })
  }

  render(): ReactNode {
    if (this.state.erro) {
      return (
        <ErroInicial
          erro={this.state.erro}
          onTentarNovamente={this.tentarNovamente}
        />
      )
    }
    return this.props.children
  }
}

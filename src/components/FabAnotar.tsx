import { SquarePen } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import type { Jogo } from '../data'

type FabAnotarProps = {
  jogo: Jogo | null
}

function mensagemDoErro(erro: unknown, padrao: string): string {
  return erro instanceof Error && erro.message ? erro.message : padrao
}

export function FabAnotar({ jogo }: FabAnotarProps) {
  const { sessao, iniciarSessao } = useSessaoAtiva()
  const navigate = useNavigate()
  const [modalAberto, setModalAberto] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function abrirAnotacao() {
    if (sessao) {
      navigate('/nova-anotacao')
      return
    }

    setErro(null)
    setModalAberto(true)
  }

  async function iniciarEAnotar() {
    if (!jogo) {
      navigate('/biblioteca')
      return
    }

    setIniciando(true)
    setErro(null)

    try {
      await iniciarSessao(jogo.id)
      setModalAberto(false)
      navigate('/nova-anotacao')
    } catch (falha) {
      setErro(mensagemDoErro(falha, 'Não foi possível iniciar a sessão.'))
    } finally {
      setIniciando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="fab"
        onClick={abrirAnotacao}
        aria-label="Nova anotação"
      >
        <SquarePen size={23} strokeWidth={1.9} aria-hidden="true" />
      </button>

      {modalAberto && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-fab-anotar"
          >
            <h2 id="titulo-fab-anotar">Para anotar, inicie uma sessão</h2>
            <p>
              {jogo
                ? `As anotações ficam vinculadas à sessão de ${jogo.nome}.`
                : 'Escolha um jogo na Biblioteca para iniciar uma sessão e registrar anotações.'}
            </p>

            {erro && (
              <p className="campo-erro" role="alert">
                {erro}
              </p>
            )}

            <div className="modal-acoes">
              <button
                type="button"
                className="botao-secundario"
                onClick={() => setModalAberto(false)}
                disabled={iniciando}
                autoFocus
              >
                Cancelar
              </button>
              <button
                type="button"
                className="botao-primario compacto"
                onClick={() => void iniciarEAnotar()}
                disabled={iniciando}
              >
                {iniciando
                  ? 'Iniciando...'
                  : jogo
                    ? 'Iniciar sessão'
                    : 'Ir para a Biblioteca'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

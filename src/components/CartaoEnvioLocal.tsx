import { CloudUpload } from 'lucide-react'
import { useState } from 'react'
import { useEnvioLocal } from '../hooks/useEnvioLocal'

function plural(total: number, singular: string, varios: string): string {
  return `${total} ${total === 1 ? singular : varios}`
}

/**
 * Oferece levar para a conta os dados que estão só neste navegador.
 * Some quando não há nada a enviar (ou sem conta conectada).
 */
export function CartaoEnvioLocal({ compacto = false }: { compacto?: boolean }) {
  const { pendentes, temPendentes, enviando, resumo, erro, enviar } = useEnvioLocal()
  const [dispensado, setDispensado] = useState(false)

  if (resumo && !temPendentes) {
    return (
      <p className="ajustes-mensagem" role="status">
        Enviado para a sua conta: {plural(resumo.jogos, 'jogo', 'jogos')},{' '}
        {plural(resumo.sessoes, 'sessão', 'sessões')} e{' '}
        {plural(resumo.registros, 'anotação', 'anotações')}. Agora eles aparecem em qualquer
        aparelho em que você entrar.
      </p>
    )
  }

  if (!pendentes || !temPendentes || (compacto && dispensado)) return null

  return (
    <div className="aviso cartao-envio-local" role="region" aria-label="Enviar dados para a conta">
      <CloudUpload size={18} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <p>
          Neste navegador há {plural(pendentes.jogos, 'jogo', 'jogos')},{' '}
          {plural(pendentes.sessoes, 'sessão', 'sessões')} e{' '}
          {plural(pendentes.registros, 'anotação', 'anotações')} que ainda não estão na sua
          conta. Envie para guardá-los na nuvem e usar em outros aparelhos.
        </p>

        {erro && (
          <p className="campo-erro" role="alert">
            {erro}
          </p>
        )}

        <div className="cartao-envio-acoes">
          <button
            type="button"
            className="botao-primario compacto"
            onClick={() => void enviar()}
            disabled={enviando}
          >
            {enviando ? 'Enviando...' : 'Enviar para a conta'}
          </button>
          {compacto && (
            <button type="button" className="botao-texto" onClick={() => setDispensado(true)}>
              Agora não
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

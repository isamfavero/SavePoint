import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { emailValido, ErroConta } from '../conta/autenticacao'
import { useConta } from '../contexts/ContaContext'

export function RecuperarSenha() {
  const navigate = useNavigate()
  const location = useLocation()
  const { servico } = useConta()
  const emailInicial = (location.state as { email?: string } | null)?.email ?? ''
  const [email, setEmail] = useState(emailInicial)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    if (!emailValido(email)) {
      setErro(email.trim() ? 'Esse e-mail não parece válido.' : 'Informe seu e-mail.')
      return
    }

    setErro(null)
    setEnviando(true)

    try {
      await servico.enviarRecuperacao(email.trim())
      setEnviado(true)
    } catch (falha) {
      setErro(
        falha instanceof ErroConta ? falha.message : 'Não foi possível enviar o link agora.',
      )
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="app-shell app-shell-formulario">
        <main className="app-main formulario-main">
          <div className="estado-vazio conta-confirmar">
            <span className="estado-vazio-icone" aria-hidden="true">
              <MailCheck size={24} strokeWidth={1.75} />
            </span>
            <h1>Confira seu e-mail</h1>
            <p>
              Se existir uma conta com <strong>{email.trim()}</strong>, você vai receber um
              link para criar uma nova senha.
            </p>
            <Link className="botao-primario compacto" to="/entrar" replace>
              Voltar para Entrar
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell app-shell-formulario">
      <main className="app-main formulario-main">
        <div className="formulario-topo">
          <button
            type="button"
            className="botao-voltar"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
          >
            <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <h1 className="formulario-titulo">Esqueci minha senha</h1>
        <p className="formulario-descricao">
          Informe o e-mail da sua conta e enviamos um link para criar uma senha nova.
        </p>

        <form id="form-recuperar" onSubmit={aoEnviar} noValidate>
          <div className="campo">
            <label className="campo-rotulo" htmlFor="recuperar-email">
              E-mail
            </label>
            <span className="campo-input">
              <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                id="recuperar-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(evento) => {
                  setEmail(evento.target.value)
                  setErro(null)
                }}
                autoComplete="email"
                placeholder="voce@exemplo.com"
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? 'recuperar-erro' : undefined}
                autoFocus
              />
            </span>
            {erro && (
              <p className="campo-erro" id="recuperar-erro" role="alert">
                {erro}
              </p>
            )}
          </div>
        </form>
      </main>

      <div className="form-acoes">
        <button type="submit" form="form-recuperar" className="botao-primario" disabled={enviando}>
          <KeyRound size={18} strokeWidth={2} aria-hidden="true" />
          {enviando ? 'Enviando...' : 'Enviar link'}
        </button>
      </div>
    </div>
  )
}

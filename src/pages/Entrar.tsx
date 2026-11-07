import { ArrowLeft, CloudUpload, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CampoSenha } from '../components/CampoSenha'
import { ErroConta, validarEntrada } from '../conta/autenticacao'
import type { ErrosEntrada } from '../conta/autenticacao'
import { useAviso } from '../contexts/AvisoContext'
import { useConta } from '../contexts/ContaContext'

export function Entrar() {
  const navigate = useNavigate()
  const { servico: servicoAutenticacao } = useConta()
  const { mostrarAviso } = useAviso()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<ErrosEntrada>({})
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  function voltar() {
    const indice = window.history.state?.idx

    if (typeof indice === 'number' && indice > 0) navigate(-1)
    else navigate('/biblioteca', { replace: true })
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setAviso(null)

    const novosErros = validarEntrada({ email, senha })
    setErros(novosErros)

    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)

    try {
      await servicoAutenticacao.entrar({ email: email.trim(), senha })
      mostrarAviso('Você entrou na sua conta.')
      navigate('/biblioteca', { replace: true })
    } catch (falha) {
      setAviso(
        falha instanceof ErroConta
          ? falha.message
          : 'Não foi possível entrar agora. Tente de novo em instantes.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="app-shell app-shell-formulario">
      <main className="app-main formulario-main">
        <div className="formulario-topo">
          <button type="button" className="botao-voltar" onClick={voltar} aria-label="Voltar">
            <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <h1 className="formulario-titulo">Entrar</h1>
        <p className="formulario-descricao">Bom te ver de novo. Seu diário está te esperando.</p>

        {!servicoAutenticacao.disponivel && (
          <div className="aviso conta-aviso">
            <CloudUpload size={18} strokeWidth={1.75} aria-hidden="true" />
            <p>
              Em breve: entrar com uma conta chega junto com a sincronização na nuvem.
              Até lá, tudo continua salvo neste aparelho.
            </p>
          </div>
        )}

        <form id="form-entrar" onSubmit={aoEnviar} noValidate>
          <div className="campo">
            <label className="campo-rotulo" htmlFor="entrar-email">
              E-mail
            </label>
            <span className="campo-input">
              <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                id="entrar-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(evento) => {
                  setEmail(evento.target.value)
                  if (erros.email) setErros((atuais) => ({ ...atuais, email: undefined }))
                }}
                autoComplete="email"
                placeholder="voce@exemplo.com"
                aria-invalid={Boolean(erros.email)}
                aria-describedby={erros.email ? 'entrar-email-erro' : undefined}
              />
            </span>
            {erros.email && (
              <p className="campo-erro" id="entrar-email-erro" role="alert">
                {erros.email}
              </p>
            )}
          </div>

          <CampoSenha
            id="entrar-senha"
            rotulo="Senha"
            valor={senha}
            aoMudar={(valor) => {
              setSenha(valor)
              if (erros.senha) setErros((atuais) => ({ ...atuais, senha: undefined }))
            }}
            autoComplete="current-password"
            erro={erros.senha}
          />

          <p className="conta-esqueci">
            <Link to="/recuperar-senha" state={{ email }}>
              Esqueci minha senha
            </Link>
          </p>

          {aviso && (
            <p className="conta-retorno" role="status">
              {aviso}
            </p>
          )}
        </form>
      </main>

      <div className="form-acoes">
        <button type="submit" form="form-entrar" className="botao-primario" disabled={enviando}>
          <LogIn size={18} strokeWidth={2} aria-hidden="true" />
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="conta-alternativa">
          Ainda não tem conta? <Link to="/criar-conta" replace>Criar conta</Link>
        </p>
      </div>
    </div>
  )
}

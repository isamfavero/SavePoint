import {
  ArrowLeft,
  CloudUpload,
  Mail,
  MailCheck,
  UserRound,
  UserRoundPlus,
} from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CampoSenha } from '../components/CampoSenha'
import {
  avaliarSenha,
  ErroConta,
  TAMANHO_MINIMO_SENHA,
  validarCadastro,
} from '../conta/autenticacao'
import type { ErrosCadastro } from '../conta/autenticacao'
import { useAviso } from '../contexts/AvisoContext'
import { useConta } from '../contexts/ContaContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'

const TEXTO_FORCA = {
  fraca: 'Senha fraca',
  media: 'Senha razoável',
  forte: 'Senha forte',
} as const

export function CriarConta() {
  const navigate = useNavigate()
  const { servico: servicoAutenticacao } = useConta()
  const { mostrarAviso } = useAviso()
  const servicoDados = useServicoSavePoint()
  const [emailParaConfirmar, setEmailParaConfirmar] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState<ErrosCadastro>({})
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const forca = avaliarSenha(senha)

  function voltar() {
    const indice = window.history.state?.idx

    if (typeof indice === 'number' && indice > 0) navigate(-1)
    else navigate('/biblioteca', { replace: true })
  }

  function limparErro(campo: keyof ErrosCadastro) {
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setAviso(null)

    const novosErros = validarCadastro({ nome, email, senha, confirmacao })
    setErros(novosErros)

    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)

    try {
      const resultado = await servicoAutenticacao.criarConta({
        nome: nome.trim(),
        email: email.trim(),
        senha,
      })

      if (resultado.confirmarEmail) {
        setEmailParaConfirmar(email.trim())
        return
      }

      mostrarAviso('Conta criada e conectada.')
      // Conta nova: o próximo passo é cadastrar o primeiro jogo.
      const jogos = await servicoDados.listarJogos().catch(() => [])
      navigate(jogos.length === 0 ? '/boas-vindas?etapa=jogo' : '/biblioteca', { replace: true })
    } catch (falha) {
      setAviso(
        falha instanceof ErroConta
          ? falha.message
          : 'Não foi possível criar a conta agora. Tente de novo em instantes.',
      )
    } finally {
      setEnviando(false)
    }
  }

  if (emailParaConfirmar) {
    return (
      <div className="app-shell app-shell-formulario">
        <main className="app-main formulario-main">
          <div className="estado-vazio conta-confirmar">
            <span className="estado-vazio-icone" aria-hidden="true">
              <MailCheck size={24} strokeWidth={1.75} />
            </span>
            <h1>Confira seu e-mail</h1>
            <p>
              Enviamos um link para <strong>{emailParaConfirmar}</strong>. Abra o e-mail,
              confirme a conta e depois entre por aqui.
            </p>
            <Link className="botao-primario compacto" to="/entrar" replace>
              Ir para Entrar
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
          <button type="button" className="botao-voltar" onClick={voltar} aria-label="Voltar">
            <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <span className="selo-novo">
            <UserRoundPlus size={11} strokeWidth={1.75} aria-hidden="true" />
            NOVA CONTA
          </span>
        </div>

        <h1 className="formulario-titulo">Criar conta</h1>
        <p className="formulario-descricao">
          Com uma conta, seus jogos e anotações ficam guardados na nuvem e aparecem em
          qualquer aparelho.
        </p>

        {!servicoAutenticacao.disponivel && (
          <div className="aviso conta-aviso">
            <CloudUpload size={18} strokeWidth={1.75} aria-hidden="true" />
            <p>
              Em breve: as contas ficam ativas junto com a sincronização na nuvem. Até
              lá, tudo continua salvo neste aparelho.
            </p>
          </div>
        )}

        <form id="form-criar-conta" onSubmit={aoEnviar} noValidate>
          <div className="campo">
            <label className="campo-rotulo" htmlFor="conta-nome">
              Como quer ser chamado?
            </label>
            <span className="campo-input">
              <UserRound size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                id="conta-nome"
                type="text"
                value={nome}
                onChange={(evento) => {
                  setNome(evento.target.value)
                  limparErro('nome')
                }}
                autoComplete="nickname"
                placeholder="Seu nome ou apelido"
                aria-invalid={Boolean(erros.nome)}
                aria-describedby={erros.nome ? 'conta-nome-erro' : undefined}
              />
            </span>
            {erros.nome && (
              <p className="campo-erro" id="conta-nome-erro" role="alert">
                {erros.nome}
              </p>
            )}
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="conta-email">
              E-mail
            </label>
            <span className="campo-input">
              <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                id="conta-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(evento) => {
                  setEmail(evento.target.value)
                  limparErro('email')
                }}
                autoComplete="email"
                placeholder="voce@exemplo.com"
                aria-invalid={Boolean(erros.email)}
                aria-describedby={erros.email ? 'conta-email-erro' : undefined}
              />
            </span>
            {erros.email && (
              <p className="campo-erro" id="conta-email-erro" role="alert">
                {erros.email}
              </p>
            )}
          </div>

          <CampoSenha
            id="conta-senha"
            rotulo="Senha"
            valor={senha}
            aoMudar={(valor) => {
              setSenha(valor)
              limparErro('senha')
            }}
            autoComplete="new-password"
            erro={erros.senha}
            ajuda={
              senha ? (
                <span className={`forca-senha forca-${forca}`}>
                  <span className="forca-barra" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  {TEXTO_FORCA[forca]}
                </span>
              ) : (
                `Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres, com letras e números.`
              )
            }
          />

          <CampoSenha
            id="conta-confirmacao"
            rotulo="Repita a senha"
            valor={confirmacao}
            aoMudar={(valor) => {
              setConfirmacao(valor)
              limparErro('confirmacao')
            }}
            autoComplete="new-password"
            erro={erros.confirmacao}
          />

          {aviso && (
            <p className="conta-retorno" role="status">
              {aviso}
            </p>
          )}
        </form>
      </main>

      <div className="form-acoes">
        <button type="submit" form="form-criar-conta" className="botao-primario" disabled={enviando}>
          <UserRoundPlus size={18} strokeWidth={2} aria-hidden="true" />
          {enviando ? 'Criando conta...' : 'Criar conta'}
        </button>
        <p className="conta-alternativa">
          Já tem conta? <Link to="/entrar" replace>Entrar</Link>
        </p>
      </div>
    </div>
  )
}

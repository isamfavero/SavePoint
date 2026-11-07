import { Check } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CampoSenha } from '../components/CampoSenha'
import { ErroConta, TAMANHO_MINIMO_SENHA, validarCadastro } from '../conta/autenticacao'
import { useAviso } from '../contexts/AvisoContext'
import { useConta } from '../contexts/ContaContext'

export function RedefinirSenha() {
  const navigate = useNavigate()
  const { servico, usuario, carregando, concluirRecuperacao } = useConta()
  const { mostrarAviso } = useAviso()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string; geral?: string }>({})
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    // Reaproveita as regras de senha do cadastro.
    const { senha: erroSenha, confirmacao: erroConfirmacao } = validarCadastro({
      nome: 'x',
      email: 'x@x.co',
      senha,
      confirmacao,
    })

    setErros({ senha: erroSenha, confirmacao: erroConfirmacao })
    if (erroSenha || erroConfirmacao) return

    setEnviando(true)

    try {
      await servico.redefinirSenha(senha)
      concluirRecuperacao()
      mostrarAviso('Senha nova salva.')
      navigate('/biblioteca', { replace: true })
    } catch (falha) {
      setErros({
        geral: falha instanceof ErroConta ? falha.message : 'Não foi possível salvar a senha.',
      })
      setEnviando(false)
    }
  }

  // O link do e-mail abre uma sessão temporária; sem ela, não há o que redefinir.
  if (!carregando && !usuario) {
    return (
      <div className="app-shell app-shell-formulario">
        <main className="app-main formulario-main">
          <div className="estado-vazio conta-confirmar">
            <h1>Link expirado ou inválido</h1>
            <p>Peça um link novo para criar sua senha.</p>
            <Link className="botao-primario compacto" to="/recuperar-senha" replace>
              Pedir outro link
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell app-shell-formulario">
      <main className="app-main formulario-main">
        <h1 className="formulario-titulo">Criar senha nova</h1>
        <p className="formulario-descricao">
          Use pelo menos {TAMANHO_MINIMO_SENHA} caracteres, com letras e números.
        </p>

        <form id="form-redefinir" onSubmit={aoEnviar} noValidate>
          <CampoSenha
            id="nova-senha"
            rotulo="Senha nova"
            valor={senha}
            aoMudar={setSenha}
            autoComplete="new-password"
            erro={erros.senha}
          />
          <CampoSenha
            id="nova-senha-confirmacao"
            rotulo="Repita a senha nova"
            valor={confirmacao}
            aoMudar={setConfirmacao}
            autoComplete="new-password"
            erro={erros.confirmacao}
          />
          {erros.geral && (
            <p className="campo-erro" role="alert">
              {erros.geral}
            </p>
          )}
        </form>
      </main>

      <div className="form-acoes">
        <button
          type="submit"
          form="form-redefinir"
          className="botao-primario"
          disabled={enviando || carregando}
        >
          <Check size={18} strokeWidth={2} aria-hidden="true" />
          {enviando ? 'Salvando...' : 'Salvar senha nova'}
        </button>
      </div>
    </div>
  )
}

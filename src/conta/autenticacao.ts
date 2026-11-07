/**
 * Contas de usuário. As telas falam só com esta interface: quando o Supabase
 * entrar (Fatia 7), basta trocar a implementação em `servicoAutenticacao`.
 */

export const TAMANHO_MINIMO_SENHA = 8

export type DadosCadastro = {
  nome: string
  email: string
  senha: string
  confirmacao: string
}

export type DadosEntrada = {
  email: string
  senha: string
}

export type ErrosCadastro = Partial<Record<keyof DadosCadastro, string>>
export type ErrosEntrada = Partial<Record<keyof DadosEntrada, string>>

const PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function emailValido(email: string): boolean {
  return PADRAO_EMAIL.test(email.trim())
}

export type ForcaSenha = 'fraca' | 'media' | 'forte'

export function avaliarSenha(senha: string): ForcaSenha {
  if (senha.length < TAMANHO_MINIMO_SENHA) return 'fraca'

  const variedade = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((regra) =>
    regra.test(senha),
  ).length

  if (senha.length >= 12 && variedade >= 3) return 'forte'
  return variedade >= 2 ? 'media' : 'fraca'
}

export function validarCadastro(dados: DadosCadastro): ErrosCadastro {
  const erros: ErrosCadastro = {}

  if (!dados.nome.trim()) erros.nome = 'Informe como quer ser chamado.'

  if (!dados.email.trim()) erros.email = 'Informe seu e-mail.'
  else if (!emailValido(dados.email)) erros.email = 'Esse e-mail não parece válido.'

  if (!dados.senha) {
    erros.senha = 'Crie uma senha.'
  } else if (dados.senha.length < TAMANHO_MINIMO_SENHA) {
    erros.senha = `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`
  } else if (!/[A-Za-z]/.test(dados.senha) || !/\d/.test(dados.senha)) {
    erros.senha = 'Use letras e números na senha.'
  }

  if (!dados.confirmacao) erros.confirmacao = 'Repita a senha.'
  else if (dados.confirmacao !== dados.senha) erros.confirmacao = 'As senhas não são iguais.'

  return erros
}

export function validarEntrada(dados: DadosEntrada): ErrosEntrada {
  const erros: ErrosEntrada = {}

  if (!dados.email.trim()) erros.email = 'Informe seu e-mail.'
  else if (!emailValido(dados.email)) erros.email = 'Esse e-mail não parece válido.'

  if (!dados.senha) erros.senha = 'Informe sua senha.'

  return erros
}

export class ErroConta extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroConta'
  }
}

export type Usuario = {
  id: string
  email: string
  nome: string
}

export type ResultadoCadastro = {
  /** true quando o Supabase pede para confirmar o e-mail antes de entrar. */
  confirmarEmail: boolean
}

export interface ServicoAutenticacao {
  /** Diz se as contas já funcionam (a nuvem está configurada). */
  readonly disponivel: boolean
  criarConta(dados: { nome: string; email: string; senha: string }): Promise<ResultadoCadastro>
  entrar(dados: DadosEntrada): Promise<void>
  sair(): Promise<void>
  enviarRecuperacao(email: string): Promise<void>
  redefinirSenha(novaSenha: string): Promise<void>
  obterUsuario(): Promise<Usuario | null>
  /** Avisa quando a pessoa entra ou sai. `recuperando` indica o link de nova senha. */
  aoMudar(callback: (usuario: Usuario | null, recuperando: boolean) => void): () => void
}

export const MENSAGEM_CONTAS_EM_BREVE =
  'As contas ficam ativas quando a sincronização na nuvem for ligada. Por enquanto, tudo continua salvo neste aparelho.'

/** Implementação usada sem Supabase configurado: nenhuma senha é guardada. */
export const autenticacaoIndisponivel: ServicoAutenticacao = {
  disponivel: false,
  async criarConta() {
    throw new ErroConta(MENSAGEM_CONTAS_EM_BREVE)
  },
  async entrar() {
    throw new ErroConta(MENSAGEM_CONTAS_EM_BREVE)
  },
  async sair() {},
  async enviarRecuperacao() {
    throw new ErroConta(MENSAGEM_CONTAS_EM_BREVE)
  },
  async redefinirSenha() {
    throw new ErroConta(MENSAGEM_CONTAS_EM_BREVE)
  },
  async obterUsuario() {
    return null
  },
  aoMudar() {
    return () => {}
  },
}

// ---------- Supabase ----------

type ErroSupabase = { message?: string; code?: string; status?: number } | null

type UsuarioSupabase = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

/** O pedaço do cliente do Supabase que o app usa (facilita testar sem rede). */
export type ClienteAuthSupabase = {
  auth: {
    signUp(dados: {
      email: string
      password: string
      options?: { data?: Record<string, unknown>; emailRedirectTo?: string }
    }): Promise<{ data: { session: unknown | null }; error: ErroSupabase }>
    signInWithPassword(dados: {
      email: string
      password: string
    }): Promise<{ error: ErroSupabase }>
    signOut(): Promise<{ error: ErroSupabase }>
    resetPasswordForEmail(
      email: string,
      opcoes?: { redirectTo?: string },
    ): Promise<{ error: ErroSupabase }>
    updateUser(dados: { password: string }): Promise<{ error: ErroSupabase }>
    getUser(): Promise<{ data: { user: UsuarioSupabase | null }; error: ErroSupabase }>
    onAuthStateChange(
      callback: (evento: string, sessao: { user: UsuarioSupabase } | null) => void,
    ): { data: { subscription: { unsubscribe(): void } } }
  }
}

/** Traduz os erros do Supabase para mensagens em português. */
export function traduzirErroSupabase(erro: NonNullable<ErroSupabase>): ErroConta {
  // Registro técnico no console do navegador (F12), sem senhas: só código e mensagem.
  if (import.meta.env.MODE !== 'test') {
    console.warn('[SavePoint] Supabase recusou:', erro.status, erro.code, erro.message)
  }

  const codigo = erro.code ?? ''
  const mensagem = (erro.message ?? '').toLowerCase()

  if (codigo === 'invalid_credentials' || mensagem.includes('invalid login credentials')) {
    return new ErroConta('E-mail ou senha incorretos.')
  }
  if (codigo === 'user_already_exists' || codigo === 'email_exists' || mensagem.includes('already registered')) {
    return new ErroConta('Já existe uma conta com esse e-mail. Tente entrar.')
  }
  if (codigo === 'email_not_confirmed' || mensagem.includes('email not confirmed')) {
    return new ErroConta('Confirme seu e-mail pelo link que enviamos antes de entrar.')
  }
  if (codigo === 'weak_password' || mensagem.includes('password should')) {
    return new ErroConta('Essa senha é fraca demais. Use uma senha mais longa e variada.')
  }
  if (codigo === 'same_password') {
    return new ErroConta('A nova senha precisa ser diferente da atual.')
  }
  if (codigo === 'over_email_send_rate_limit' || mensagem.includes('email rate limit')) {
    return new ErroConta(
      'O Supabase atingiu o limite de e-mails por hora do plano gratuito. Espere um pouco ou desative a confirmação de e-mail no painel enquanto testa.',
    )
  }
  if (codigo.startsWith('over_') || erro.status === 429 || mensagem.includes('rate limit')) {
    return new ErroConta('Muitas tentativas seguidas. Espere alguns minutos e tente de novo.')
  }
  // Projeto novo do Supabase: o envio de e-mail padrão só aceita endereços da equipe do projeto.
  if (codigo === 'email_address_not_authorized' || mensagem.includes('not authorized')) {
    return new ErroConta(
      'O Supabase ainda não pode mandar e-mail para esse endereço. No painel, desative "Confirm email" em Authentication > Sign In / Providers > Email, ou use o mesmo e-mail da sua conta do Supabase.',
    )
  }
  if (codigo === 'email_address_invalid' || mensagem.includes('email address') && mensagem.includes('invalid')) {
    return new ErroConta('O Supabase recusou esse e-mail. Confira se ele está certo.')
  }
  if (codigo === 'signup_disabled' || codigo === 'email_provider_disabled' || mensagem.includes('signups not allowed')) {
    return new ErroConta(
      'Novos cadastros estão desligados no Supabase. Ative "Allow new users to sign up" e o provedor Email em Authentication.',
    )
  }
  if (mensagem.includes('invalid api key') || mensagem.includes('no api key') || erro.status === 401) {
    return new ErroConta(
      'A chave do Supabase no arquivo .env não foi aceita. Confira se copiou a chave pública (publishable ou anon) inteira e reinicie o app.',
    )
  }
  if (mensagem.includes('error sending') && mensagem.includes('email')) {
    return new ErroConta(
      'O Supabase não conseguiu enviar o e-mail de confirmação. Desative "Confirm email" no painel enquanto testa, ou configure um SMTP próprio.',
    )
  }
  if (mensagem.includes('fetch') || mensagem.includes('network')) {
    return new ErroConta('Sem conexão com o Supabase. Confira a internet e a URL no arquivo .env.')
  }

  // Caso não previsto: mostra o motivo técnico para facilitar o diagnóstico.
  const detalhe = [erro.code, erro.message].filter(Boolean).join(': ')
  return new ErroConta(
    `Algo deu errado com a sua conta. Tente de novo em instantes.${detalhe ? ` (Detalhe: ${detalhe})` : ''}`,
  )
}

function paraUsuario(usuario: UsuarioSupabase | null | undefined): Usuario | null {
  if (!usuario) return null

  const email = usuario.email ?? ''
  const nome = typeof usuario.user_metadata?.nome === 'string' ? usuario.user_metadata.nome : ''

  return { id: usuario.id, email, nome: nome || email.split('@')[0] }
}

export function criarAutenticacaoSupabase(
  cliente: ClienteAuthSupabase,
  origem: string,
): ServicoAutenticacao {
  async function exigirSemErro(promessa: Promise<{ error: ErroSupabase }>) {
    let resposta: { error: ErroSupabase }

    try {
      resposta = await promessa
    } catch {
      throw new ErroConta('Sem conexão com a internet. Confira a rede e tente de novo.')
    }

    if (resposta.error) throw traduzirErroSupabase(resposta.error)
  }

  return {
    disponivel: true,

    async criarConta({ nome, email, senha }) {
      let resposta

      try {
        resposta = await cliente.auth.signUp({
          email,
          password: senha,
          // Depois de confirmar o e-mail, a pessoa já cai no cadastro do primeiro jogo.
          options: { data: { nome }, emailRedirectTo: `${origem}/boas-vindas?etapa=jogo` },
        })
      } catch {
        throw new ErroConta('Sem conexão com a internet. Confira a rede e tente de novo.')
      }

      if (resposta.error) throw traduzirErroSupabase(resposta.error)
      return { confirmarEmail: !resposta.data.session }
    },

    async entrar({ email, senha }) {
      await exigirSemErro(cliente.auth.signInWithPassword({ email, password: senha }))
    },

    async sair() {
      await exigirSemErro(cliente.auth.signOut())
    },

    async enviarRecuperacao(email) {
      await exigirSemErro(
        cliente.auth.resetPasswordForEmail(email, { redirectTo: `${origem}/redefinir-senha` }),
      )
    },

    async redefinirSenha(novaSenha) {
      await exigirSemErro(cliente.auth.updateUser({ password: novaSenha }))
    },

    async obterUsuario() {
      try {
        const { data, error } = await cliente.auth.getUser()
        return error ? null : paraUsuario(data.user)
      } catch {
        return null
      }
    },

    aoMudar(callback) {
      const { data } = cliente.auth.onAuthStateChange((evento, sessao) => {
        callback(paraUsuario(sessao?.user), evento === 'PASSWORD_RECOVERY')
      })

      return () => data.subscription.unsubscribe()
    },
  }
}

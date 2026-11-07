import { describe, expect, it, vi } from 'vitest'
import {
  autenticacaoIndisponivel,
  avaliarSenha,
  criarAutenticacaoSupabase,
  emailValido,
  traduzirErroSupabase,
  validarCadastro,
  validarEntrada,
} from '../autenticacao'
import type { ClienteAuthSupabase } from '../autenticacao'

function clienteFalso(sobrescrever: Partial<ClienteAuthSupabase['auth']> = {}) {
  const auth: ClienteAuthSupabase['auth'] = {
    signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
    getUser: vi.fn(async () => ({
      data: { user: { id: 'u1', email: 'isa@exemplo.com', user_metadata: { nome: 'Isa' } } },
      error: null,
    })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    ...sobrescrever,
  }

  return { auth }
}

describe('autenticação com Supabase', () => {
  it('cria conta guardando o nome e avisando quando precisa confirmar o e-mail', async () => {
    const cliente = clienteFalso()
    const servico = criarAutenticacaoSupabase(cliente, 'http://localhost:5173')

    const resultado = await servico.criarConta({
      nome: 'Isa',
      email: 'isa@exemplo.com',
      senha: 'torre2026',
    })

    expect(resultado.confirmarEmail).toBe(true)
    expect(cliente.auth.signUp).toHaveBeenCalledWith({
      email: 'isa@exemplo.com',
      password: 'torre2026',
      options: { data: { nome: 'Isa' }, emailRedirectTo: 'http://localhost:5173/boas-vindas?etapa=jogo' },
    })
  })

  it('traduz erros do Supabase para português', async () => {
    const servico = criarAutenticacaoSupabase(
      clienteFalso({
        signInWithPassword: async () => ({
          error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
        }),
      }),
      'http://localhost:5173',
    )

    await expect(servico.entrar({ email: 'isa@exemplo.com', senha: 'errada1' })).rejects.toThrow(
      'E-mail ou senha incorretos.',
    )
    expect(traduzirErroSupabase({ code: 'user_already_exists' }).message).toContain('Já existe')
    expect(traduzirErroSupabase({ status: 429, code: 'over_email_send_rate_limit' }).message)
      .toContain('limite de e-mails')
    expect(traduzirErroSupabase({ status: 429, code: 'over_request_rate_limit' }).message)
      .toContain('Muitas tentativas')
  })

  it('explica os erros comuns de um projeto novo do Supabase', () => {
    expect(
      traduzirErroSupabase({ status: 400, code: 'email_address_not_authorized' }).message,
    ).toContain('Confirm email')
    expect(traduzirErroSupabase({ status: 401, message: 'Invalid API key' }).message).toContain(
      '.env',
    )
    expect(traduzirErroSupabase({ code: 'signup_disabled' }).message).toContain('cadastros')
    expect(
      traduzirErroSupabase({ status: 500, message: 'Error sending confirmation email' }).message,
    ).toContain('enviar o e-mail')
  })

  it('em caso não previsto, mostra o motivo técnico', () => {
    expect(
      traduzirErroSupabase({ status: 500, code: 'unexpected_failure', message: 'Database error' })
        .message,
    ).toContain('Detalhe: unexpected_failure: Database error')
  })

  it('manda o link de recuperação para a tela de senha nova', async () => {
    const cliente = clienteFalso()
    const servico = criarAutenticacaoSupabase(cliente, 'https://savepoint.app')

    await servico.enviarRecuperacao('isa@exemplo.com')

    expect(cliente.auth.resetPasswordForEmail).toHaveBeenCalledWith('isa@exemplo.com', {
      redirectTo: 'https://savepoint.app/redefinir-senha',
    })
  })

  it('lê o usuário com o nome do cadastro', async () => {
    const servico = criarAutenticacaoSupabase(clienteFalso(), 'http://localhost:5173')
    expect(await servico.obterUsuario()).toEqual({
      id: 'u1',
      email: 'isa@exemplo.com',
      nome: 'Isa',
    })
  })

  it('sem internet, explica em vez de travar', async () => {
    const servico = criarAutenticacaoSupabase(
      clienteFalso({
        signInWithPassword: async () => {
          throw new TypeError('Failed to fetch')
        },
      }),
      'http://localhost:5173',
    )

    await expect(servico.entrar({ email: 'a@b.co', senha: 'x' })).rejects.toThrow('Sem conexão')
  })
})

const valido = {
  nome: 'Isa',
  email: 'isa@exemplo.com',
  senha: 'torre2026',
  confirmacao: 'torre2026',
}

describe('validarCadastro', () => {
  it('aceita um cadastro completo', () => {
    expect(validarCadastro(valido)).toEqual({})
  })

  it('aponta cada campo com problema', () => {
    expect(validarCadastro({ nome: ' ', email: 'isa@', senha: 'curta1', confirmacao: 'x' })).toEqual({
      nome: 'Informe como quer ser chamado.',
      email: 'Esse e-mail não parece válido.',
      senha: 'A senha precisa ter pelo menos 8 caracteres.',
      confirmacao: 'As senhas não são iguais.',
    })
  })

  it('exige letras e números na senha', () => {
    expect(validarCadastro({ ...valido, senha: 'somenteletras', confirmacao: 'somenteletras' }).senha)
      .toBe('Use letras e números na senha.')
  })
})

describe('validarEntrada', () => {
  it('pede e-mail válido e senha', () => {
    expect(validarEntrada({ email: '', senha: '' })).toEqual({
      email: 'Informe seu e-mail.',
      senha: 'Informe sua senha.',
    })
    expect(validarEntrada({ email: 'isa@exemplo.com', senha: 'x' })).toEqual({})
  })
})

describe('apoios', () => {
  it('reconhece e-mails', () => {
    expect(emailValido(' isa@exemplo.com.br ')).toBe(true)
    expect(emailValido('isa@exemplo')).toBe(false)
  })

  it('mede a força da senha', () => {
    expect(avaliarSenha('abc')).toBe('fraca')
    expect(avaliarSenha('torre2026')).toBe('media')
    expect(avaliarSenha('Torre-da-Lua-2026')).toBe('forte')
  })

  it('enquanto a nuvem não existe, não cria conta nem guarda senha', async () => {
    expect(autenticacaoIndisponivel.disponivel).toBe(false)
    await expect(
      autenticacaoIndisponivel.criarConta({ nome: 'Isa', email: 'isa@exemplo.com', senha: 'x' }),
    ).rejects.toThrow('sincronização na nuvem')
  })
})

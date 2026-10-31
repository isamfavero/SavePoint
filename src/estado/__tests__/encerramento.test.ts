import { describe, expect, it } from 'vitest'
import {
  CHAVE_ENCERRAMENTO,
  lerInstanteEncerramento,
  limparInstanteEncerramento,
  salvarInstanteEncerramento,
} from '../encerramento'

function criarArmazenamento(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial))

  return {
    dados,
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => {
      dados.set(chave, valor)
    },
    removeItem: (chave: string) => {
      dados.delete(chave)
    },
  }
}

const armazenamentoQuebrado = {
  getItem: () => {
    throw new Error('bloqueado')
  },
  setItem: () => {
    throw new Error('bloqueado')
  },
  removeItem: () => {
    throw new Error('bloqueado')
  },
}

describe('instante de encerramento no sessionStorage', () => {
  it('salva e lê o instante da sessão', () => {
    const armazenamento = criarArmazenamento()
    const instante = new Date('2026-01-01T10:42:10.000Z')

    salvarInstanteEncerramento('sessao-1', instante, armazenamento)

    expect(lerInstanteEncerramento('sessao-1', armazenamento)).toEqual(instante)
  })

  it('ignora o instante guardado para outra sessão', () => {
    const armazenamento = criarArmazenamento()
    salvarInstanteEncerramento('sessao-1', new Date(), armazenamento)

    expect(lerInstanteEncerramento('sessao-2', armazenamento)).toBeNull()
  })

  it('limpa o instante guardado', () => {
    const armazenamento = criarArmazenamento()
    salvarInstanteEncerramento('sessao-1', new Date(), armazenamento)

    limparInstanteEncerramento(armazenamento)

    expect(lerInstanteEncerramento('sessao-1', armazenamento)).toBeNull()
  })

  it('trata valor inválido como ausência de instante', () => {
    const armazenamento = criarArmazenamento({
      [CHAVE_ENCERRAMENTO]: 'isto não é json',
    })

    expect(lerInstanteEncerramento('sessao-1', armazenamento)).toBeNull()
  })

  it('segue funcionando quando o armazenamento lança erro', () => {
    expect(lerInstanteEncerramento('sessao-1', armazenamentoQuebrado)).toBeNull()
    expect(() =>
      salvarInstanteEncerramento('sessao-1', new Date(), armazenamentoQuebrado),
    ).not.toThrow()
    expect(() => limparInstanteEncerramento(armazenamentoQuebrado)).not.toThrow()
  })
})

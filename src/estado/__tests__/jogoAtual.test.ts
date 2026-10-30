import { describe, expect, it } from 'vitest'
import {
  lerJogoAtualId,
  limparJogoAtualId,
  salvarJogoAtualId,
} from '../jogoAtual'
import type { ArmazenamentoJogoAtual } from '../jogoAtual'

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
  } satisfies ArmazenamentoJogoAtual & { dados: Map<string, string> }
}

const armazenamentoQuebrado: ArmazenamentoJogoAtual = {
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

describe('jogo atual no localStorage', () => {
  it('lê, salva e limpa o id', () => {
    const armazenamento = criarArmazenamento()

    expect(lerJogoAtualId(armazenamento)).toBeNull()

    salvarJogoAtualId('jogo-1', armazenamento)
    expect(lerJogoAtualId(armazenamento)).toBe('jogo-1')

    limparJogoAtualId(armazenamento)
    expect(lerJogoAtualId(armazenamento)).toBeNull()
  })

  it('trata valores vazios como ausência de jogo atual', () => {
    const armazenamento = criarArmazenamento({ 'savepoint:jogo-atual': '   ' })
    expect(lerJogoAtualId(armazenamento)).toBeNull()
  })

  it('segue funcionando quando o armazenamento lança erro', () => {
    expect(lerJogoAtualId(armazenamentoQuebrado)).toBeNull()
    expect(() => salvarJogoAtualId('jogo-1', armazenamentoQuebrado)).not.toThrow()
    expect(() => limparJogoAtualId(armazenamentoQuebrado)).not.toThrow()
  })
})

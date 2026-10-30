import { describe, expect, it } from 'vitest'
import { calcularDimensoesReduzidas } from '../imagem'

describe('calcularDimensoesReduzidas', () => {
  it('reduz a largura para o limite preservando a proporção', () => {
    expect(calcularDimensoesReduzidas(1600, 900)).toEqual({ largura: 800, altura: 450 })
  })

  it('não amplia imagens menores que o limite', () => {
    expect(calcularDimensoesReduzidas(400, 300)).toEqual({ largura: 400, altura: 300 })
  })

  it('mantém a imagem intacta quando já está exatamente no limite', () => {
    expect(calcularDimensoesReduzidas(800, 1200)).toEqual({ largura: 800, altura: 1200 })
  })

  it('respeita um limite personalizado', () => {
    expect(calcularDimensoesReduzidas(1000, 500, 320)).toEqual({
      largura: 320,
      altura: 160,
    })
  })

  it('garante altura mínima de 1 pixel', () => {
    expect(calcularDimensoesReduzidas(4000, 1, 800)).toEqual({ largura: 800, altura: 1 })
  })

  it('rejeita dimensões inválidas', () => {
    expect(() => calcularDimensoesReduzidas(0, 100)).toThrow()
    expect(() => calcularDimensoesReduzidas(100, -1)).toThrow()
    expect(() => calcularDimensoesReduzidas(100, 100, 0)).toThrow()
  })
})

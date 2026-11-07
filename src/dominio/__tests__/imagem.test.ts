import { describe, expect, it } from 'vitest'
import {
  areaDeRecorte,
  calcularDimensoesReduzidas,
  dimensoesDaCapa,
  escalaDeCobertura,
  limitarCentro,
  quadroDeCapa,
} from '../imagem'

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

describe('recorte da capa em 3x4', () => {
  const quadro = quadroDeCapa(240) // 240 x 320

  it('o quadro é sempre 3x4', () => {
    expect(quadro.altura / quadro.largura).toBeCloseTo(4 / 3)
  })

  it('a escala de cobertura preenche o lado que mais falta', () => {
    // Foto horizontal 1600x900: falta altura, então a escala vem da altura.
    expect(escalaDeCobertura({ largura: 1600, altura: 900 }, quadro)).toBeCloseTo(320 / 900)
    // Foto vertical 600x1200: falta largura.
    expect(escalaDeCobertura({ largura: 600, altura: 1200 }, quadro)).toBeCloseTo(240 / 600)
  })

  it('com zoom 1 a imagem cobre o quadro e só dá para mover no lado que sobra', () => {
    const imagem = { largura: 1600, altura: 900 }
    const escala = escalaDeCobertura(imagem, quadro)

    const centro = limitarCentro({ x: 0, y: 0 }, imagem, quadro, escala)
    // Altura inteira (sobra zero): fica no meio. Largura sobra: encosta na borda esquerda.
    expect(centro.y).toBeCloseTo(0.5)
    expect(centro.x).toBeCloseTo(240 / (2 * escala * 1600))

    const direita = limitarCentro({ x: 1, y: 1 }, imagem, quadro, escala)
    expect(direita.x).toBeCloseTo(1 - 240 / (2 * escala * 1600))
  })

  it('a área de recorte tem sempre a proporção 3x4, em qualquer zoom e posição', () => {
    const imagem = { largura: 1600, altura: 900 }
    const base = escalaDeCobertura(imagem, quadro)

    for (const zoom of [1, 1.7, 3]) {
      const escala = base * zoom
      const centro = limitarCentro({ x: 0.6, y: 0.4 }, imagem, quadro, escala)
      const area = areaDeRecorte(centro, imagem, quadro, escala)

      expect(area.largura / area.altura).toBeCloseTo(3 / 4)
      // Nunca sai da foto.
      expect(area.x).toBeGreaterThanOrEqual(-1e-6)
      expect(area.y).toBeGreaterThanOrEqual(-1e-6)
      expect(area.x + area.largura).toBeLessThanOrEqual(imagem.largura + 1e-6)
      expect(area.y + area.altura).toBeLessThanOrEqual(imagem.altura + 1e-6)
    }
  })

  it('mais zoom recorta uma área menor da foto', () => {
    const imagem = { largura: 1000, altura: 1000 }
    const base = escalaDeCobertura(imagem, quadro)
    const centro = { x: 0.5, y: 0.5 }

    const normal = areaDeRecorte(centro, imagem, quadro, base)
    const ampliada = areaDeRecorte(centro, imagem, quadro, base * 2)

    expect(ampliada.largura).toBeCloseTo(normal.largura / 2)
  })

  it('a capa final é 3x4, com no máximo 600 de largura e sem ampliar a foto', () => {
    expect(dimensoesDaCapa({ x: 0, y: 0, largura: 1200, altura: 1600 })).toEqual({
      largura: 600,
      altura: 800,
    })
    expect(dimensoesDaCapa({ x: 0, y: 0, largura: 300, altura: 400 })).toEqual({
      largura: 300,
      altura: 400,
    })
  })
})

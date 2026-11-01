import { describe, expect, it } from 'vitest'
import { calcularRotulosTrilha } from '../TrilhaCronologica'

function sessao(id: string, numero: number, horas: number): any {
  const inicio = new Date('2026-01-01T10:00:00.000Z')
  const fim = new Date(inicio.getTime() + horas * 3_600_000)
  return { id, numero, inicio, fim, tempoPausado: 0, pausadoEm: null }
}

describe('calcularRotulosTrilha', () => {
  it('retorna vazio sem sessões', () => {
    expect(calcularRotulosTrilha([], 0)).toEqual([])
  })

  it('mostra apenas 0h e o total com uma única sessão', () => {
    const sessoes = [sessao('s1', 1, 2.5)]
    const rotulos = calcularRotulosTrilha(sessoes, 2.5)

    expect(rotulos.map((r) => r.texto)).toEqual(['0h', '2h30'])
    expect(rotulos[0]).toMatchObject({ posicao: 0, texto: '0h', ehUltimo: false })
    expect(rotulos[1]).toMatchObject({ posicao: 100, texto: '2h30', ehUltimo: true })
  })

  it('formata horas com minutos quando não zero', () => {
    const sessoes = [sessao('s1', 1, 12.5)]
    const rotulos = calcularRotulosTrilha(sessoes, 12.5)

    expect(rotulos.map((r) => r.texto)).toEqual(['0h', '12h30'])
  })

  it('omite minutos quando são zero', () => {
    const sessoes = [sessao('s1', 1, 3)]
    const rotulos = calcularRotulosTrilha(sessoes, 3)

    expect(rotulos.map((r) => r.texto)).toEqual(['0h', '3h'])
  })

  it('não repete rótulos iguais', () => {
    const sessoes = [sessao('s1', 1, 5), sessao('s2', 2, 5)]
    const rotulos = calcularRotulosTrilha(sessoes, 10)

    const textos = rotulos.map((r) => r.texto)
    const duplicados = textos.filter((t, i) => textos.indexOf(t) !== i)
    expect(duplicados).toEqual([])
  })

  it('posiciona o último rótulo no fim da barra', () => {
    const sessoes = [sessao('s1', 1, 5)]
    const rotulos = calcularRotulosTrilha(sessoes, 5)

    expect(rotulos[rotulos.length - 1].posicao).toBe(100)
    expect(rotulos[rotulos.length - 1].ehUltimo).toBe(true)
  })
})

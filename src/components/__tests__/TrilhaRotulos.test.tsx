import { describe, expect, it } from 'vitest'
import { calcularRotulosTrilha, trilhasOrdenadas } from '../TrilhaCronologica'

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

    expect(rotulos.map((r) => r.texto)).toEqual(['0h', '2h30m'])
    expect(rotulos[0]).toMatchObject({ posicao: 0, texto: '0h', ehUltimo: false })
    expect(rotulos[1]).toMatchObject({ posicao: 100, texto: '2h30m', ehUltimo: true })
  })

  it('formata horas com minutos quando não zero', () => {
    const sessoes = [sessao('s1', 1, 12.5)]
    const rotulos = calcularRotulosTrilha(sessoes, 12.5)

    expect(rotulos.map((r) => r.texto)).toEqual(['0h', '12h30m'])
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

function sessaoComData(id: string, numero: number, data: string): any {
  const inicio = new Date(data)
  const fim = new Date(inicio.getTime() + 2 * 3_600_000)
  return { id, numero, inicio, fim, tempoPausado: 0, pausadoEm: null }
}

describe('trilhasOrdenadas', () => {
  it('ordena sessões da mais recente para a mais antiga', () => {
    const sessoes = [
      sessaoComData('s1', 1, '2026-01-01T10:00:00.000Z'),
      sessaoComData('s3', 3, '2026-01-03T10:00:00.000Z'),
      sessaoComData('s2', 2, '2026-01-02T10:00:00.000Z'),
    ]

    const ordenadas = trilhasOrdenadas(null, sessoes)

    expect(ordenadas.map((s) => s.numero)).toEqual([3, 2, 1])
  })

  it('coloca a sessão em andamento primeiro', () => {
    const ativa = sessaoComData('sa', 5, '2026-01-01T10:00:00.000Z')
    ativa.fim = null
    const encerrada = sessaoComData('se', 4, '2026-01-05T10:00:00.000Z')

    const ordenadas = trilhasOrdenadas(ativa, [encerrada])

    expect(ordenadas.map((s) => s.numero)).toEqual([5, 4])
  })

  it('ordena pelo início da sessão, não pela ordem do banco', () => {
    const sessoes = [
      sessaoComData('s1', 1, '2026-01-05T10:00:00.000Z'),
      sessaoComData('s2', 2, '2026-01-01T10:00:00.000Z'),
      sessaoComData('s3', 3, '2026-01-03T10:00:00.000Z'),
    ]

    const ordenadas = trilhasOrdenadas(null, sessoes)

    expect(ordenadas.map((s) => s.numero)).toEqual([1, 3, 2])
  })
})

import { describe, expect, it } from 'vitest'
import { calcularRotulosTrilha, trilhasOrdenadas } from '../TrilhaCronologica'
import { formatarDuracaoTrilha } from '../../dominio/cronometro'

function sessao(
  id: string,
  numero: number,
  inicio: Date,
  fim: Date | null,
): any {
  return { id, numero, inicio, fim, tempoPausado: 0, pausadoEm: null }
}

describe('formatarDuracaoTrilha', () => {
  it('trunca para minutos inteiros sem sufixo m', () => {
    expect(formatarDuracaoTrilha(0)).toBe('0h')
    expect(formatarDuracaoTrilha(30_000)).toBe('0h')
    expect(formatarDuracaoTrilha(60_000)).toBe('0h1')
    expect(formatarDuracaoTrilha(45 * 60_000)).toBe('0h45')
    expect(formatarDuracaoTrilha(2 * 3_600_000 + 30 * 60_000)).toBe('2h30')
    expect(formatarDuracaoTrilha(13 * 3_600_000 + 29 * 60_000)).toBe('13h29')
    expect(formatarDuracaoTrilha(13 * 3_600_000 + 30 * 60_000)).toBe('13h30')
  })

  it('acumula com milissegundos exatos e trunca só no final', () => {
    // 13h29m15s → trunca → 13h29
    expect(formatarDuracaoTrilha(13 * 3_600_000 + 29 * 60_000 + 15_000)).toBe('13h29')
    // 13h29m15s + 1m41s = 13h30m56s → trunca → 13h30
    expect(formatarDuracaoTrilha(13 * 3_600_000 + 30 * 60_000 + 56_000)).toBe('13h30')
  })
})

describe('calcularRotulosTrilha', () => {
  it('retorna vazio sem sessões', () => {
    expect(calcularRotulosTrilha([], 0)).toEqual([])
  })

  it('mostra apenas 0h e o total com uma única sessão', () => {
    const sessoes = [
      sessao(
        's1',
        1,
        new Date('2026-01-01T10:00:00.000Z'),
        new Date('2026-01-01T12:30:00.000Z'),
      ),
    ]
    const rotulos = calcularRotulosTrilha(sessoes, 2.5)

    expect(rotulos.map((r) => r.texto)).toEqual(['0h', '2h30'])
    expect(rotulos[0]).toMatchObject({ posicao: 0, texto: '0h', ehUltimo: false })
    expect(rotulos[1]).toMatchObject({ posicao: 100, texto: '2h30', ehUltimo: true })
  })

  it('formata horas com minutos quando não zero, sem sufixo m', () => {
    const sessoes = [
      sessao(
        's1',
        1,
        new Date('2026-01-01T10:00:00.000Z'),
        new Date('2026-01-01T22:30:00.000Z'),
      ),
    ]
    const rotulos = calcularRotulosTrilha(sessoes, 12.5)

    expect(rotulos.map((r) => r.texto)).toEqual(['0h', '12h30'])
  })

  it('omite minutos quando são zero', () => {
    const sessoes = [
      sessao(
        's1',
        1,
        new Date('2026-01-01T10:00:00.000Z'),
        new Date('2026-01-01T13:00:00.000Z'),
      ),
    ]
    const rotulos = calcularRotulosTrilha(sessoes, 3)

    expect(rotulos.map((r) => r.texto)).toEqual(['0h', '3h'])
  })

  it('não repete rótulos iguais', () => {
    const sessoes = [
      sessao(
        's1',
        1,
        new Date('2026-01-01T10:00:00.000Z'),
        new Date('2026-01-01T15:00:00.000Z'),
      ),
      sessao(
        's2',
        2,
        new Date('2026-01-01T15:00:00.000Z'),
        new Date('2026-01-01T20:00:00.000Z'),
      ),
    ]
    const rotulos = calcularRotulosTrilha(sessoes, 10)

    const textos = rotulos.map((r) => r.texto)
    const duplicados = textos.filter((t, i) => textos.indexOf(t) !== i)
    expect(duplicados).toEqual([])
  })

  it('posiciona o último rótulo no fim da barra', () => {
    const sessoes = [
      sessao(
        's1',
        1,
        new Date('2026-01-01T10:00:00.000Z'),
        new Date('2026-01-01T15:00:00.000Z'),
      ),
    ]
    const rotulos = calcularRotulosTrilha(sessoes, 5)

    expect(rotulos[rotulos.length - 1].posicao).toBe(100)
    expect(rotulos[rotulos.length - 1].ehUltimo).toBe(true)
  })

  it('2 sessões muito próximas: esconde o rótulo anterior, mantém o último', () => {
    const sessoes = [
      sessao(
        's1',
        1,
        new Date('2026-01-01T10:00:00.000Z'),
        new Date('2026-01-01T10:30:00.000Z'),
      ),
      sessao(
        's2',
        2,
        new Date('2026-01-01T10:45:00.000Z'),
        new Date('2026-01-01T11:00:00.000Z'),
      ),
    ]
    const rotulos = calcularRotulosTrilha(sessoes, 1)

    const textos = rotulos.map((r) => r.texto)
    // O rótulo do último ponto (total) SEMPRE aparece
    expect(textos[textos.length - 1]).toBe('1h')
    const ultimo = rotulos[rotulos.length - 1]
    expect(ultimo.ehUltimo).toBe(true)
  })

  it('5 sessões bem espaçadas: todos os rótulos aparecem', () => {
    const base = new Date('2026-01-01T10:00:00.000Z')
    const sessoes = [
      sessao('s1', 1, base, new Date(base.getTime() + 2 * 3_600_000)),
      sessao(
        's2',
        2,
        new Date(base.getTime() + 3 * 3_600_000),
        new Date(base.getTime() + 5 * 3_600_000),
      ),
      sessao(
        's3',
        3,
        new Date(base.getTime() + 6 * 3_600_000),
        new Date(base.getTime() + 8 * 3_600_000),
      ),
      sessao(
        's4',
        4,
        new Date(base.getTime() + 9 * 3_600_000),
        new Date(base.getTime() + 11 * 3_600_000),
      ),
      sessao(
        's5',
        5,
        new Date(base.getTime() + 12 * 3_600_000),
        new Date(base.getTime() + 14 * 3_600_000),
      ),
    ]
    const rotulos = calcularRotulosTrilha(sessoes, 10)

    const textos = rotulos.map((r) => r.texto)
    expect(textos[0]).toBe('0h')
    expect(textos[textos.length - 1]).toBe('10h')
    expect(rotulos[rotulos.length - 1].ehUltimo).toBe(true)
    expect(textos.length).toBeGreaterThanOrEqual(3)
  })

  it('o rótulo do último ponto (total) nunca é escondido por sobreposição', () => {
    const base = new Date('2026-01-01T10:00:00.000Z')
    const sessoes = [
      sessao(
        's1',
        1,
        base,
        new Date(base.getTime() + 30 * 60_000),
      ),
      sessao(
        's2',
        2,
        new Date(base.getTime() + 35 * 60_000),
        new Date(base.getTime() + 65 * 60_000),
      ),
    ]
    const rotulos = calcularRotulosTrilha(sessoes, 2)

    const textos = rotulos.map((r) => r.texto)
    expect(textos[textos.length - 1]).toBe('2h')
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

  it('não repete a sessão ativa quando ela também vem na lista', () => {
    const ativa = sessaoComData('sa', 2, '2026-01-02T10:00:00.000Z')
    ativa.fim = null
    const encerrada = sessaoComData('s1', 1, '2026-01-01T10:00:00.000Z')

    const ordenadas = trilhasOrdenadas(ativa, [encerrada, ativa])

    expect(ordenadas.map((s) => s.numero)).toEqual([2, 1])
  })
})

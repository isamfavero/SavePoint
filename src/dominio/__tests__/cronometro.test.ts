import { describe, expect, it } from 'vitest'
import {
  formatarDuracao,
  formatarQuantidadeSessoes,
  formatarTempoCurto,
  resolverFimSessao,
  sessaoEstaPausada,
} from '../cronometro'

describe('formatarDuracao', () => {
  it('formata horas, minutos e segundos com dois dígitos', () => {
    expect(formatarDuracao(0)).toBe('00:00:00')
    expect(formatarDuracao(1_000)).toBe('00:00:01')
    expect(formatarDuracao(42 * 60_000 + 10_000)).toBe('00:42:10')
    expect(formatarDuracao(3 * 3_600_000 + 7 * 60_000 + 5_000)).toBe('03:07:05')
    expect(formatarDuracao(25 * 3_600_000)).toBe('25:00:00')
  })

  it('não mostra durações negativas', () => {
    expect(formatarDuracao(-5_000)).toBe('00:00:00')
  })
})

describe('formatarTempoCurto', () => {
  it('devolve 0 min para menos de 1 minuto', () => {
    expect(formatarTempoCurto(0)).toBe('0 min')
    expect(formatarTempoCurto(30_000)).toBe('0 min')
    expect(formatarTempoCurto(59_000)).toBe('0 min')
  })

  it('devolve N min abaixo de 1 hora', () => {
    expect(formatarTempoCurto(2 * 60_000)).toBe('2 min')
    expect(formatarTempoCurto(59 * 60_000)).toBe('59 min')
  })

  it('devolve Xh YZ a partir de 1 hora', () => {
    expect(formatarTempoCurto(60_000)).toBe('1 min')
    expect(formatarTempoCurto(3_600_000)).toBe('1h')
    expect(formatarTempoCurto(5_400_000)).toBe('1h 30')
    expect(formatarTempoCurto(2 * 3_600_000 + 30 * 60_000)).toBe('2h 30')
    expect(formatarTempoCurto(12 * 3_600_000 + 30 * 60_000)).toBe('12h 30')
  })
})

describe('formatarQuantidadeSessoes', () => {
  it('usa o singular para uma sessão e o plural para várias', () => {
    expect(formatarQuantidadeSessoes(0)).toBe('0 sessões')
    expect(formatarQuantidadeSessoes(1)).toBe('1 sessão')
    expect(formatarQuantidadeSessoes(2)).toBe('2 sessões')
    expect(formatarQuantidadeSessoes(10)).toBe('10 sessões')
  })
})

describe('resolverFimSessao', () => {
  const capturado = new Date('2026-01-01T12:00:00.000Z')

  it('usa o instante capturado quando a sessão está em andamento', () => {
    expect(resolverFimSessao({ pausadoEm: null }, capturado)).toEqual(capturado)
  })

  it('usa o instante da pausa quando a sessão está pausada', () => {
    const pausadoEm = new Date('2026-01-01T11:30:00.000Z')
    expect(resolverFimSessao({ pausadoEm }, capturado)).toEqual(pausadoEm)
  })
})

describe('sessaoEstaPausada', () => {
  it('reconhece sessão pausada, em andamento e ausente', () => {
    expect(sessaoEstaPausada(null)).toBe(false)
    expect(sessaoEstaPausada({ pausadoEm: null })).toBe(false)
    expect(sessaoEstaPausada({ pausadoEm: new Date() })).toBe(true)
  })
})

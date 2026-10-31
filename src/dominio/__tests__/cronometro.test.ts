import { describe, expect, it } from 'vitest'
import {
  formatarDuracao,
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

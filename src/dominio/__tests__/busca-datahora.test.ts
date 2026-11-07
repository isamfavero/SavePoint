import { describe, expect, it } from 'vitest'
import { normalizarTexto } from '../biblioteca'
import { destacarTrecho, registroCorrespondeBusca } from '../busca'
import { lerCampoDataHora, paraCampoDataHora } from '../dataHora'
import { boasVindasJaVistas, marcarBoasVindasVistas } from '../../estado/boasVindas'

const registro = {
  texto: 'Achei a Canção do Pássaro no pátio',
  tags: ['#lore', '#código'],
  tipo: 'Documentos',
  jogoId: 'j1',
}

describe('registroCorrespondeBusca', () => {
  it('aceita tudo sem termo e respeita jogo e tipos', () => {
    expect(registroCorrespondeBusca(registro, { texto: '' })).toBe(true)
    expect(registroCorrespondeBusca(registro, { texto: '', jogoId: 'j2' })).toBe(false)
    expect(registroCorrespondeBusca(registro, { texto: '', tipos: ['Senhas'] })).toBe(false)
    expect(registroCorrespondeBusca(registro, { texto: '', tipos: [] })).toBe(true)
  })

  it('ignora acentos e maiúsculas no texto e nas tags', () => {
    expect(registroCorrespondeBusca(registro, { texto: normalizarTexto('PASSARO') })).toBe(true)
    expect(registroCorrespondeBusca(registro, { texto: normalizarTexto('#Codigo') })).toBe(true)
    expect(registroCorrespondeBusca(registro, { texto: 'codigo' })).toBe(true)
  })

  it('com "#" procura só nas tags', () => {
    expect(registroCorrespondeBusca(registro, { texto: '#patio' })).toBe(false)
    expect(registroCorrespondeBusca(registro, { texto: '#lo' })).toBe(true)
  })
})

describe('destacarTrecho', () => {
  it('destaca o trecho original mesmo buscando sem acento', () => {
    const trecho = destacarTrecho(registro.texto, 'cancao')
    expect(trecho.destaque).toBe('Canção')
    expect(`${trecho.antes}${trecho.destaque}${trecho.depois}`).toBe(registro.texto)
  })

  it('corta textos longos em volta do trecho encontrado', () => {
    const texto = `${'palavra '.repeat(40)}SEGREDO${' fim'.repeat(60)}`
    const trecho = destacarTrecho(texto, 'segredo')
    expect(trecho.destaque).toBe('SEGREDO')
    expect(trecho.antes.startsWith('…')).toBe(true)
    expect(trecho.depois.endsWith('…')).toBe(true)
  })

  it('sem correspondência no texto (ou busca por tag) não destaca nada', () => {
    expect(destacarTrecho('Texto qualquer', '#lore')).toEqual({
      antes: 'Texto qualquer',
      destaque: '',
      depois: '',
    })
  })
})

describe('campos de data e hora', () => {
  it('vai e volta pelo formato do datetime-local em hora local', () => {
    const data = new Date(2026, 10, 6, 21, 5)
    expect(paraCampoDataHora(data)).toBe('2026-11-06T21:05')
    expect(lerCampoDataHora('2026-11-06T21:05')).toEqual(data)
  })

  it('recusa valores inválidos', () => {
    expect(lerCampoDataHora('')).toBeNull()
    expect(lerCampoDataHora('2026-02-31T10:00')).toBeNull()
    expect(lerCampoDataHora('ontem')).toBeNull()
  })
})

describe('boas-vindas vistas', () => {
  it('lembra que as boas-vindas já foram vistas', () => {
    const dados = new Map<string, string>()
    const armazenamento = {
      getItem: (chave: string) => dados.get(chave) ?? null,
      setItem: (chave: string, valor: string) => void dados.set(chave, valor),
    }

    expect(boasVindasJaVistas(armazenamento)).toBe(false)
    marcarBoasVindasVistas(armazenamento)
    expect(boasVindasJaVistas(armazenamento)).toBe(true)
  })
})

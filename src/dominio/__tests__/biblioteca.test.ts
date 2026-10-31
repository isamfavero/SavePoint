import { describe, expect, it } from 'vitest'
import type { Jogo, SituacaoJogo } from '../../data'
import {
  classeDaSituacao,
  contarJogosPorSituacao,
  escolherJogoEmDestaque,
  existeJogoDuplicado,
  filtrarJogos,
  formatarHoras,
  formatarSessoes,
  formatarTempoRelativo,
} from '../biblioteca'

function criarJogo(
  id: string,
  nome: string,
  situacao: SituacaoJogo,
  atualizadoEm: string,
  plataforma = 'PC',
): Jogo {
  return {
    id,
    nome,
    plataforma,
    generos: ['Aventura'],
    capa: null,
    situacao,
    criadoEm: new Date('2026-01-01T10:00:00.000Z'),
    atualizadoEm: new Date(atualizadoEm),
  }
}

const jogos: Jogo[] = [
  criarJogo('1', 'Ecos da Torre', 'Jogando', '2026-01-02T10:00:00.000Z'),
  criarJogo('2', 'Maré Baixa', 'Jogando', '2026-01-05T10:00:00.000Z'),
  criarJogo('3', 'Sinal Perdido', 'Pausado', '2026-01-06T10:00:00.000Z'),
  criarJogo('4', 'Cinzas', 'Concluído', '2026-01-03T10:00:00.000Z'),
  criarJogo('5', 'Neblina', 'Quero jogar', '2026-01-04T10:00:00.000Z'),
]

describe('contarJogosPorSituacao', () => {
  it('conta todos os filtros a partir dos jogos reais', () => {
    expect(contarJogosPorSituacao(jogos)).toEqual({
      Todos: 5,
      Jogando: 2,
      Pausado: 1,
      Concluído: 1,
      'Quero jogar': 1,
    })
  })

  it('zera os filtros quando não há jogos', () => {
    expect(contarJogosPorSituacao([])).toEqual({
      Todos: 0,
      Jogando: 0,
      Pausado: 0,
      Concluído: 0,
      'Quero jogar': 0,
    })
  })
})

describe('filtrarJogos', () => {
  it('devolve todos os jogos no filtro Todos', () => {
    expect(filtrarJogos(jogos, 'Todos')).toHaveLength(5)
  })

  it('filtra pela situação escolhida', () => {
    expect(filtrarJogos(jogos, 'Jogando').map((jogo) => jogo.id)).toEqual(['1', '2'])
    expect(filtrarJogos(jogos, 'Pausado').map((jogo) => jogo.id)).toEqual(['3'])
    expect(filtrarJogos(jogos, 'Concluído').map((jogo) => jogo.id)).toEqual(['4'])
    expect(filtrarJogos(jogos, 'Quero jogar').map((jogo) => jogo.id)).toEqual(['5'])
  })
})

describe('escolherJogoEmDestaque', () => {
  it('prioriza o jogo atual salvo', () => {
    expect(escolherJogoEmDestaque(jogos, '4')?.id).toBe('4')
  })

  it('usa o Jogando atualizado mais recentemente quando não há jogo atual', () => {
    expect(escolherJogoEmDestaque(jogos, null)?.id).toBe('2')
  })

  it('ignora um jogo atual que não existe mais', () => {
    expect(escolherJogoEmDestaque(jogos, 'apagado')?.id).toBe('2')
  })

  it('não escolhe destaque quando não há jogo atual nem jogo Jogando', () => {
    const semJogando = jogos.filter((jogo) => jogo.situacao !== 'Jogando')
    expect(escolherJogoEmDestaque(semJogando, null)).toBeNull()
  })
})

describe('existeJogoDuplicado', () => {
  it('detecta mesmo nome e plataforma ignorando caixa, acentos e espaços', () => {
    expect(existeJogoDuplicado(jogos, '  ECOS   DA TORRE ', 'pc')).toBe(true)
    expect(existeJogoDuplicado(jogos, 'ecos da torre', 'PC')).toBe(true)
  })

  it('não considera duplicado quando muda a plataforma', () => {
    expect(existeJogoDuplicado(jogos, 'Ecos da Torre', 'PlayStation')).toBe(false)
  })

  it('não considera duplicado quando muda o nome', () => {
    expect(existeJogoDuplicado(jogos, 'Ecos da Torre II', 'PC')).toBe(false)
  })
})

describe('formatação', () => {
  it('formata horas e minutos', () => {
    expect(formatarHoras(0)).toBe('0min')
    expect(formatarHoras(45 * 60_000)).toBe('45min')
    expect(formatarHoras(12 * 3_600_000 + 30 * 60_000)).toBe('12h30')
    expect(formatarHoras(3 * 3_600_000)).toBe('3h')
  })

  it('flexiona sessões, incluindo zero e uma', () => {
    expect(formatarSessoes(0)).toBe('0 sessões')
    expect(formatarSessoes(1)).toBe('1 sessão')
    expect(formatarSessoes(2)).toBe('2 sessões')
    expect(formatarSessoes(4)).toBe('4 sessões')
  })

  it('formata tempo relativo', () => {
    const agora = new Date('2026-01-10T12:00:00.000Z')

    expect(formatarTempoRelativo(new Date('2026-01-10T11:59:40.000Z'), agora)).toBe(
      'agora',
    )
    expect(formatarTempoRelativo(new Date('2026-01-10T11:30:00.000Z'), agora)).toBe(
      'há 30 min',
    )
    expect(formatarTempoRelativo(new Date('2026-01-10T08:00:00.000Z'), agora)).toBe(
      'há 4 h',
    )
    expect(formatarTempoRelativo(new Date('2026-01-08T12:00:00.000Z'), agora)).toBe(
      'há 2 dias',
    )
    expect(formatarTempoRelativo(new Date('2026-01-09T12:00:00.000Z'), agora)).toBe(
      'há 1 dia',
    )
  })

  it('associa cada situação a uma classe visual', () => {
    expect(classeDaSituacao('Jogando')).toBe('situacao-jogando')
    expect(classeDaSituacao('Pausado')).toBe('situacao-pausado')
    expect(classeDaSituacao('Concluído')).toBe('situacao-concluido')
    expect(classeDaSituacao('Quero jogar')).toBe('situacao-quero')
  })
})

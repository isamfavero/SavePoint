import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { calcularDuracaoSessao } from '../calculos'
import { RepositorioIndexedDb } from '../repositorio-indexeddb'
import { RepositorioMemoria } from '../repositorio-memoria'
import type { RepositorioSavePoint } from '../repositorio'
import { ServicoSavePoint } from '../servico'
import { TIPOS_REGISTRO } from '../tipos'
import type { Jogo } from '../tipos'

const MINUTO = 60_000
const INICIO = new Date('2026-01-01T10:00:00.000Z')

type Contexto = {
  servico: ServicoSavePoint
  repositorio: RepositorioSavePoint
  avancar: (ms: number) => void
  agora: () => Date
  limpar: () => Promise<void>
}

function criarContexto(
  repositorio: RepositorioSavePoint,
  limpar: () => Promise<void>,
): Contexto {
  let agora = INICIO.getTime()
  let contador = 0

  const servico = new ServicoSavePoint(repositorio, {
    idFactory: () => `id-${++contador}`,
    agora: () => new Date(agora),
  })

  return {
    servico,
    repositorio,
    avancar: (ms) => {
      agora += ms
    },
    agora: () => new Date(agora),
    limpar,
  }
}

async function criarContextoMemoria(): Promise<Contexto> {
  return criarContexto(new RepositorioMemoria(), async () => undefined)
}

async function criarContextoIndexedDb(): Promise<Contexto> {
  const nome = `savepoint-teste-${crypto.randomUUID()}`
  const repositorio = new RepositorioIndexedDb(nome)

  const limpar = async () => {
    await repositorio.fechar().catch(() => undefined)
    await new Promise<void>((resolve) => {
      const requisicao = indexedDB.deleteDatabase(nome)
      requisicao.onsuccess = () => resolve()
      requisicao.onerror = () => resolve()
      requisicao.onblocked = () => resolve()
    })
  }

  return criarContexto(repositorio, limpar)
}

async function criarJogo(ctx: Contexto, nome = 'Ecos da Torre'): Promise<Jogo> {
  return ctx.servico.criarJogo({
    nome,
    plataforma: 'PC',
    generos: ['Aventura', 'Puzzle'],
    situacao: 'Jogando',
  })
}

async function prepararJogoESessao(ctx: Contexto) {
  const jogo = await criarJogo(ctx)
  const sessao = await ctx.servico.iniciarSessao(jogo.id)
  return { jogo, sessao }
}

const implementacoes: Array<[string, () => Promise<Contexto>]> = [
  ['memória', criarContextoMemoria],
  ['IndexedDB', criarContextoIndexedDb],
]

describe.each(implementacoes)('ServicoSavePoint com repositório em %s', (_nome, criar) => {
  let ctx: Contexto

  beforeEach(async () => {
    ctx = await criar()
  })

  afterEach(async () => {
    await ctx.limpar()
  })

  it('cria, lista e atualiza jogos preservando criadoEm', async () => {
    const capa = new Blob(['capa'], { type: 'image/png' })
    const jogo = await ctx.servico.criarJogo({
      nome: '  Ecos da Torre  ',
      plataforma: ' PC ',
      generos: ['Aventura', 'Puzzle', 'Aventura'],
      situacao: 'Jogando',
      capa,
    })

    expect(jogo.nome).toBe('Ecos da Torre')
    expect(jogo.plataforma).toBe('PC')
    expect(jogo.generos).toEqual(['Aventura', 'Puzzle'])
    expect(jogo.capa).toBeInstanceOf(Blob)

    ctx.avancar(1000)

    const atualizado = await ctx.servico.atualizarJogo(jogo.id, {
      nome: 'Ecos',
      situacao: 'Pausado',
    })

    expect(atualizado.nome).toBe('Ecos')
    expect(atualizado.situacao).toBe('Pausado')
    expect(atualizado.criadoEm).toEqual(jogo.criadoEm)
    expect(atualizado.atualizadoEm.getTime()).toBeGreaterThan(jogo.atualizadoEm.getTime())
    expect(await ctx.servico.listarJogos()).toHaveLength(1)
  })

  it('numera sessões sequencialmente por jogo', async () => {
    const jogoA = await criarJogo(ctx, 'Jogo A')
    const jogoB = await criarJogo(ctx, 'Jogo B')

    const primeira = await ctx.servico.iniciarSessao(jogoA.id)
    expect(primeira.numero).toBe(1)
    await ctx.servico.encerrarSessao(primeira.id)

    const segunda = await ctx.servico.iniciarSessao(jogoA.id)
    expect(segunda.numero).toBe(2)
    await ctx.servico.encerrarSessao(segunda.id)

    const doOutroJogo = await ctx.servico.iniciarSessao(jogoB.id)
    expect(doOutroJogo.numero).toBe(1)
  })

  it('permite só uma sessão ativa por vez, inclusive quando pausada', async () => {
    const jogoA = await criarJogo(ctx, 'Jogo A')
    const jogoB = await criarJogo(ctx, 'Jogo B')
    const sessao = await ctx.servico.iniciarSessao(jogoA.id)

    await expect(ctx.servico.iniciarSessao(jogoB.id)).rejects.toMatchObject({
      codigo: 'SESSAO_ATIVA_EXISTENTE',
    })

    await ctx.servico.pausarSessao(sessao.id)

    await expect(ctx.servico.iniciarSessao(jogoB.id)).rejects.toMatchObject({
      codigo: 'SESSAO_ATIVA_EXISTENTE',
    })

    await ctx.servico.encerrarSessao(sessao.id)

    const outra = await ctx.servico.iniciarSessao(jogoB.id)
    expect(outra.numero).toBe(1)
  })

  it('exige sessão existente e do mesmo jogo para registros', async () => {
    const jogoA = await criarJogo(ctx, 'Jogo A')
    const jogoB = await criarJogo(ctx, 'Jogo B')
    const sessaoB = await ctx.servico.iniciarSessao(jogoB.id)

    await expect(
      ctx.servico.criarRegistro({
        jogoId: jogoA.id,
        sessaoId: '',
        tipo: 'Diário',
        texto: 'sem sessão',
      }),
    ).rejects.toMatchObject({ codigo: 'REGISTRO_EXIGE_SESSAO' })

    await expect(
      ctx.servico.criarRegistro({
        jogoId: jogoA.id,
        sessaoId: 'sessao-inexistente',
        tipo: 'Diário',
        texto: 'sessão inexistente',
      }),
    ).rejects.toMatchObject({ codigo: 'SESSAO_NAO_ENCONTRADA' })

    await expect(
      ctx.servico.criarRegistro({
        jogoId: jogoA.id,
        sessaoId: sessaoB.id,
        tipo: 'Diário',
        texto: 'sessão de outro jogo',
      }),
    ).rejects.toMatchObject({ codigo: 'SESSAO_DE_OUTRO_JOGO' })

    const valido = await ctx.servico.criarRegistro({
      jogoId: jogoB.id,
      sessaoId: sessaoB.id,
      tipo: 'Diário',
      texto: 'válido',
    })

    expect(valido.sessaoId).toBe(sessaoB.id)
  })

  it('aceita registro em sessão encerrada, sem exigir sessão ativa', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    await ctx.servico.encerrarSessao(sessao.id)
    expect(await ctx.servico.obterSessaoAtiva()).toBeNull()

    const registro = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'anotação posterior',
    })

    expect(registro.sessaoId).toBe(sessao.id)
  })

  it('guarda campos de conclusão apenas em Objetivo', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)
    const quando = new Date(INICIO.getTime() + MINUTO)

    const diario = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'diário',
      concluido: true,
      concluidoEm: quando,
      concluidoSessaoId: sessao.id,
    })

    expect(diario).not.toHaveProperty('concluido')
    const diarioSalvo = await ctx.servico.obterRegistro(diario.id)
    expect(diarioSalvo).not.toHaveProperty('concluido')
    expect(diarioSalvo).not.toHaveProperty('concluidoEm')
    expect(diarioSalvo).not.toHaveProperty('concluidoSessaoId')

    const objetivo = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Objetivo',
      texto: 'objetivo',
      concluido: true,
      concluidoEm: quando,
      concluidoSessaoId: sessao.id,
    })

    expect(objetivo.concluido).toBe(true)
    expect(objetivo.concluidoEm).toEqual(quando)
    expect(objetivo.concluidoSessaoId).toBe(sessao.id)

    await expect(ctx.servico.concluirObjetivo(diario.id)).rejects.toMatchObject({
      codigo: 'DADOS_INVALIDOS',
    })

    const alterado = await ctx.servico.atualizarRegistro(objetivo.id, { tipo: 'Diário' })

    expect(alterado).not.toHaveProperty('concluido')
    const alteradoSalvo = await ctx.servico.obterRegistro(objetivo.id)
    expect(alteradoSalvo).not.toHaveProperty('concluido')
    expect(alteradoSalvo).not.toHaveProperty('concluidoEm')
    expect(alteradoSalvo).not.toHaveProperty('concluidoSessaoId')
  })

  it('conclui Objetivo sem sessão ativa e com concluidoSessaoId opcional', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    const objetivo = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Objetivo',
      texto: 'objetivo',
    })

    await ctx.servico.encerrarSessao(sessao.id)
    expect(await ctx.servico.obterSessaoAtiva()).toBeNull()

    const concluido = await ctx.servico.concluirObjetivo(objetivo.id)

    expect(concluido.concluido).toBe(true)
    expect(concluido.concluidoEm).toEqual(ctx.agora())
    expect(concluido.concluidoSessaoId).toBeNull()

    const comSessao = await ctx.servico.concluirObjetivo(objetivo.id, {
      concluidoSessaoId: sessao.id,
    })

    expect(comSessao.concluidoSessaoId).toBe(sessao.id)
  })

  it('cria registros dos oito tipos e mantém Objetivo pendente', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    for (const tipo of TIPOS_REGISTRO) {
      const registro = await ctx.servico.criarRegistro({
        jogoId: jogo.id,
        sessaoId: sessao.id,
        tipo,
        texto: `Anotação de ${tipo}`,
      })

      expect(registro.tipo).toBe(tipo)

      if (tipo === 'Objetivo') {
        expect(registro.concluido).toBe(false)
        expect(registro.concluidoEm).toBeNull()
        expect(registro.concluidoSessaoId).toBeNull()
      } else {
        expect(registro).not.toHaveProperty('concluido')
        expect(registro).not.toHaveProperty('concluidoEm')
        expect(registro).not.toHaveProperty('concluidoSessaoId')
      }
    }

    const salvos = await ctx.servico.listarRegistrosDaSessao(sessao.id)
    expect(salvos).toHaveLength(TIPOS_REGISTRO.length)
    expect(new Set(salvos.map((registro) => registro.tipo))).toEqual(
      new Set(TIPOS_REGISTRO),
    )
  })

  it('recusa anotação sem texto na criação e na atualização', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    await expect(
      ctx.servico.criarRegistro({
        jogoId: jogo.id,
        sessaoId: sessao.id,
        tipo: 'Diário',
        texto: '   ',
      }),
    ).rejects.toMatchObject({
      codigo: 'DADOS_INVALIDOS',
      message: 'O texto da anotação é obrigatório.',
    })

    const registro = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: '  texto válido  ',
    })

    expect(registro.texto).toBe('texto válido')

    await expect(
      ctx.servico.atualizarRegistro(registro.id, { texto: '\n\t' }),
    ).rejects.toMatchObject({ codigo: 'DADOS_INVALIDOS' })
  })

  it('normaliza tags e sugere as mais usadas, sem repetir maiúsculas', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    const primeiro = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'primeiro',
      tags: ['#Lore', '#dica', '#lore'],
    })

    expect(primeiro.tags).toEqual(['#lore', '#dica'])

    await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Puzzles',
      texto: 'segundo',
      tags: ['#lore', '#Código'],
    })

    await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Lembretes',
      texto: 'terceiro',
      tags: ['#LORE', '#dica'],
    })

    const tags = await ctx.servico.listarTagsUsadas(jogo.id)

    expect(tags).toEqual(['#lore', '#dica', '#código'])

    await expect(
      ctx.servico.criarRegistro({
        jogoId: jogo.id,
        sessaoId: sessao.id,
        tipo: 'Diário',
        texto: 'tag inválida',
        tags: ['#lore nova'],
      }),
    ).rejects.toMatchObject({ codigo: 'DADOS_INVALIDOS' })
  })

  it('conclui e reabre Objetivo, gravando concluidoEm e concluidoSessaoId', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    const objetivo = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Objetivo',
      texto: 'Encontrar a chave do observatório.',
    })

    expect(objetivo.concluido).toBe(false)
    expect(objetivo.concluidoEm).toBeNull()
    expect(objetivo.concluidoSessaoId).toBeNull()

    const concluido = await ctx.servico.concluirObjetivo(objetivo.id)

    expect(concluido.concluido).toBe(true)
    expect(concluido.concluidoEm).not.toBeNull()
    expect(concluido.concluidoSessaoId).toBe(sessao.id)

    /* @ts-ignore */
    const salvo = await ctx.servico.obterRegistro(objetivo.id)
    expect(salvo).not.toBeNull()
    /* @ts-ignore */
    expect(salvo.concluido).toBe(true)
    /* @ts-ignore */
    expect(salvo.concluidoSessaoId).toBe(sessao.id)

    const reaberto = await ctx.servico.reabrirObjetivo(objetivo.id)

    expect(reaberto.concluido).toBe(false)
    expect(reaberto.concluidoEm).toBeUndefined()
    expect(reaberto.concluidoSessaoId).toBeUndefined()

    const salvoReaberto = await ctx.servico.obterRegistro(objetivo.id)
    expect(salvoReaberto).not.toHaveProperty('concluidoEm')
    expect(salvoReaberto).not.toHaveProperty('concluidoSessaoId')
  })

  it('conclui Objetivo sem sessão ativa, gravando só concluidoEm', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    const objetivo = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Objetivo',
      texto: 'Encontrar a chave do observatório.',
    })

    await ctx.servico.encerrarSessao(sessao.id)
    expect(await ctx.servico.obterSessaoAtiva()).toBeNull()

    const concluido = await ctx.servico.concluirObjetivo(objetivo.id)

    expect(concluido.concluido).toBe(true)
    expect(concluido.concluidoEm).not.toBeNull()
    expect(concluido.concluidoSessaoId).toBeNull()
  })

  it('muda a situação do jogo pelo serviço', async () => {
    const jogo = await criarJogo(ctx)

    const atualizado = await ctx.servico.atualizarJogo(jogo.id, {
      situacao: 'Concluído',
    })

    expect(atualizado.situacao).toBe('Concluído')

    const salvo = await ctx.servico.obterJogo(jogo.id)
    expect(salvo?.situacao).toBe('Concluído')
  })

  it('calcula estatísticas com sessões encerradas e em andamento', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    ctx.avancar(90 * MINUTO)
    await ctx.servico.encerrarSessao(sessao.id)

    await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(30 * MINUTO)

    const estatisticas = await ctx.servico.calcularEstatisticasJogo(jogo.id)

    expect(estatisticas.totalSessoes).toBe(1)
    expect(estatisticas.sessoesEmAndamento).toBe(1)
    expect(estatisticas.horasTotais).toBeCloseTo(1.5, 1)
    expect(estatisticas.mediaHorasPorSessao).toBeCloseTo(1.5, 1)
  })

  it('calcula horas da semana incluindo sessão em andamento', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    // Encerra a sessão anterior com tempo válido (agora)
    await ctx.servico.encerrarSessao(sessao.id)

    await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(2 * MINUTO)

    const horas = await ctx.servico.calcularHorasNaSemana(jogo.id)

    expect(horas).toBeCloseTo(0.033, 2)
    expect(horas).toBeGreaterThan(0)
  })

  it('apaga sessões e registros ao apagar o jogo', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)

    await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'anotação',
    })

    await ctx.servico.excluirJogo(jogo.id)

    expect(await ctx.servico.obterJogo(jogo.id)).toBeNull()
    expect(await ctx.repositorio.listarSessoesPorJogo(jogo.id)).toHaveLength(0)
    expect(await ctx.repositorio.listarRegistrosPorJogo(jogo.id)).toHaveLength(0)
    expect(await ctx.servico.obterSessaoAtiva()).toBeNull()
  })

  it('calcula duração descontando pausas encerradas e em andamento', async () => {
    const jogo = await criarJogo(ctx)
    const sessao = await ctx.servico.iniciarSessao(jogo.id)

    ctx.avancar(30 * MINUTO)
    await ctx.servico.pausarSessao(sessao.id)
    ctx.avancar(10 * MINUTO)
    const retomada = await ctx.servico.retomarSessao(sessao.id)
    expect(retomada.tempoPausado).toBe(10 * MINUTO)

    ctx.avancar(20 * MINUTO)
    const encerrada = await ctx.servico.encerrarSessao(sessao.id)
    expect(calcularDuracaoSessao(encerrada)).toBe(50 * MINUTO)

    const emAndamento = await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(60 * MINUTO)
    const pausada = await ctx.servico.pausarSessao(emAndamento.id)
    ctx.avancar(15 * MINUTO)

    expect(calcularDuracaoSessao(pausada, ctx.agora())).toBe(60 * MINUTO)
  })

  it('encerra sessão pausada no instante da pausa quando nenhum fim é informado', async () => {
    const { sessao } = await prepararJogoESessao(ctx)

    ctx.avancar(20 * MINUTO)
    const pausada = await ctx.servico.pausarSessao(sessao.id)
    const instanteDaPausa = pausada.pausadoEm
    expect(instanteDaPausa).not.toBeNull()

    ctx.avancar(40 * MINUTO)
    const encerrada = await ctx.servico.encerrarSessao(sessao.id)

    expect(encerrada.fim).toEqual(instanteDaPausa)
    expect(encerrada.tempoPausado).toBe(0)
    expect(calcularDuracaoSessao(encerrada)).toBe(20 * MINUTO)
  })

  it('encerra sessão pausada em um instante explícito, somando a pausa até ele', async () => {
    const { sessao } = await prepararJogoESessao(ctx)

    ctx.avancar(20 * MINUTO)
    await ctx.servico.pausarSessao(sessao.id)
    ctx.avancar(15 * MINUTO)
    const fim = ctx.agora()

    const encerrada = await ctx.servico.encerrarSessao(sessao.id, {}, fim)

    expect(encerrada.fim).toEqual(fim)
    expect(encerrada.tempoPausado).toBe(15 * MINUTO)
    expect(calcularDuracaoSessao(encerrada)).toBe(20 * MINUTO)
  })

  it('encerra sessão em andamento no instante de fim informado', async () => {
    const { sessao } = await prepararJogoESessao(ctx)

    ctx.avancar(10 * MINUTO)
    const fim = ctx.agora()
    ctx.avancar(50 * MINUTO)

    const encerrada = await ctx.servico.encerrarSessao(sessao.id, {}, fim)

    expect(encerrada.fim).toEqual(fim)
    expect(calcularDuracaoSessao(encerrada)).toBe(10 * MINUTO)
  })

  it('expõe o CRUD básico do repositório', async () => {
    const { jogo, sessao } = await prepararJogoESessao(ctx)
    const registro = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'anotação',
    })

    expect(await ctx.repositorio.listarSessoes()).toHaveLength(1)
    expect(await ctx.repositorio.listarRegistros()).toHaveLength(1)
    expect(await ctx.servico.listarRegistrosDaSessao(sessao.id)).toHaveLength(1)

    await ctx.repositorio.excluirRegistro(registro.id)
    expect(await ctx.repositorio.listarRegistros()).toHaveLength(0)

    await ctx.repositorio.excluirSessao(sessao.id)
    expect(await ctx.repositorio.listarSessoes()).toHaveLength(0)
  })

  it('calcula estatísticas só com sessões encerradas e informa as em andamento', async () => {
    const jogo = await criarJogo(ctx)

    const primeira = await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(60 * MINUTO)
    await ctx.servico.encerrarSessao(primeira.id)

    const segunda = await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(30 * MINUTO)
    await ctx.servico.encerrarSessao(segunda.id)

    await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(15 * MINUTO)

    const estatisticas = await ctx.servico.calcularEstatisticasJogo(jogo.id)

    expect(estatisticas.totalSessoes).toBe(2)
    expect(estatisticas.sessoesEmAndamento).toBe(1)
    expect(estatisticas.duracaoTotalMs).toBe(90 * MINUTO)
    expect(estatisticas.horasTotais).toBe(1.5)
    expect(estatisticas.mediaPorSessaoMs).toBe(45 * MINUTO)
    expect(estatisticas.mediaHorasPorSessao).toBe(0.75)
    expect(await ctx.servico.calcularTempoTotalAoVivo(jogo.id)).toBe(105 * MINUTO)
  })
})

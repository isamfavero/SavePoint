import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { calcularDuracaoSessao } from '../calculos'
import { RepositorioIndexedDb } from '../repositorio-indexeddb'
import { RepositorioMemoria } from '../repositorio-memoria'
import { ServicoSavePoint } from '../servico'
import type { Jogo } from '../tipos'

const MINUTO = 60_000
const HORA = 60 * MINUTO
const INICIO = new Date('2026-01-01T10:00:00.000Z')

type Contexto = {
  servico: ServicoSavePoint
  avancar: (ms: number) => void
  agora: () => Date
  limpar: () => Promise<void>
}

function criarServico(
  repositorio: RepositorioMemoria | RepositorioIndexedDb,
  prefixo = 'id',
): Omit<Contexto, 'limpar'> {
  let agora = INICIO.getTime()
  let contador = 0

  return {
    servico: new ServicoSavePoint(repositorio, {
      idFactory: () => `${prefixo}-${++contador}`,
      agora: () => new Date(agora),
    }),
    avancar: (ms) => {
      agora += ms
    },
    agora: () => new Date(agora),
  }
}

async function criarContextoMemoria(): Promise<Contexto> {
  return { ...criarServico(new RepositorioMemoria()), limpar: async () => undefined }
}

async function criarContextoIndexedDb(): Promise<Contexto> {
  const nome = `savepoint-teste-${crypto.randomUUID()}`
  const repositorio = new RepositorioIndexedDb(nome)

  return {
    ...criarServico(repositorio),
    limpar: async () => {
      await repositorio.fechar().catch(() => undefined)
      await new Promise<void>((resolve) => {
        const requisicao = indexedDB.deleteDatabase(nome)
        requisicao.onsuccess = () => resolve()
        requisicao.onerror = () => resolve()
        requisicao.onblocked = () => resolve()
      })
    },
  }
}

async function criarJogo(ctx: Contexto, nome = 'Ecos da Torre'): Promise<Jogo> {
  return ctx.servico.criarJogo({
    nome,
    plataforma: 'PC',
    generos: ['Aventura'],
    situacao: 'Jogando',
  })
}

const implementacoes: Array<[string, () => Promise<Contexto>]> = [
  ['memória', criarContextoMemoria],
  ['IndexedDB', criarContextoIndexedDb],
]

describe.each(implementacoes)('Editar, apagar, buscar e backup (%s)', (_nome, criar) => {
  let ctx: Contexto

  beforeEach(async () => {
    ctx = await criar()
  })

  afterEach(async () => {
    await ctx.limpar()
  })

  // ---------- Sessões: editar e corrigir horário ----------

  it('edita os textos de uma sessão encerrada sem mudar os horários', async () => {
    const jogo = await criarJogo(ctx)
    const sessao = await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(30 * MINUTO)
    await ctx.servico.encerrarSessao(sessao.id, { oQueFiz: 'Errado' })

    const editada = await ctx.servico.atualizarSessao(sessao.id, {
      oQueFiz: '  Explorei a ala leste ',
      proximoPasso: 'Achar a chave',
    })

    expect(editada.oQueFiz).toBe('Explorei a ala leste')
    expect(editada.proximoPasso).toBe('Achar a chave')
    expect(editada.inicio).toEqual(INICIO)
    expect(calcularDuracaoSessao(editada)).toBe(30 * MINUTO)
  })

  it('corrige uma sessão esquecida aberta encerrando no horário informado', async () => {
    const jogo = await criarJogo(ctx)
    const sessao = await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(10 * HORA)

    const fim = new Date(INICIO.getTime() + 2 * HORA)
    const corrigida = await ctx.servico.atualizarSessao(sessao.id, { fim })

    expect(corrigida.fim).toEqual(fim)
    expect(calcularDuracaoSessao(corrigida)).toBe(2 * HORA)
    expect(await ctx.servico.obterSessaoAtiva()).toBeNull()

    // A regra de uma sessão ativa continua: já dá para iniciar outra.
    await expect(ctx.servico.iniciarSessao(jogo.id)).resolves.toMatchObject({ numero: 2 })
  })

  it('soma a pausa até o fim informado ao corrigir uma sessão aberta e pausada', async () => {
    const jogo = await criarJogo(ctx)
    const sessao = await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(HORA)
    await ctx.servico.pausarSessao(sessao.id)
    ctx.avancar(5 * HORA)

    const corrigida = await ctx.servico.atualizarSessao(sessao.id, {
      fim: new Date(INICIO.getTime() + 3 * HORA),
    })

    expect(corrigida.pausadoEm).toBeNull()
    expect(calcularDuracaoSessao(corrigida)).toBe(HORA)
  })

  it('recusa fim antes do início, horário no futuro e reabrir sessão encerrada', async () => {
    const jogo = await criarJogo(ctx)
    const sessao = await ctx.servico.iniciarSessao(jogo.id)
    ctx.avancar(HORA)

    await expect(
      ctx.servico.atualizarSessao(sessao.id, { fim: new Date(INICIO.getTime() - MINUTO) }),
    ).rejects.toThrow('anterior ao início')

    await expect(
      ctx.servico.atualizarSessao(sessao.id, { inicio: new Date(INICIO.getTime() + 2 * HORA) }),
    ).rejects.toThrow('futuro')

    await ctx.servico.encerrarSessao(sessao.id)

    await expect(ctx.servico.atualizarSessao(sessao.id, { fim: null })).rejects.toThrow(
      'reaberta',
    )
  })

  it('encurtar o intervalo nunca deixa a pausa maior que a sessão', async () => {
    const jogo = await criarJogo(ctx)
    const sessao = await ctx.servico.iniciarSessao(jogo.id)
    await ctx.servico.pausarSessao(sessao.id)
    ctx.avancar(2 * HORA)
    await ctx.servico.retomarSessao(sessao.id)
    ctx.avancar(HORA)
    await ctx.servico.encerrarSessao(sessao.id)

    const corrigida = await ctx.servico.atualizarSessao(sessao.id, {
      fim: new Date(INICIO.getTime() + 30 * MINUTO),
    })

    expect(corrigida.tempoPausado).toBe(30 * MINUTO)
    expect(calcularDuracaoSessao(corrigida)).toBe(0)
  })

  // ---------- Sessões: apagar ----------

  it('apaga a sessão junto com as anotações dela e libera objetivos concluídos nela', async () => {
    const jogo = await criarJogo(ctx)
    const primeira = await ctx.servico.iniciarSessao(jogo.id)
    const objetivo = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: primeira.id,
      tipo: 'Objetivo',
      texto: 'Abrir o observatório',
    })
    await ctx.servico.encerrarSessao(primeira.id)

    const segunda = await ctx.servico.iniciarSessao(jogo.id)
    await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: segunda.id,
      tipo: 'Senhas',
      texto: '4-8-15',
    })
    await ctx.servico.concluirObjetivo(objetivo.id, { concluidoSessaoId: segunda.id })

    await ctx.servico.excluirSessao(segunda.id)

    expect(await ctx.servico.obterSessao(segunda.id)).toBeNull()
    expect(await ctx.servico.listarRegistrosDaSessao(segunda.id)).toEqual([])
    expect(await ctx.servico.obterSessaoAtiva()).toBeNull()

    const restante = await ctx.servico.obterRegistro(objetivo.id)
    expect(restante?.concluido).toBe(true)
    expect(restante?.concluidoSessaoId).toBeNull()

    // Todo registro restante continua ligado a uma sessão existente.
    for (const registro of await ctx.servico.listarRegistrosDoJogo(jogo.id)) {
      expect(await ctx.servico.obterSessao(registro.sessaoId)).not.toBeNull()
    }
  })

  it('conta sessões e anotações que saem junto com o jogo', async () => {
    const jogo = await criarJogo(ctx)
    const sessao = await ctx.servico.iniciarSessao(jogo.id)
    await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'Primeiro dia',
    })

    expect(await ctx.servico.contarDependentesDoJogo(jogo.id)).toEqual({
      sessoes: 1,
      registros: 1,
    })
  })

  // ---------- Busca ----------

  it('busca sem diferenciar maiúsculas nem acentos, por tag e com filtros', async () => {
    const jogo = await criarJogo(ctx)
    const outro = await criarJogo(ctx, 'Outro Mundo')
    const sessao = await ctx.servico.iniciarSessao(jogo.id)

    await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Documentos',
      texto: 'A Canção da Lua fala do observatório',
      tags: ['#lore'],
    })
    ctx.avancar(MINUTO)
    await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Senhas',
      texto: 'Cofre: 1984',
      tags: ['#código'],
    })
    await ctx.servico.encerrarSessao(sessao.id)

    const sessaoOutro = await ctx.servico.iniciarSessao(outro.id)
    ctx.avancar(MINUTO)
    await ctx.servico.criarRegistro({
      jogoId: outro.id,
      sessaoId: sessaoOutro.id,
      tipo: 'Diário',
      texto: 'Nada de cancoes aqui, só a lua',
    })

    const porAcento = await ctx.servico.buscarRegistros('CANCAO')
    expect(porAcento.map((r) => r.texto)).toEqual(['A Canção da Lua fala do observatório'])

    const porTag = await ctx.servico.buscarRegistros('#codigo')
    expect(porTag.map((r) => r.tipo)).toEqual(['Senhas'])

    const tagSemCerquilha = await ctx.servico.buscarRegistros('lore')
    expect(tagSemCerquilha).toHaveLength(1)

    const lua = await ctx.servico.buscarRegistros('lua')
    expect(lua.map((r) => r.jogoId)).toEqual([outro.id, jogo.id])

    expect(await ctx.servico.buscarRegistros('lua', jogo.id)).toHaveLength(1)
    expect(await ctx.servico.buscarRegistros('', undefined, ['Senhas', 'Diário'])).toHaveLength(2)
    expect(await ctx.servico.buscarRegistros('', undefined, [])).toHaveLength(3)
    expect(await ctx.servico.buscarRegistros('', undefined, undefined, 2)).toHaveLength(2)
  })

  // ---------- Backup ----------

  it('exporta e importa tudo num banco vazio, inclusive capas e objetivos', async () => {
    const capa = new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/png' })
    const jogo = await ctx.servico.criarJogo({
      nome: 'Ecos da Torre',
      plataforma: 'PC',
      generos: ['Aventura'],
      situacao: 'Jogando',
      capa,
    })
    const sessao = await ctx.servico.iniciarSessao(jogo.id)
    const objetivo = await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Objetivo',
      texto: 'Abrir o portão',
      tags: ['#lore'],
    })
    await ctx.servico.concluirObjetivo(objetivo.id)
    ctx.avancar(HORA)
    await ctx.servico.encerrarSessao(sessao.id, { ondeParei: 'No portão' })

    // Passa pelo mesmo caminho do arquivo: JSON de ida e volta.
    const arquivo = JSON.parse(JSON.stringify(await ctx.servico.exportarDados()))

    const destino = criarServico(new RepositorioMemoria(), 'novo')
    const resumo = await destino.servico.importarDados(arquivo)

    expect(resumo).toEqual({ jogos: 1, sessoes: 1, registros: 1, ignorados: 0, sessoesEncerradas: 0 })

    const [importado] = await destino.servico.listarJogos()
    expect(importado.id).toBe(jogo.id)
    expect(importado.criadoEm).toEqual(jogo.criadoEm)
    expect(new Uint8Array(await importado.capa!.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 250]),
    )

    const [sessaoImportada] = await destino.servico.listarSessoesDoJogo(jogo.id)
    expect(sessaoImportada.ondeParei).toBe('No portão')
    expect(calcularDuracaoSessao(sessaoImportada)).toBe(HORA)

    const registroImportado = await destino.servico.obterRegistro(objetivo.id)
    expect(registroImportado?.concluido).toBe(true)
    expect(registroImportado?.concluidoSessaoId).toBe(sessao.id)
    expect(registroImportado?.tags).toEqual(['#lore'])
  })

  it('importar de novo não duplica nada', async () => {
    const jogo = await criarJogo(ctx)
    const sessao = await ctx.servico.iniciarSessao(jogo.id)
    await ctx.servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'Uma nota',
    })

    const arquivo = JSON.parse(JSON.stringify(await ctx.servico.exportarDados()))
    const resumo = await ctx.servico.importarDados(arquivo)

    expect(resumo).toMatchObject({ jogos: 0, sessoes: 0, registros: 0, ignorados: 3 })
    expect(await ctx.servico.listarJogos()).toHaveLength(1)
    expect(await ctx.servico.listarRegistrosDoJogo(jogo.id)).toHaveLength(1)
  })

  it('encerra a sessão ativa importada se já houver uma aberta aqui', async () => {
    const origem = criarServico(new RepositorioMemoria(), 'origem')
    const jogoOrigem = await origem.servico.criarJogo({
      nome: 'De fora',
      plataforma: 'PC',
      generos: [],
      situacao: 'Jogando',
    })
    await origem.servico.iniciarSessao(jogoOrigem.id)
    origem.avancar(HORA)
    const arquivo = JSON.parse(JSON.stringify(await origem.servico.exportarDados()))

    const jogoLocal = await criarJogo(ctx)
    await ctx.servico.iniciarSessao(jogoLocal.id)

    const resumo = await ctx.servico.importarDados(arquivo)

    expect(resumo.sessoesEncerradas).toBe(1)
    const ativas = (await ctx.servico.listarTodasSessoes()).filter((s) => s.fim === null)
    expect(ativas).toHaveLength(1)
    expect(ativas[0].jogoId).toBe(jogoLocal.id)
  })

  it('recusa arquivos que não são backup do SavePoint', async () => {
    await expect(ctx.servico.importarDados({ qualquer: 'coisa' })).rejects.toThrow(
      'não é um backup do SavePoint',
    )
    await expect(
      ctx.servico.importarDados({
        formato: 'savepoint-backup',
        versao: 1,
        exportadoEm: INICIO.toISOString(),
        jogos: [{ id: 'x' }],
        sessoes: [],
        registros: [],
      }),
    ).rejects.toThrow('não é um backup do SavePoint')
    expect(await ctx.servico.listarJogos()).toEqual([])
  })
})

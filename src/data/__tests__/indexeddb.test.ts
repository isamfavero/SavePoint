import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { RepositorioIndexedDb } from '../repositorio-indexeddb'
import { ServicoSavePoint } from '../servico'

function apagarBanco(nome: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const requisicao = indexedDB.deleteDatabase(nome)
    requisicao.onsuccess = () => resolve()
    requisicao.onerror = () => reject(requisicao.error)
    requisicao.onblocked = () => resolve()
  })
}

it('persiste jogos, capa Blob, sessões e registros entre instâncias', async () => {
  const nome = `savepoint-persistencia-${crypto.randomUUID()}`
  const primeiroRepositorio = new RepositorioIndexedDb(nome)
  let segundoRepositorio: RepositorioIndexedDb | null = null

  try {
    const primeiroServico = new ServicoSavePoint(primeiroRepositorio)
    const capa = new Blob(['capa'], { type: 'image/png' })

    const jogo = await primeiroServico.criarJogo({
      nome: 'Ecos da Torre',
      plataforma: 'PC',
      generos: ['Aventura'],
      situacao: 'Jogando',
      capa,
    })

    const sessao = await primeiroServico.iniciarSessao(jogo.id)
    const registro = await primeiroServico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'anotação persistida',
    })

    await primeiroRepositorio.fechar()

    segundoRepositorio = new RepositorioIndexedDb(nome)
    const segundoServico = new ServicoSavePoint(segundoRepositorio)

    const jogoLido = await segundoServico.obterJogo(jogo.id)
    expect(jogoLido?.nome).toBe('Ecos da Torre')
    expect(jogoLido?.criadoEm).toBeInstanceOf(Date)
    expect(jogoLido?.capa).toBeInstanceOf(Blob)
    expect(await jogoLido?.capa?.text()).toBe('capa')

    const sessaoLida = await segundoServico.obterSessao(sessao.id)
    expect(sessaoLida?.numero).toBe(1)
    expect(sessaoLida?.inicio).toBeInstanceOf(Date)

    const registroLido = await segundoServico.obterRegistro(registro.id)
    expect(registroLido?.texto).toBe('anotação persistida')
    expect(registroLido?.dataHora).toBeInstanceOf(Date)
  } finally {
    await primeiroRepositorio.fechar().catch(() => undefined)
    await segundoRepositorio?.fechar().catch(() => undefined)
    await apagarBanco(nome)
  }
})

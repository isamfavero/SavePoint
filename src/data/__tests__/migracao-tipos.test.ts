import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { lerBackup } from '../backup'
import { RepositorioIndexedDb } from '../repositorio-indexeddb'

function criarBancoVersao1(nome: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const requisicao = indexedDB.open(nome, 1)

    requisicao.onupgradeneeded = () => {
      const banco = requisicao.result
      banco.createObjectStore('jogos', { keyPath: 'id' })
      banco.createObjectStore('sessoes', { keyPath: 'id' }).createIndex('jogoId', 'jogoId')
      const registros = banco.createObjectStore('registros', { keyPath: 'id' })
      registros.createIndex('jogoId', 'jogoId')
      registros.createIndex('sessaoId', 'sessaoId')
      registros.add({
        id: 'r1',
        jogoId: 'j1',
        sessaoId: 's1',
        tipo: 'Manuscritos',
        texto: 'Carta antiga',
        tags: [],
        dataHora: new Date('2026-01-01T10:00:00Z'),
      })
      registros.add({
        id: 'r2',
        jogoId: 'j1',
        sessaoId: 's1',
        tipo: 'Senhas',
        texto: '1234',
        tags: [],
        dataHora: new Date('2026-01-01T10:05:00Z'),
      })
    }

    requisicao.onsuccess = () => {
      requisicao.result.close()
      resolve()
    }
    requisicao.onerror = () => reject(requisicao.error)
  })
}

describe('tipo Manuscritos renomeado para Documentos', () => {
  it('converte os registros antigos ao abrir o banco na versão nova', async () => {
    const nome = `savepoint-migracao-${crypto.randomUUID()}`
    await criarBancoVersao1(nome)

    const repositorio = new RepositorioIndexedDb(nome)
    const registros = await repositorio.listarRegistros()
    await repositorio.fechar()

    expect(registros.find((r) => r.id === 'r1')?.tipo).toBe('Documentos')
    expect(registros.find((r) => r.id === 'r2')?.tipo).toBe('Senhas')
  })

  it('aceita backups antigos com o tipo Manuscritos', () => {
    const dados = lerBackup({
      formato: 'savepoint-backup',
      versao: 1,
      exportadoEm: '2026-01-01T10:00:00.000Z',
      jogos: [],
      sessoes: [],
      registros: [
        {
          id: 'r1',
          jogoId: 'j1',
          sessaoId: 's1',
          tipo: 'Manuscritos',
          texto: 'Carta',
          tags: [],
          dataHora: '2026-01-01T10:00:00.000Z',
        },
      ],
    })

    expect(dados.registros[0].tipo).toBe('Documentos')
  })
})

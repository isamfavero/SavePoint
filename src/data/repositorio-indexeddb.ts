import type { RepositorioSavePoint } from './repositorio'
import type { Jogo, Registro, Sessao } from './tipos'
import { registroCorrespondeBusca } from '../dominio/busca'
import { TIPOS_RENOMEADOS } from '../constantes'

const NOME_BANCO_PADRAO = 'savepoint'
// Versão 2: o tipo "Manuscritos" passou a se chamar "Documentos".
const VERSAO_BANCO = 2

const LOJA_JOGOS = 'jogos'
const LOJA_SESSOES = 'sessoes'
const LOJA_REGISTROS = 'registros'

type NomeLoja = typeof LOJA_JOGOS | typeof LOJA_SESSOES | typeof LOJA_REGISTROS

function aguardarRequisicao<T>(requisicao: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requisicao.onsuccess = () => resolve(requisicao.result)
    requisicao.onerror = () =>
      reject(requisicao.error ?? new Error('Falha em uma operação do IndexedDB.'))
  })
}

function aguardarTransacao(transacao: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transacao.oncomplete = () => resolve()
    transacao.onerror = () =>
      reject(transacao.error ?? new Error('Falha em uma transação do IndexedDB.'))
    transacao.onabort = () =>
      reject(transacao.error ?? new Error('Transação do IndexedDB abortada.'))
  })
}

/** Converte registros gravados com nomes de tipo antigos (dentro da atualização do banco). */
function renomearTiposAntigos(loja: IDBObjectStore): void {
  const cursor = loja.openCursor()

  cursor.onsuccess = () => {
    const atual = cursor.result
    if (!atual) return

    const registro = atual.value as Registro
    const novoTipo = TIPOS_RENOMEADOS[registro.tipo]

    if (novoTipo) atual.update({ ...registro, tipo: novoTipo })
    atual.continue()
  }
}

function abrirBanco(nomeBanco: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const requisicao = indexedDB.open(nomeBanco, VERSAO_BANCO)

    requisicao.onupgradeneeded = (evento) => {
      const banco = requisicao.result
      const versaoAnterior = evento.oldVersion

      if (!banco.objectStoreNames.contains(LOJA_JOGOS)) {
        banco.createObjectStore(LOJA_JOGOS, { keyPath: 'id' })
      }

      if (!banco.objectStoreNames.contains(LOJA_SESSOES)) {
        const sessoes = banco.createObjectStore(LOJA_SESSOES, { keyPath: 'id' })
        sessoes.createIndex('jogoId', 'jogoId', { unique: false })
      }

      if (!banco.objectStoreNames.contains(LOJA_REGISTROS)) {
        const registros = banco.createObjectStore(LOJA_REGISTROS, { keyPath: 'id' })
        registros.createIndex('jogoId', 'jogoId', { unique: false })
        registros.createIndex('sessaoId', 'sessaoId', { unique: false })
      }

      if (versaoAnterior >= 1 && versaoAnterior < 2 && requisicao.transaction) {
        renomearTiposAntigos(requisicao.transaction.objectStore(LOJA_REGISTROS))
      }
    }

    requisicao.onsuccess = () => {
      const banco = requisicao.result
      // Se uma versão mais nova do app precisar atualizar o banco, esta aba cede a vez.
      banco.onversionchange = () => banco.close()
      resolve(banco)
    }
    requisicao.onerror = () =>
      reject(requisicao.error ?? new Error('Não foi possível abrir o IndexedDB.'))
    requisicao.onblocked = () =>
      reject(
        new Error(
          'O SavePoint está aberto em outra aba com uma versão antiga. Feche as outras abas e tente de novo.',
        ),
      )
  })
}

export class RepositorioIndexedDb implements RepositorioSavePoint {
  private readonly banco: Promise<IDBDatabase>

  constructor(nomeBanco = NOME_BANCO_PADRAO) {
    this.banco = abrirBanco(nomeBanco)
  }

  async fechar(): Promise<void> {
    const banco = await this.banco
    banco.close()
  }

  private async operar<T>(
    nomeLoja: NomeLoja,
    modo: IDBTransactionMode,
    operacao: (loja: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const banco = await this.banco
    const transacao = banco.transaction(nomeLoja, modo)
    const requisicao = operacao(transacao.objectStore(nomeLoja))
    const resultado = await aguardarRequisicao(requisicao)

    if (modo !== 'readonly') {
      await aguardarTransacao(transacao)
    }

    return resultado
  }

  async criarJogo(jogo: Jogo): Promise<void> {
    await this.operar(LOJA_JOGOS, 'readwrite', (loja) => loja.add(jogo))
  }

  async listarJogos(): Promise<Jogo[]> {
    return this.operar(LOJA_JOGOS, 'readonly', (loja) => loja.getAll())
  }

  async obterJogo(id: string): Promise<Jogo | null> {
    const jogo = await this.operar<Jogo | undefined>(LOJA_JOGOS, 'readonly', (loja) =>
      loja.get(id),
    )
    return jogo ?? null
  }

  async atualizarJogo(jogo: Jogo): Promise<void> {
    await this.operar(LOJA_JOGOS, 'readwrite', (loja) => loja.put(jogo))
  }

  async excluirJogo(id: string): Promise<void> {
    await this.operar(LOJA_JOGOS, 'readwrite', (loja) => loja.delete(id))
  }

  async criarSessao(sessao: Sessao): Promise<void> {
    await this.operar(LOJA_SESSOES, 'readwrite', (loja) => loja.add(sessao))
  }

  async listarSessoes(): Promise<Sessao[]> {
    return this.operar(LOJA_SESSOES, 'readonly', (loja) => loja.getAll())
  }

  async listarSessoesPorJogo(jogoId: string): Promise<Sessao[]> {
    return this.operar<Sessao[]>(LOJA_SESSOES, 'readonly', (loja) =>
      loja.index('jogoId').getAll(jogoId),
    )
  }

  async obterSessao(id: string): Promise<Sessao | null> {
    const sessao = await this.operar<Sessao | undefined>(
      LOJA_SESSOES,
      'readonly',
      (loja) => loja.get(id),
    )
    return sessao ?? null
  }

  async atualizarSessao(sessao: Sessao): Promise<void> {
    await this.operar(LOJA_SESSOES, 'readwrite', (loja) => loja.put(sessao))
  }

  async excluirSessao(id: string): Promise<void> {
    await this.operar(LOJA_SESSOES, 'readwrite', (loja) => loja.delete(id))
  }

  async criarRegistro(registro: Registro): Promise<void> {
    await this.operar(LOJA_REGISTROS, 'readwrite', (loja) => loja.add(registro))
  }

  async listarRegistros(): Promise<Registro[]> {
    return this.operar(LOJA_REGISTROS, 'readonly', (loja) => loja.getAll())
  }

  async listarRegistrosPorJogo(jogoId: string): Promise<Registro[]> {
    return this.operar<Registro[]>(LOJA_REGISTROS, 'readonly', (loja) =>
      loja.index('jogoId').getAll(jogoId),
    )
  }

  async listarRegistrosPorSessao(sessaoId: string): Promise<Registro[]> {
    return this.operar<Registro[]>(LOJA_REGISTROS, 'readonly', (loja) =>
      loja.index('sessaoId').getAll(sessaoId),
    )
  }

  async obterRegistro(id: string): Promise<Registro | null> {
    const registro = await this.operar<Registro | undefined>(
      LOJA_REGISTROS,
      'readonly',
      (loja) => loja.get(id),
    )
    return registro ?? null
  }

  async atualizarRegistro(registro: Registro): Promise<void> {
    await this.operar(LOJA_REGISTROS, 'readwrite', (loja) => loja.put(registro))
  }

  async excluirRegistro(id: string): Promise<void> {
    await this.operar(LOJA_REGISTROS, 'readwrite', (loja) => loja.delete(id))
  }

  async excluirJogoComDependentes(jogoId: string): Promise<void> {
    const banco = await this.banco
    const transacao = banco.transaction(
      [LOJA_JOGOS, LOJA_SESSOES, LOJA_REGISTROS],
      'readwrite',
    )

    const jogos = transacao.objectStore(LOJA_JOGOS)
    const sessoes = transacao.objectStore(LOJA_SESSOES)
    const registros = transacao.objectStore(LOJA_REGISTROS)

    const sessoesPendentes = sessoes.index('jogoId').getAllKeys(jogoId)
    const registrosPendentes = registros.index('jogoId').getAllKeys(jogoId)

    const [idsSessoes, idsRegistros] = await Promise.all([
      aguardarRequisicao(sessoesPendentes),
      aguardarRequisicao(registrosPendentes),
    ])

    jogos.delete(jogoId)
    idsSessoes.forEach((id) => sessoes.delete(id))
    idsRegistros.forEach((id) => registros.delete(id))

    await aguardarTransacao(transacao)
  }

  async buscarRegistros(
    filtros: { texto: string; jogoId?: string; tipos?: string[]; limite?: number; deslocamento?: number }
  ): Promise<Registro[]> {
    const { texto, jogoId, tipos, limite = 30, deslocamento = 0 } = filtros

    const registros = (await this.operar(LOJA_REGISTROS, 'readonly', (loja) =>
      loja.getAll(),
    )) as Registro[]

    return registros
      .filter((registro) => registroCorrespondeBusca(registro, { texto, jogoId, tipos }))
      .sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime())
      .slice(deslocamento, limite + deslocamento)
  }
}

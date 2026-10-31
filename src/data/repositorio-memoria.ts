import type { RepositorioSavePoint } from './repositorio'
import type { Jogo, Registro, Sessao } from './tipos'
import { normalizarTexto } from '../dominio/biblioteca'

function clonar<T>(valor: T): T {
  return structuredClone(valor)
}

export class RepositorioMemoria implements RepositorioSavePoint {
  private readonly jogos = new Map<string, Jogo>()
  private readonly sessoes = new Map<string, Sessao>()
  private readonly registros = new Map<string, Registro>()

  async criarJogo(jogo: Jogo): Promise<void> {
    this.jogos.set(jogo.id, clonar(jogo))
  }

  async listarJogos(): Promise<Jogo[]> {
    return [...this.jogos.values()].map(clonar)
  }

  async obterJogo(id: string): Promise<Jogo | null> {
    const jogo = this.jogos.get(id)
    return jogo ? clonar(jogo) : null
  }

  async atualizarJogo(jogo: Jogo): Promise<void> {
    this.jogos.set(jogo.id, clonar(jogo))
  }

  async excluirJogo(id: string): Promise<void> {
    this.jogos.delete(id)
  }

  async criarSessao(sessao: Sessao): Promise<void> {
    this.sessoes.set(sessao.id, clonar(sessao))
  }

  async listarSessoes(): Promise<Sessao[]> {
    return [...this.sessoes.values()].map(clonar)
  }

  async listarSessoesPorJogo(jogoId: string): Promise<Sessao[]> {
    return [...this.sessoes.values()]
      .filter((sessao) => sessao.jogoId === jogoId)
      .map(clonar)
  }

  async obterSessao(id: string): Promise<Sessao | null> {
    const sessao = this.sessoes.get(id)
    return sessao ? clonar(sessao) : null
  }

  async atualizarSessao(sessao: Sessao): Promise<void> {
    this.sessoes.set(sessao.id, clonar(sessao))
  }

  async excluirSessao(id: string): Promise<void> {
    this.sessoes.delete(id)
  }

  async criarRegistro(registro: Registro): Promise<void> {
    this.registros.set(registro.id, clonar(registro))
  }

  async listarRegistros(): Promise<Registro[]> {
    return [...this.registros.values()].map(clonar)
  }

  async listarRegistrosPorJogo(jogoId: string): Promise<Registro[]> {
    return [...this.registros.values()]
      .filter((registro) => registro.jogoId === jogoId)
      .map(clonar)
  }

  async listarRegistrosPorSessao(sessaoId: string): Promise<Registro[]> {
    return [...this.registros.values()]
      .filter((registro) => registro.sessaoId === sessaoId)
      .map(clonar)
  }

  async obterRegistro(id: string): Promise<Registro | null> {
    const registro = this.registros.get(id)
    return registro ? clonar(registro) : null
  }

  async atualizarRegistro(registro: Registro): Promise<void> {
    this.registros.set(registro.id, clonar(registro))
  }

  async excluirRegistro(id: string): Promise<void> {
    this.registros.delete(id)
  }

  async excluirJogoComDependentes(jogoId: string): Promise<void> {
    this.jogos.delete(jogoId)

    for (const [id, sessao] of this.sessoes) {
      if (sessao.jogoId === jogoId) this.sessoes.delete(id)
    }

    for (const [id, registro] of this.registros) {
      if (registro.jogoId === jogoId) this.registros.delete(id)
    }
  }

  async buscarRegistros(
    filtros: { texto: string; jogoId?: string; tipos?: string[]; limite?: number; deslocamento?: number }
  ): Promise<Registro[]> {
    const { texto, jogoId, tipos, limite = 30, deslocamento = 0 } = filtros

    return [...this.registros.values()]
      .filter((registro) => {
        const matchTexto = registro.texto && normalizarTexto(registro.texto).includes(texto)
        const matchJogo = !jogoId || registro.jogoId === jogoId
        const matchTipos = !tipos || tipos.includes(registro.tipo)

        return matchTexto && matchJogo && matchTipos
      })
      .sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime())
      .slice(deslocamento, limite + deslocamento)
      .map(clonar)
  }
}

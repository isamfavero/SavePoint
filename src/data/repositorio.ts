import type { Jogo, Registro, Sessao } from './tipos'

export interface RepositorioSavePoint {
  criarJogo(jogo: Jogo): Promise<void>
  listarJogos(): Promise<Jogo[]>
  obterJogo(id: string): Promise<Jogo | null>
  atualizarJogo(jogo: Jogo): Promise<void>
  excluirJogo(id: string): Promise<void>

  criarSessao(sessao: Sessao): Promise<void>
  listarSessoes(): Promise<Sessao[]>
  listarSessoesPorJogo(jogoId: string): Promise<Sessao[]>
  obterSessao(id: string): Promise<Sessao | null>
  atualizarSessao(sessao: Sessao): Promise<void>
  excluirSessao(id: string): Promise<void>

  criarRegistro(registro: Registro): Promise<void>
  listarRegistros(): Promise<Registro[]>
  listarRegistrosPorJogo(jogoId: string): Promise<Registro[]>
  listarRegistrosPorSessao(sessaoId: string): Promise<Registro[]>
  obterRegistro(id: string): Promise<Registro | null>
  atualizarRegistro(registro: Registro): Promise<void>
  excluirRegistro(id: string): Promise<void>
  buscarRegistros(filtros: { texto: string; jogoId?: string; tipos?: string[]; limite?: number; deslocamento?: number }): Promise<Registro[]>

  excluirJogoComDependentes(jogoId: string): Promise<void>
  fechar?(): Promise<void>
}

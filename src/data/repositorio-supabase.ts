import type { SupabaseClient } from '@supabase/supabase-js'
import type { SituacaoJogo, TipoRegistro } from '../constantes'
import { registroCorrespondeBusca } from '../dominio/busca'
import type { RepositorioSavePoint } from './repositorio'
import type { Jogo, Registro, Sessao } from './tipos'

const BUCKET_CAPAS = 'capas'
const TAMANHO_PAGINA = 1000

// ---------- Linhas do banco ----------

export type JogoLinha = {
  id: string
  nome: string
  plataforma: string
  generos: string[]
  capa_caminho: string | null
  situacao: string
  criado_em: string
  atualizado_em: string
}

export type SessaoLinha = {
  id: string
  jogo_id: string
  numero: number
  inicio: string
  fim: string | null
  tempo_pausado: number
  pausado_em: string | null
  o_que_fiz: string
  onde_parei: string
  proximo_passo: string
}

export type RegistroLinha = {
  id: string
  jogo_id: string
  sessao_id: string
  tipo: string
  texto: string
  tags: string[]
  data_hora: string
  concluido: boolean | null
  concluido_em: string | null
  concluido_sessao_id: string | null
}

const iso = (data: Date | null | undefined): string | null => (data ? data.toISOString() : null)
const data = (texto: string | null): Date | null => (texto ? new Date(texto) : null)

export function jogoDeLinha(linha: JogoLinha, capa: Blob | null): Jogo {
  return {
    id: linha.id,
    nome: linha.nome,
    plataforma: linha.plataforma,
    generos: linha.generos ?? [],
    capa,
    situacao: linha.situacao as SituacaoJogo,
    criadoEm: new Date(linha.criado_em),
    atualizadoEm: new Date(linha.atualizado_em),
  }
}

export function linhaDeJogo(jogo: Jogo, capaCaminho: string | null): JogoLinha {
  return {
    id: jogo.id,
    nome: jogo.nome,
    plataforma: jogo.plataforma,
    generos: jogo.generos,
    capa_caminho: capaCaminho,
    situacao: jogo.situacao,
    criado_em: jogo.criadoEm.toISOString(),
    atualizado_em: jogo.atualizadoEm.toISOString(),
  }
}

export function sessaoDeLinha(linha: SessaoLinha): Sessao {
  return {
    id: linha.id,
    jogoId: linha.jogo_id,
    numero: linha.numero,
    inicio: new Date(linha.inicio),
    fim: data(linha.fim),
    tempoPausado: Number(linha.tempo_pausado),
    pausadoEm: data(linha.pausado_em),
    oQueFiz: linha.o_que_fiz,
    ondeParei: linha.onde_parei,
    proximoPasso: linha.proximo_passo,
  }
}

export function linhaDeSessao(sessao: Sessao): SessaoLinha {
  return {
    id: sessao.id,
    jogo_id: sessao.jogoId,
    numero: sessao.numero,
    inicio: sessao.inicio.toISOString(),
    fim: iso(sessao.fim),
    tempo_pausado: Math.round(sessao.tempoPausado),
    pausado_em: iso(sessao.pausadoEm),
    o_que_fiz: sessao.oQueFiz,
    onde_parei: sessao.ondeParei,
    proximo_passo: sessao.proximoPasso,
  }
}

export function registroDeLinha(linha: RegistroLinha): Registro {
  const registro: Registro = {
    id: linha.id,
    jogoId: linha.jogo_id,
    sessaoId: linha.sessao_id,
    tipo: linha.tipo as TipoRegistro,
    texto: linha.texto,
    tags: linha.tags ?? [],
    dataHora: new Date(linha.data_hora),
  }

  // Campos de conclusão só existem em Objetivo; reaberto, ficam de fora, como no app.
  if (linha.tipo === 'Objetivo') {
    registro.concluido = Boolean(linha.concluido)

    if (registro.concluido) {
      registro.concluidoEm = data(linha.concluido_em)
      registro.concluidoSessaoId = linha.concluido_sessao_id
    }
  }

  return registro
}

export function linhaDeRegistro(registro: Registro): RegistroLinha {
  const objetivo = registro.tipo === 'Objetivo'
  const concluido = objetivo && Boolean(registro.concluido)

  return {
    id: registro.id,
    jogo_id: registro.jogoId,
    sessao_id: registro.sessaoId,
    tipo: registro.tipo,
    texto: registro.texto,
    tags: registro.tags,
    data_hora: registro.dataHora.toISOString(),
    concluido: objetivo ? Boolean(registro.concluido) : null,
    concluido_em: concluido ? iso(registro.concluidoEm) : null,
    concluido_sessao_id: concluido ? (registro.concluidoSessaoId ?? null) : null,
  }
}

export function extensaoDaCapa(tipo: string): string {
  if (tipo === 'image/png') return 'png'
  if (tipo === 'image/webp') return 'webp'
  if (tipo === 'image/gif') return 'gif'
  return 'jpg'
}

type ErroNuvem = { message?: string; code?: string }

/** Traduz erros do Supabase (banco e armazenamento) para mensagens em português. */
export function erroDaNuvem(erro: ErroNuvem): Error {
  const mensagem = (erro.message ?? '').toLowerCase()

  if (mensagem.includes('fetch') || mensagem.includes('network')) {
    return new Error('Sem conexão com a nuvem. Confira a internet e tente de novo.')
  }

  if (erro.code === 'PGRST205' || erro.code === '42P01') {
    return new Error(
      'As tabelas do SavePoint ainda não existem no Supabase. Rode o arquivo supabase/migrations/0001_savepoint.sql no SQL Editor do painel.',
    )
  }

  if (erro.code === '23505') {
    return new Error('Esse registro já existe, ou já há uma sessão ativa nesta conta.')
  }

  if (mensagem.includes('bucket not found')) {
    return new Error('O espaço de capas ainda não existe no Supabase. Rode o SQL de novo.')
  }

  const detalhe = [erro.code, erro.message].filter(Boolean).join(': ')
  return new Error(
    `Não foi possível falar com a nuvem. Tente de novo.${detalhe ? ` (Detalhe: ${detalhe})` : ''}`,
  )
}

function exigir(erro: ErroNuvem | null): void {
  if (erro) throw erroDaNuvem(erro)
}

/**
 * Guarda tudo no Supabase, ligado à conta da pessoa (a segurança por linha do
 * banco impede ler ou gravar dados de outro usuário). Implementa a mesma
 * interface do repositório local, então as telas não mudam.
 */
export class RepositorioSupabase implements RepositorioSavePoint {
  private readonly cliente: SupabaseClient
  private readonly usuarioId: string
  // Capas já baixadas, por caminho: evita baixar de novo a cada leitura.
  private readonly capas = new Map<string, Blob>()

  constructor(cliente: SupabaseClient, usuarioId: string) {
    this.cliente = cliente
    this.usuarioId = usuarioId
  }

  // ---------- Capas ----------

  private async baixarCapa(caminho: string): Promise<Blob | null> {
    const guardada = this.capas.get(caminho)
    if (guardada) return guardada

    try {
      const { data: arquivo, error } = await this.cliente.storage.from(BUCKET_CAPAS).download(caminho)
      if (error || !arquivo) return null

      this.capas.set(caminho, arquivo)
      return arquivo
    } catch {
      // Uma capa que não carrega não pode impedir o jogo de aparecer.
      return null
    }
  }

  private async enviarCapa(jogoId: string, capa: Blob): Promise<string> {
    const caminho = `${this.usuarioId}/${jogoId}-${Date.now()}.${extensaoDaCapa(capa.type)}`
    const { error } = await this.cliente.storage
      .from(BUCKET_CAPAS)
      .upload(caminho, capa, { contentType: capa.type || 'image/jpeg', upsert: false })

    exigir(error)
    this.capas.set(caminho, capa)
    return caminho
  }

  private async removerCapa(caminho: string | null | undefined): Promise<void> {
    if (!caminho) return

    this.capas.delete(caminho)

    try {
      await this.cliente.storage.from(BUCKET_CAPAS).remove([caminho])
    } catch {
      // Sobrar um arquivo na nuvem não afeta o app.
    }
  }

  private async lerTudo<T>(montar: () => any): Promise<T[]> {
    const todas: T[] = []

    for (let de = 0; ; de += TAMANHO_PAGINA) {
      const { data: pagina, error } = await montar()
        .order('id')
        .range(de, de + TAMANHO_PAGINA - 1)

      exigir(error)
      todas.push(...((pagina ?? []) as T[]))

      if ((pagina ?? []).length < TAMANHO_PAGINA) break
    }

    return todas
  }

  private async jogoComCapa(linha: JogoLinha): Promise<Jogo> {
    const capa = linha.capa_caminho ? await this.baixarCapa(linha.capa_caminho) : null
    return jogoDeLinha(linha, capa)
  }

  // ---------- Jogos ----------

  async criarJogo(jogo: Jogo): Promise<void> {
    const caminho = jogo.capa ? await this.enviarCapa(jogo.id, jogo.capa) : null
    const { error } = await this.cliente.from('jogos').insert(linhaDeJogo(jogo, caminho))

    if (error) {
      await this.removerCapa(caminho)
      throw erroDaNuvem(error)
    }
  }

  async listarJogos(): Promise<Jogo[]> {
    const linhas = await this.lerTudo<JogoLinha>(() => this.cliente.from('jogos').select('*'))
    return Promise.all(linhas.map((linha) => this.jogoComCapa(linha)))
  }

  async obterJogo(id: string): Promise<Jogo | null> {
    const { data: linha, error } = await this.cliente.from('jogos').select('*').eq('id', id).maybeSingle()
    exigir(error)
    return linha ? this.jogoComCapa(linha as JogoLinha) : null
  }

  async atualizarJogo(jogo: Jogo): Promise<void> {
    const { data: atual, error: erroLeitura } = await this.cliente
      .from('jogos')
      .select('capa_caminho')
      .eq('id', jogo.id)
      .maybeSingle()
    exigir(erroLeitura)

    const caminhoAtual = (atual?.capa_caminho as string | null | undefined) ?? null
    let novoCaminho = caminhoAtual

    if (!jogo.capa) {
      novoCaminho = null
    } else if (!caminhoAtual || this.capas.get(caminhoAtual) !== jogo.capa) {
      novoCaminho = await this.enviarCapa(jogo.id, jogo.capa)
    }

    const { id: _id, ...campos } = linhaDeJogo(jogo, novoCaminho)
    const { error } = await this.cliente.from('jogos').update(campos).eq('id', jogo.id)

    if (error) {
      if (novoCaminho && novoCaminho !== caminhoAtual) await this.removerCapa(novoCaminho)
      throw erroDaNuvem(error)
    }

    if (caminhoAtual && caminhoAtual !== novoCaminho) await this.removerCapa(caminhoAtual)
  }

  async excluirJogo(id: string): Promise<void> {
    await this.excluirJogoComDependentes(id)
  }

  /** As sessões e anotações saem junto por "on delete cascade" no banco. */
  async excluirJogoComDependentes(jogoId: string): Promise<void> {
    const { data: atual } = await this.cliente
      .from('jogos')
      .select('capa_caminho')
      .eq('id', jogoId)
      .maybeSingle()

    const { error } = await this.cliente.from('jogos').delete().eq('id', jogoId)
    exigir(error)

    await this.removerCapa(atual?.capa_caminho as string | null | undefined)
  }

  // ---------- Sessões ----------

  async criarSessao(sessao: Sessao): Promise<void> {
    const { error } = await this.cliente.from('sessoes').insert(linhaDeSessao(sessao))
    exigir(error)
  }

  async listarSessoes(): Promise<Sessao[]> {
    const linhas = await this.lerTudo<SessaoLinha>(() => this.cliente.from('sessoes').select('*'))
    return linhas.map(sessaoDeLinha)
  }

  async listarSessoesPorJogo(jogoId: string): Promise<Sessao[]> {
    const linhas = await this.lerTudo<SessaoLinha>(() =>
      this.cliente.from('sessoes').select('*').eq('jogo_id', jogoId),
    )
    return linhas.map(sessaoDeLinha)
  }

  async obterSessao(id: string): Promise<Sessao | null> {
    const { data: linha, error } = await this.cliente.from('sessoes').select('*').eq('id', id).maybeSingle()
    exigir(error)
    return linha ? sessaoDeLinha(linha as SessaoLinha) : null
  }

  async atualizarSessao(sessao: Sessao): Promise<void> {
    const { id: _id, jogo_id: _jogo, ...campos } = linhaDeSessao(sessao)
    const { error } = await this.cliente.from('sessoes').update(campos).eq('id', sessao.id)
    exigir(error)
  }

  async excluirSessao(id: string): Promise<void> {
    const { error } = await this.cliente.from('sessoes').delete().eq('id', id)
    exigir(error)
  }

  // ---------- Registros ----------

  async criarRegistro(registro: Registro): Promise<void> {
    const { error } = await this.cliente.from('registros').insert(linhaDeRegistro(registro))
    exigir(error)
  }

  async listarRegistros(): Promise<Registro[]> {
    const linhas = await this.lerTudo<RegistroLinha>(() => this.cliente.from('registros').select('*'))
    return linhas.map(registroDeLinha)
  }

  async listarRegistrosPorJogo(jogoId: string): Promise<Registro[]> {
    const linhas = await this.lerTudo<RegistroLinha>(() =>
      this.cliente.from('registros').select('*').eq('jogo_id', jogoId),
    )
    return linhas.map(registroDeLinha)
  }

  async listarRegistrosPorSessao(sessaoId: string): Promise<Registro[]> {
    const linhas = await this.lerTudo<RegistroLinha>(() =>
      this.cliente.from('registros').select('*').eq('sessao_id', sessaoId),
    )
    return linhas.map(registroDeLinha)
  }

  async obterRegistro(id: string): Promise<Registro | null> {
    const { data: linha, error } = await this.cliente.from('registros').select('*').eq('id', id).maybeSingle()
    exigir(error)
    return linha ? registroDeLinha(linha as RegistroLinha) : null
  }

  async atualizarRegistro(registro: Registro): Promise<void> {
    const { id: _id, ...campos } = linhaDeRegistro(registro)
    const { error } = await this.cliente.from('registros').update(campos).eq('id', registro.id)
    exigir(error)
  }

  async excluirRegistro(id: string): Promise<void> {
    const { error } = await this.cliente.from('registros').delete().eq('id', id)
    exigir(error)
  }

  /** Busca sem acento e por tag, igual ao repositório local: filtra no navegador. */
  async buscarRegistros(filtros: {
    texto: string
    jogoId?: string
    tipos?: string[]
    limite?: number
    deslocamento?: number
  }): Promise<Registro[]> {
    const { texto, jogoId, tipos, limite = 30, deslocamento = 0 } = filtros

    const linhas = await this.lerTudo<RegistroLinha>(() => {
      let consulta = this.cliente.from('registros').select('*')
      if (jogoId) consulta = consulta.eq('jogo_id', jogoId)
      if (tipos && tipos.length > 0) consulta = consulta.in('tipo', tipos)
      return consulta
    })

    return linhas
      .map(registroDeLinha)
      .filter((registro) => registroCorrespondeBusca(registro, { texto, jogoId, tipos }))
      .sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime())
      .slice(deslocamento, deslocamento + limite)
  }
}

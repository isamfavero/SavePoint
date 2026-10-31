import {
  calcularEstatisticasSessoes,
  calcularTempoTotalAoVivo as calcularTempoTotalAoVivoSessoes,
} from './calculos'
import type { EstatisticasJogo } from './calculos'
import { ErroSavePoint } from './erros'
import type { RepositorioSavePoint } from './repositorio'
import type {
  AtualizacaoJogo,
  AtualizacaoRegistro,
  DadosEncerramentoSessao,
  DadosJogo,
  DadosRegistro,
  Jogo,
  Registro,
  Sessao,
} from './tipos'

type OpcoesServico = {
  idFactory?: () => string
  agora?: () => Date
}

function normalizarGeneros(generos: string[]): string[] {
  return [...new Set(generos.map((genero) => genero.trim()).filter(Boolean))]
}

function normalizarTag(tag: string): string | null {
  const valor = tag.trim()

  if (!valor) return null

  const semCerquilha = valor.replace(/^#+/, '')

  if (!semCerquilha) return null

  if (/\s/.test(semCerquilha)) {
    throw new ErroSavePoint('DADOS_INVALIDOS', 'Tags não podem conter espaços.')
  }

  return `#${semCerquilha.toLowerCase()}`
}

function normalizarTags(tags: string[] = []): string[] {
  const normalizadas = new Set<string>()

  for (const tag of tags) {
    const normalizada = normalizarTag(tag)

    if (normalizada) normalizadas.add(normalizada)
  }

  return [...normalizadas]
}

function validarTextoRegistro(texto: string): string {
  const limpo = texto.trim()

  if (!limpo) {
    throw new ErroSavePoint('DADOS_INVALIDOS', 'O texto da anotação é obrigatório.')
  }

  return limpo
}

export class ServicoSavePoint {
  private readonly repositorio: RepositorioSavePoint
  private readonly gerarId: () => string
  private readonly agora: () => Date

  constructor(repositorio: RepositorioSavePoint, opcoes: OpcoesServico = {}) {
    this.repositorio = repositorio
    this.gerarId = opcoes.idFactory ?? (() => crypto.randomUUID())
    this.agora = opcoes.agora ?? (() => new Date())
  }

  async criarJogo(dados: DadosJogo): Promise<Jogo> {
    const nome = dados.nome.trim()
    const plataforma = dados.plataforma.trim()
    const generos = normalizarGeneros(dados.generos)

    if (!nome) {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'O nome do jogo é obrigatório.')
    }

    if (!plataforma) {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'A plataforma do jogo é obrigatória.')
    }

    if (generos.length > 3) {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'Um jogo pode ter no máximo 3 gêneros.')
    }

    const agora = this.agora()
    const jogo: Jogo = {
      id: this.gerarId(),
      nome,
      plataforma,
      generos,
      capa: dados.capa ?? null,
      situacao: dados.situacao,
      criadoEm: agora,
      atualizadoEm: agora,
    }

    await this.repositorio.criarJogo(jogo)
    return jogo
  }

  async listarJogos(): Promise<Jogo[]> {
    return this.repositorio.listarJogos()
  }

  async obterJogo(id: string): Promise<Jogo | null> {
    return this.repositorio.obterJogo(id)
  }

  async atualizarJogo(id: string, dados: AtualizacaoJogo): Promise<Jogo> {
    const existente = await this.repositorio.obterJogo(id)

    if (!existente) {
      throw new ErroSavePoint('JOGO_NAO_ENCONTRADO', 'Jogo não encontrado.')
    }

    const nome = dados.nome !== undefined ? dados.nome.trim() : existente.nome
    const plataforma =
      dados.plataforma !== undefined ? dados.plataforma.trim() : existente.plataforma
    const generos =
      dados.generos !== undefined ? normalizarGeneros(dados.generos) : existente.generos

    if (!nome) {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'O nome do jogo é obrigatório.')
    }

    if (!plataforma) {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'A plataforma do jogo é obrigatória.')
    }

    if (generos.length > 3) {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'Um jogo pode ter no máximo 3 gêneros.')
    }

    const atualizado: Jogo = {
      ...existente,
      nome,
      plataforma,
      generos,
      capa: dados.capa !== undefined ? dados.capa : existente.capa,
      situacao: dados.situacao ?? existente.situacao,
      criadoEm: existente.criadoEm,
      atualizadoEm: this.agora(),
    }

    await this.repositorio.atualizarJogo(atualizado)
    return atualizado
  }

  async excluirJogo(id: string): Promise<void> {
    const jogo = await this.repositorio.obterJogo(id)

    if (!jogo) {
      throw new ErroSavePoint('JOGO_NAO_ENCONTRADO', 'Jogo não encontrado.')
    }

    await this.repositorio.excluirJogoComDependentes(id)
  }

  async iniciarSessao(jogoId: string): Promise<Sessao> {
    const jogo = await this.repositorio.obterJogo(jogoId)

    if (!jogo) {
      throw new ErroSavePoint('JOGO_NAO_ENCONTRADO', 'Jogo não encontrado.')
    }

    const sessoes = await this.repositorio.listarSessoes()

    if (sessoes.some((sessao) => sessao.fim === null)) {
      throw new ErroSavePoint(
        'SESSAO_ATIVA_EXISTENTE',
        'Já existe uma sessão ativa. Encerre-a antes de iniciar outra.',
      )
    }

    const numero =
      sessoes
        .filter((sessao) => sessao.jogoId === jogoId)
        .reduce((maior, sessao) => Math.max(maior, sessao.numero), 0) + 1

    const sessao: Sessao = {
      id: this.gerarId(),
      jogoId,
      numero,
      inicio: this.agora(),
      fim: null,
      tempoPausado: 0,
      pausadoEm: null,
      oQueFiz: '',
      ondeParei: '',
      proximoPasso: '',
    }

    await this.repositorio.criarSessao(sessao)
    return sessao
  }

  async obterSessaoAtiva(): Promise<Sessao | null> {
    const sessoes = await this.repositorio.listarSessoes()
    return sessoes.find((sessao) => sessao.fim === null) ?? null
  }

  async obterSessao(id: string): Promise<Sessao | null> {
    return this.repositorio.obterSessao(id)
  }

  async listarSessoesDoJogo(jogoId: string): Promise<Sessao[]> {
    const sessoes = await this.repositorio.listarSessoesPorJogo(jogoId)
    return [...sessoes].sort((a, b) => a.numero - b.numero)
  }

  async pausarSessao(id: string): Promise<Sessao> {
    const sessao = await this.exigirSessaoAberta(id)

    if (sessao.pausadoEm) {
      throw new ErroSavePoint('SESSAO_JA_PAUSADA', 'A sessão já está pausada.')
    }

    const atualizada: Sessao = {
      ...sessao,
      pausadoEm: this.agora(),
    }

    await this.repositorio.atualizarSessao(atualizada)
    return atualizada
  }

  async retomarSessao(id: string): Promise<Sessao> {
    const sessao = await this.exigirSessaoAberta(id)

    if (!sessao.pausadoEm) {
      throw new ErroSavePoint('SESSAO_NAO_PAUSADA', 'A sessão não está pausada.')
    }

    const agora = this.agora()
    const pausa = Math.max(0, agora.getTime() - sessao.pausadoEm.getTime())

    const atualizada: Sessao = {
      ...sessao,
      tempoPausado: sessao.tempoPausado + pausa,
      pausadoEm: null,
    }

    await this.repositorio.atualizarSessao(atualizada)
    return atualizada
  }

  async encerrarSessao(
    id: string,
    dados: DadosEncerramentoSessao = {},
    fim?: Date,
  ): Promise<Sessao> {
    const sessao = await this.exigirSessaoAberta(id)
    const fimEfetivo = fim ?? sessao.pausadoEm ?? this.agora()

    if (fimEfetivo.getTime() < sessao.inicio.getTime()) {
      throw new ErroSavePoint(
        'DADOS_INVALIDOS',
        'O fim da sessão não pode ser anterior ao início.',
      )
    }

    let tempoPausado = sessao.tempoPausado

    if (sessao.pausadoEm) {
      if (fimEfetivo.getTime() < sessao.pausadoEm.getTime()) {
        throw new ErroSavePoint(
          'DADOS_INVALIDOS',
          'O fim da sessão não pode ser anterior ao início da pausa.',
        )
      }

      tempoPausado += fimEfetivo.getTime() - sessao.pausadoEm.getTime()
    }

    const atualizada: Sessao = {
      ...sessao,
      fim: fimEfetivo,
      tempoPausado,
      pausadoEm: null,
      oQueFiz: dados.oQueFiz ?? sessao.oQueFiz,
      ondeParei: dados.ondeParei ?? sessao.ondeParei,
      proximoPasso: dados.proximoPasso ?? sessao.proximoPasso,
    }

    await this.repositorio.atualizarSessao(atualizada)
    return atualizada
  }

  async criarRegistro(dados: DadosRegistro): Promise<Registro> {
    await this.validarVinculoRegistro(dados.jogoId, dados.sessaoId)

    const registro: Registro = {
      id: this.gerarId(),
      jogoId: dados.jogoId,
      sessaoId: dados.sessaoId,
      tipo: dados.tipo,
      texto: validarTextoRegistro(dados.texto),
      tags: normalizarTags(dados.tags),
      dataHora: dados.dataHora ?? this.agora(),
    }

    if (dados.tipo === 'Objetivo') {
      const concluido = dados.concluido ?? false
      const concluidoSessaoId = concluido ? (dados.concluidoSessaoId ?? null) : null

      if (concluidoSessaoId) {
        await this.validarSessaoDoJogo(dados.jogoId, concluidoSessaoId)
      }

      registro.concluido = concluido
      registro.concluidoEm = concluido ? (dados.concluidoEm ?? null) : null
      registro.concluidoSessaoId = concluidoSessaoId
    }

    await this.repositorio.criarRegistro(registro)
    return registro
  }

  async listarRegistrosDoJogo(jogoId: string): Promise<Registro[]> {
    return this.repositorio.listarRegistrosPorJogo(jogoId)
  }

  async listarRegistrosDaSessao(sessaoId: string): Promise<Registro[]> {
    return this.repositorio.listarRegistrosPorSessao(sessaoId)
  }

  async listarTagsUsadas(jogoId: string): Promise<string[]> {
    const registros = await this.repositorio.listarRegistrosPorJogo(jogoId)
    const contagem = new Map<string, { tag: string; total: number; ordem: number }>()

    for (const registro of registros) {
      const tagsDoRegistro = new Set<string>()

      for (const tag of registro.tags) {
        try {
          const normalizada = normalizarTag(tag)

          if (normalizada) tagsDoRegistro.add(normalizada)
        } catch {
          continue
        }
      }

      for (const normalizada of tagsDoRegistro) {
        const atual = contagem.get(normalizada)

        if (atual) {
          atual.total += 1
        } else {
          contagem.set(normalizada, {
            tag: normalizada,
            total: 1,
            ordem: contagem.size,
          })
        }
      }
    }

    return [...contagem.values()]
      .sort((a, b) => b.total - a.total || a.ordem - b.ordem)
      .map((item) => item.tag)
  }

  async obterRegistro(id: string): Promise<Registro | null> {
    return this.repositorio.obterRegistro(id)
  }

  async atualizarRegistro(id: string, dados: AtualizacaoRegistro): Promise<Registro> {
    const existente = await this.repositorio.obterRegistro(id)

    if (!existente) {
      throw new ErroSavePoint('REGISTRO_NAO_ENCONTRADO', 'Registro não encontrado.')
    }

    const jogoId = dados.jogoId ?? existente.jogoId
    const sessaoId = dados.sessaoId ?? existente.sessaoId
    const tipo = dados.tipo ?? existente.tipo

    await this.validarVinculoRegistro(jogoId, sessaoId)

    const registro: Registro = {
      ...existente,
      jogoId,
      sessaoId,
      tipo,
      texto:
        dados.texto !== undefined
          ? validarTextoRegistro(dados.texto)
          : existente.texto,
      tags: dados.tags !== undefined ? normalizarTags(dados.tags) : existente.tags,
      dataHora: dados.dataHora ?? existente.dataHora,
    }

    if (tipo === 'Objetivo') {
      const concluido = dados.concluido ?? existente.concluido ?? false
      const concluidoEm =
        dados.concluidoEm !== undefined ? dados.concluidoEm : (existente.concluidoEm ?? null)
      const concluidoSessaoId =
        dados.concluidoSessaoId !== undefined
          ? dados.concluidoSessaoId
          : (existente.concluidoSessaoId ?? null)

      if (concluido && concluidoSessaoId) {
        await this.validarSessaoDoJogo(jogoId, concluidoSessaoId)
      }

      registro.concluido = concluido
      registro.concluidoEm = concluido ? concluidoEm : null
      registro.concluidoSessaoId = concluido ? concluidoSessaoId : null
    } else {
      delete registro.concluido
      delete registro.concluidoEm
      delete registro.concluidoSessaoId
    }

    await this.repositorio.atualizarRegistro(registro)
    return registro
  }

  async concluirObjetivo(
    id: string,
    dados: { concluidoEm?: Date; concluidoSessaoId?: string | null } = {},
  ): Promise<Registro> {
    const existente = await this.repositorio.obterRegistro(id)

    if (!existente) {
      throw new ErroSavePoint('REGISTRO_NAO_ENCONTRADO', 'Registro não encontrado.')
    }

    if (existente.tipo !== 'Objetivo') {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'Só objetivos podem ser concluídos.')
    }

    return this.atualizarRegistro(id, {
      concluido: true,
      concluidoEm: dados.concluidoEm ?? this.agora(),
      concluidoSessaoId: dados.concluidoSessaoId ?? null,
    })
  }

  async excluirRegistro(id: string): Promise<void> {
    const registro = await this.repositorio.obterRegistro(id)

    if (!registro) {
      throw new ErroSavePoint('REGISTRO_NAO_ENCONTRADO', 'Registro não encontrado.')
    }

    await this.repositorio.excluirRegistro(id)
  }

  async calcularEstatisticasJogo(jogoId: string): Promise<EstatisticasJogo> {
    const jogo = await this.repositorio.obterJogo(jogoId)

    if (!jogo) {
      throw new ErroSavePoint('JOGO_NAO_ENCONTRADO', 'Jogo não encontrado.')
    }

    const sessoes = await this.repositorio.listarSessoesPorJogo(jogoId)
    return calcularEstatisticasSessoes(sessoes, this.agora())
  }

  async calcularTempoTotalAoVivo(jogoId: string): Promise<number> {
    const jogo = await this.repositorio.obterJogo(jogoId)

    if (!jogo) {
      throw new ErroSavePoint('JOGO_NAO_ENCONTRADO', 'Jogo não encontrado.')
    }

    const sessoes = await this.repositorio.listarSessoesPorJogo(jogoId)
    return calcularTempoTotalAoVivoSessoes(sessoes, this.agora())
  }

  private async exigirSessaoAberta(id: string): Promise<Sessao> {
    const sessao = await this.repositorio.obterSessao(id)

    if (!sessao) {
      throw new ErroSavePoint('SESSAO_NAO_ENCONTRADA', 'Sessão não encontrada.')
    }

    if (sessao.fim !== null) {
      throw new ErroSavePoint('SESSAO_ENCERRADA', 'A sessão já foi encerrada.')
    }

    return sessao
  }

  private async validarVinculoRegistro(jogoId: string, sessaoId: string): Promise<Sessao> {
    if (!sessaoId) {
      throw new ErroSavePoint(
        'REGISTRO_EXIGE_SESSAO',
        'Todo registro precisa estar vinculado a uma sessão.',
      )
    }

    const jogo = await this.repositorio.obterJogo(jogoId)

    if (!jogo) {
      throw new ErroSavePoint('JOGO_NAO_ENCONTRADO', 'Jogo não encontrado.')
    }

    const sessao = await this.repositorio.obterSessao(sessaoId)

    if (!sessao) {
      throw new ErroSavePoint('SESSAO_NAO_ENCONTRADA', 'Sessão não encontrada.')
    }

    if (sessao.jogoId !== jogoId) {
      throw new ErroSavePoint(
        'SESSAO_DE_OUTRO_JOGO',
        'A sessão informada pertence a outro jogo.',
      )
    }

    return sessao
  }

  private async validarSessaoDoJogo(jogoId: string, sessaoId: string): Promise<void> {
    const sessao = await this.repositorio.obterSessao(sessaoId)

    if (!sessao) {
      throw new ErroSavePoint('SESSAO_NAO_ENCONTRADA', 'Sessão não encontrada.')
    }

    if (sessao.jogoId !== jogoId) {
      throw new ErroSavePoint(
        'SESSAO_DE_OUTRO_JOGO',
        'A sessão informada pertence a outro jogo.',
      )
    }
  }
}

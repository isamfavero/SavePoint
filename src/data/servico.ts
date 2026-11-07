import {
  calcularDuracaoSessao,
  calcularEstatisticasSessoes,
  calcularTempoTotalAoVivo as calcularTempoTotalAoVivoSessoes,
  MS_POR_HORA,
} from './calculos'
import type { EstatisticasJogo } from './calculos'
import { lerBackup, montarBackup } from './backup'
import type { BackupSavePoint, ResumoImportacao } from './backup'
import { normalizarTexto } from '../dominio/biblioteca'
import { ErroSavePoint } from './erros'
import type { RepositorioSavePoint } from './repositorio'
import type {
  AtualizacaoJogo,
  AtualizacaoRegistro,
  AtualizacaoSessao,
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
  onChange?: () => void
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
  private onChangeCallback: () => void

  constructor(repositorio: RepositorioSavePoint, opcoes: OpcoesServico = {}) {
    this.repositorio = repositorio
    this.gerarId = opcoes.idFactory ?? (() => crypto.randomUUID())
    this.agora = opcoes.agora ?? (() => new Date())
    this.onChangeCallback = opcoes.onChange ?? (() => {})
  }

  setOnChange(callback: () => void) {
    this.onChangeCallback = callback
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
    this.onChangeCallback()
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
    this.onChangeCallback()
    return atualizado
  }

  async excluirJogo(id: string): Promise<void> {
    const jogo = await this.repositorio.obterJogo(id)

    if (!jogo) {
      throw new ErroSavePoint('JOGO_NAO_ENCONTRADO', 'Jogo não encontrado.')
    }

    await this.repositorio.excluirJogoComDependentes(id)
    this.onChangeCallback()
  }

  /** Conta o que será apagado junto com o jogo, para a confirmação. */
  async contarDependentesDoJogo(id: string): Promise<{ sessoes: number; registros: number }> {
    const [sessoes, registros] = await Promise.all([
      this.repositorio.listarSessoesPorJogo(id),
      this.repositorio.listarRegistrosPorJogo(id),
    ])

    return { sessoes: sessoes.length, registros: registros.length }
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
    this.onChangeCallback()
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
    this.onChangeCallback()
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
    this.onChangeCallback()
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
    this.onChangeCallback()
    return atualizada
  }

  async listarTodasSessoes(): Promise<Sessao[]> {
    return this.repositorio.listarSessoes()
  }

  /**
   * Edita uma sessão já criada: os três textos e os horários de início e fim.
   * Informar `fim` numa sessão aberta a encerra nesse instante — é assim que
   * se corrige uma sessão esquecida aberta. Uma sessão encerrada não volta a
   * ficar aberta.
   */
  async atualizarSessao(id: string, dados: AtualizacaoSessao): Promise<Sessao> {
    const sessao = await this.repositorio.obterSessao(id)

    if (!sessao) {
      throw new ErroSavePoint('SESSAO_NAO_ENCONTRADA', 'Sessão não encontrada.')
    }

    const agora = this.agora()
    const inicio = dados.inicio ?? sessao.inicio

    if (Number.isNaN(inicio.getTime())) {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'Informe um horário de início válido.')
    }

    if (inicio.getTime() > agora.getTime()) {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'O início da sessão não pode estar no futuro.')
    }

    const textos = {
      oQueFiz: dados.oQueFiz !== undefined ? dados.oQueFiz.trim() : sessao.oQueFiz,
      ondeParei: dados.ondeParei !== undefined ? dados.ondeParei.trim() : sessao.ondeParei,
      proximoPasso:
        dados.proximoPasso !== undefined ? dados.proximoPasso.trim() : sessao.proximoPasso,
    }

    let atualizada: Sessao

    if (sessao.fim === null && !dados.fim) {
      if (sessao.pausadoEm && inicio.getTime() > sessao.pausadoEm.getTime()) {
        throw new ErroSavePoint(
          'DADOS_INVALIDOS',
          'O início não pode ser depois do momento em que a sessão foi pausada.',
        )
      }

      atualizada = { ...sessao, ...textos, inicio }
    } else {
      if (sessao.fim !== null && dados.fim === null) {
        throw new ErroSavePoint('DADOS_INVALIDOS', 'Uma sessão encerrada não pode ser reaberta.')
      }

      const fim = dados.fim ?? sessao.fim!

      if (Number.isNaN(fim.getTime())) {
        throw new ErroSavePoint('DADOS_INVALIDOS', 'Informe um horário de fim válido.')
      }

      if (fim.getTime() > agora.getTime()) {
        throw new ErroSavePoint('DADOS_INVALIDOS', 'O fim da sessão não pode estar no futuro.')
      }

      if (fim.getTime() < inicio.getTime()) {
        throw new ErroSavePoint(
          'DADOS_INVALIDOS',
          'O fim da sessão não pode ser anterior ao início.',
        )
      }

      let tempoPausado = sessao.tempoPausado

      // Encerrando uma sessão aberta e pausada: a pausa conta até o fim informado.
      if (sessao.fim === null && sessao.pausadoEm && fim.getTime() > sessao.pausadoEm.getTime()) {
        tempoPausado += fim.getTime() - sessao.pausadoEm.getTime()
      }

      // Com o intervalo encurtado, a pausa nunca pode passar da duração total.
      tempoPausado = Math.min(tempoPausado, fim.getTime() - inicio.getTime())

      atualizada = {
        ...sessao,
        ...textos,
        inicio,
        fim,
        tempoPausado,
        pausadoEm: null,
      }
    }

    await this.repositorio.atualizarSessao(atualizada)
    this.onChangeCallback()
    return atualizada
  }

  /**
   * Apaga a sessão e todas as anotações feitas nela. Objetivos criados em
   * outra sessão e concluídos nesta continuam concluídos, sem a sessão.
   */
  async excluirSessao(id: string): Promise<void> {
    const sessao = await this.repositorio.obterSessao(id)

    if (!sessao) {
      throw new ErroSavePoint('SESSAO_NAO_ENCONTRADA', 'Sessão não encontrada.')
    }

    const daSessao = await this.repositorio.listarRegistrosPorSessao(id)

    for (const registro of daSessao) {
      await this.repositorio.excluirRegistro(registro.id)
    }

    const doJogo = await this.repositorio.listarRegistrosPorJogo(sessao.jogoId)

    for (const registro of doJogo) {
      if (registro.concluidoSessaoId === id) {
        await this.repositorio.atualizarRegistro({ ...registro, concluidoSessaoId: null })
      }
    }

    await this.repositorio.excluirSessao(id)
    this.onChangeCallback()
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
    this.onChangeCallback()
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
        dados.concluidoEm !== undefined ? dados.concluidoEm : existente.concluidoEm
      const concluidoSessaoId =
        dados.concluidoSessaoId !== undefined
          ? dados.concluidoSessaoId
          : existente.concluidoSessaoId

      if (concluido && concluidoSessaoId) {
        await this.validarSessaoDoJogo(jogoId, concluidoSessaoId)
      }

      registro.concluido = concluido
      if (concluido) {
        registro.concluidoEm = concluidoEm ?? null
        registro.concluidoSessaoId = concluidoSessaoId ?? null
      }
      // When reopening (concluido = false), remove the fields entirely
      else {
        delete registro.concluidoEm
        delete registro.concluidoSessaoId
      }
    } else {
      delete registro.concluido
      delete registro.concluidoEm
      delete registro.concluidoSessaoId
    }

    await this.repositorio.atualizarRegistro(registro)
    this.onChangeCallback()
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

    const sessaoAtiva = await this.obterSessaoAtiva()

    return this.atualizarRegistro(id, {
      concluido: true,
      concluidoEm: dados.concluidoEm ?? this.agora(),
      concluidoSessaoId:
        dados.concluidoSessaoId ?? (sessaoAtiva ? sessaoAtiva.id : null),
    })
  }

  async reabrirObjetivo(id: string): Promise<Registro> {
    const existente = await this.repositorio.obterRegistro(id)

    if (!existente) {
      throw new ErroSavePoint('REGISTRO_NAO_ENCONTRADO', 'Registro não encontrado.')
    }

    if (existente.tipo !== 'Objetivo') {
      throw new ErroSavePoint('DADOS_INVALIDOS', 'Só objetivos podem ser reabertos.')
    }

    const atualizado = await this.atualizarRegistro(id, {
      concluido: false,
      concluidoEm: null,
      concluidoSessaoId: null,
    })

    // Remove os campos de conclusão para "remover" eles completamente
    delete atualizado.concluidoEm
    delete atualizado.concluidoSessaoId

    return atualizado
  }

  async calcularHorasNaSemana(jogoId: string): Promise<number> {
    const jogo = await this.repositorio.obterJogo(jogoId)

    if (!jogo) {
      throw new ErroSavePoint('JOGO_NAO_ENCONTRADO', 'Jogo não encontrado.')
    }

    const sessaoAtiva = await this.obterSessaoAtiva()
    const sessoes = await this.repositorio.listarSessoesPorJogo(jogoId)

    const agora = this.agora()
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)

    const encerradasNaSemana = sessoes.filter(
      (sessao) =>
        sessao.fim !== null && sessao.inicio.getTime() >= seteDiasAtras.getTime(),
    )

    const horasEncerradas = encerradasNaSemana.reduce(
      (total, sessao) => total + calcularDuracaoSessao(sessao, agora),
      0,
    )

    let horasEmAndamento = 0

    if (sessaoAtiva && sessaoAtiva.jogoId === jogoId && sessaoAtiva.inicio.getTime() >= seteDiasAtras.getTime()) {
      horasEmAndamento = calcularDuracaoSessao(sessaoAtiva, agora)
    }

    return (horasEncerradas + horasEmAndamento) / MS_POR_HORA
  }

  async excluirRegistro(id: string): Promise<void> {
    const registro = await this.repositorio.obterRegistro(id)

    if (!registro) {
      throw new ErroSavePoint('REGISTRO_NAO_ENCONTRADO', 'Registro não encontrado.')
    }

    await this.repositorio.excluirRegistro(id)
    this.onChangeCallback()
  }

  async calcularEstatisticasJogo(jogoId: string): Promise<EstatisticasJogo> {
    const jogo = await this.repositorio.obterJogo(jogoId)

    if (!jogo) {
      throw new ErroSavePoint('JOGO_NAO_ENCONTRADO', 'Jogo não encontrado.')
    }

    const sessoes = await this.repositorio.listarSessoesPorJogo(jogoId)
    return calcularEstatisticasSessoes(sessoes, this.agora())
  }

  async resumirSessao(sessaoId: string): Promise<{
    totalAnotacoes: number
    marcos: number
    regioesMapeadas: number
    objetivosConcluidos: number
    tagsUsadas: string[]
  }> {
    const registros = await this.listarRegistrosDaSessao(sessaoId)

    const totalAnotacoes = registros.length
    const marcos = registros.filter((r) => r.tipo === 'Marco').length
    const regioesMapeadas = registros.filter(
      (r) => r.tipo === 'Região mapeada',
    ).length

    const objetivosConcluidos = registros.filter(
      (r) => r.tipo === 'Objetivo' && r.concluidoSessaoId === sessaoId,
    ).length

    // Coletar tags usadas (até 3, mais "+N" se houver mais)
    const todasAsTags = new Set<string>()
    for (const registro of registros) {
      for (const tag of registro.tags) {
        try {
          const normalizada = normalizarTag(tag)
          if (normalizada) todasAsTags.add(normalizada)
        } catch {
          continue
        }
      }
    }

    const tagsArray = [...todasAsTags]
    const tagsResumidas = tagsArray.slice(0, 3)
    const adicional = tagsArray.length > 3 ? `+${tagsArray.length - 3}` : ''

    return {
      totalAnotacoes,
      marcos,
      regioesMapeadas,
      objetivosConcluidos,
      tagsUsadas: tagsResumidas.length > 0 ? [...tagsResumidas, adicional].filter((t) => t) : [],
    }
  }

  /**
   * Busca anotações sem diferenciar maiúsculas nem acentos, da mais recente
   * para a mais antiga. Texto vazio lista as mais recentes; "#tag" procura
   * só nas tags.
   */
  async buscarRegistros(
    texto: string,
    jogoId?: string,
    tipos?: string[],
    limite = 30,
    deslocamento = 0,
  ): Promise<Registro[]> {
    return this.repositorio.buscarRegistros({
      texto: normalizarTexto(texto),
      jogoId: jogoId || undefined,
      tipos: tipos && tipos.length > 0 ? tipos : undefined,
      limite,
      deslocamento,
    })
  }

  /** Junta jogos, sessões, anotações e capas num objeto pronto para virar arquivo. */
  async exportarDados(): Promise<BackupSavePoint> {
    const [jogos, sessoes, registros] = await Promise.all([
      this.repositorio.listarJogos(),
      this.repositorio.listarSessoes(),
      this.repositorio.listarRegistros(),
    ])

    return montarBackup(jogos, sessoes, registros, this.agora())
  }

  /**
   * Acrescenta os dados de um backup sem apagar nem duplicar nada: itens com
   * um id que já existe são ignorados. Mantém as regras do app — toda anotação
   * precisa de uma sessão do mesmo jogo e só pode haver uma sessão ativa.
   */
  async importarDados(conteudo: unknown): Promise<ResumoImportacao> {
    const backup = lerBackup(conteudo)

    const [jogosLocais, sessoesLocais, registrosLocais] = await Promise.all([
      this.repositorio.listarJogos(),
      this.repositorio.listarSessoes(),
      this.repositorio.listarRegistros(),
    ])

    const resumo: ResumoImportacao = {
      jogos: 0,
      sessoes: 0,
      registros: 0,
      ignorados: 0,
      sessoesEncerradas: 0,
    }

    const jogos = new Set(jogosLocais.map((jogo) => jogo.id))
    const sessoes = new Map(sessoesLocais.map((sessao) => [sessao.id, sessao.jogoId]))
    const registros = new Set(registrosLocais.map((registro) => registro.id))
    let haSessaoAtiva = sessoesLocais.some((sessao) => sessao.fim === null)

    for (const jogo of backup.jogos) {
      if (jogos.has(jogo.id)) {
        resumo.ignorados++
        continue
      }

      await this.repositorio.criarJogo(jogo)
      jogos.add(jogo.id)
      resumo.jogos++
    }

    for (const original of backup.sessoes) {
      if (sessoes.has(original.id) || !jogos.has(original.jogoId)) {
        resumo.ignorados++
        continue
      }

      let sessao = original

      if (sessao.fim === null) {
        if (haSessaoAtiva) {
          // Já existe uma sessão ativa: a importada fecha onde parou de contar.
          const fim = sessao.pausadoEm ?? backup.exportadoEm
          const fimValido = fim.getTime() < sessao.inicio.getTime() ? sessao.inicio : fim
          sessao = { ...sessao, fim: fimValido, pausadoEm: null }
          resumo.sessoesEncerradas++
        } else {
          haSessaoAtiva = true
        }
      }

      await this.repositorio.criarSessao(sessao)
      sessoes.set(sessao.id, sessao.jogoId)
      resumo.sessoes++
    }

    for (const original of backup.registros) {
      if (
        registros.has(original.id) ||
        !jogos.has(original.jogoId) ||
        sessoes.get(original.sessaoId) !== original.jogoId
      ) {
        resumo.ignorados++
        continue
      }

      const registro = { ...original }

      if (registro.concluidoSessaoId && !sessoes.has(registro.concluidoSessaoId)) {
        registro.concluidoSessaoId = null
      }

      await this.repositorio.criarRegistro(registro)
      registros.add(registro.id)
      resumo.registros++
    }

    this.onChangeCallback()
    return resumo
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

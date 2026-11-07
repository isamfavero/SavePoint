import { SITUACOES_JOGO, TIPOS_REGISTRO, TIPOS_RENOMEADOS } from '../constantes'
import { ErroSavePoint } from './erros'
import type { Jogo, Registro, Sessao } from './tipos'

export const FORMATO_BACKUP = 'savepoint-backup'
export const VERSAO_BACKUP = 1

type Serializado<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K] extends Date | null | undefined
        ? string | null | undefined
        : T[K]
}

export type JogoBackup = Omit<Serializado<Jogo>, 'capa'> & { capa: string | null }
export type SessaoBackup = Serializado<Sessao>
export type RegistroBackup = Serializado<Registro>

export type BackupSavePoint = {
  formato: typeof FORMATO_BACKUP
  versao: number
  exportadoEm: string
  jogos: JogoBackup[]
  sessoes: SessaoBackup[]
  registros: RegistroBackup[]
}

export type ResumoImportacao = {
  jogos: number
  sessoes: number
  registros: number
  ignorados: number
  sessoesEncerradas: number
}

// ---------- Capas: Blob <-> data URL ----------

function bytesParaBase64(bytes: Uint8Array): string {
  let binario = ''
  const bloco = 0x8000

  for (let i = 0; i < bytes.length; i += bloco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloco))
  }

  return btoa(binario)
}

async function lerBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer())
  }

  return new Uint8Array(await new Response(blob).arrayBuffer())
}

export async function blobParaDataUrl(blob: Blob): Promise<string> {
  const tipo = blob.type || 'application/octet-stream'
  return `data:${tipo};base64,${bytesParaBase64(await lerBytes(blob))}`
}

export function dataUrlParaBlob(dataUrl: string): Blob {
  const partes = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl)

  if (!partes || !partes[2]) {
    throw new ErroSavePoint('DADOS_INVALIDOS', 'Uma das capas do backup está corrompida.')
  }

  const binario = atob(partes[3])
  const bytes = new Uint8Array(binario.length)

  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)

  return new Blob([bytes], { type: partes[1] || 'image/jpeg' })
}

// ---------- Exportar ----------

function dataOuNulo(data: Date | null | undefined): string | null {
  return data ? data.toISOString() : null
}

export async function montarBackup(
  jogos: Jogo[],
  sessoes: Sessao[],
  registros: Registro[],
  agora: Date,
): Promise<BackupSavePoint> {
  return {
    formato: FORMATO_BACKUP,
    versao: VERSAO_BACKUP,
    exportadoEm: agora.toISOString(),
    jogos: await Promise.all(
      jogos.map(async (jogo) => ({
        ...jogo,
        capa: jogo.capa ? await blobParaDataUrl(jogo.capa) : null,
        criadoEm: jogo.criadoEm.toISOString(),
        atualizadoEm: jogo.atualizadoEm.toISOString(),
      })),
    ),
    sessoes: sessoes.map((sessao) => ({
      ...sessao,
      inicio: sessao.inicio.toISOString(),
      fim: dataOuNulo(sessao.fim),
      pausadoEm: dataOuNulo(sessao.pausadoEm),
    })),
    registros: registros.map((registro) => {
      const serializado: RegistroBackup = {
        ...registro,
        dataHora: registro.dataHora.toISOString(),
      } as RegistroBackup

      if ('concluidoEm' in registro) {
        serializado.concluidoEm = dataOuNulo(registro.concluidoEm)
      }

      return serializado
    }),
  }
}

// ---------- Ler e validar ----------

const ARQUIVO_INVALIDO = 'Este arquivo não é um backup do SavePoint.'

function erroArquivo(): ErroSavePoint {
  return new ErroSavePoint('DADOS_INVALIDOS', ARQUIVO_INVALIDO)
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function texto(valor: unknown): string {
  if (typeof valor !== 'string') throw erroArquivo()
  return valor
}

function data(valor: unknown): Date {
  const lida = new Date(texto(valor))
  if (Number.isNaN(lida.getTime())) throw erroArquivo()
  return lida
}

function dataOpcional(valor: unknown): Date | null {
  return valor === null || valor === undefined ? null : data(valor)
}

function listaDeTextos(valor: unknown): string[] {
  if (!Array.isArray(valor)) throw erroArquivo()
  return valor.map(texto)
}

function lerJogo(bruto: unknown): Jogo {
  if (!ehObjeto(bruto)) throw erroArquivo()

  const situacao = texto(bruto.situacao)
  if (!(SITUACOES_JOGO as readonly string[]).includes(situacao)) throw erroArquivo()

  return {
    id: texto(bruto.id),
    nome: texto(bruto.nome),
    plataforma: texto(bruto.plataforma),
    generos: listaDeTextos(bruto.generos),
    capa: bruto.capa ? dataUrlParaBlob(texto(bruto.capa)) : null,
    situacao: situacao as Jogo['situacao'],
    criadoEm: data(bruto.criadoEm),
    atualizadoEm: data(bruto.atualizadoEm),
  }
}

function lerSessao(bruto: unknown): Sessao {
  if (!ehObjeto(bruto)) throw erroArquivo()

  const numero = Number(bruto.numero)
  const tempoPausado = Number(bruto.tempoPausado ?? 0)
  if (!Number.isFinite(numero) || !Number.isFinite(tempoPausado)) throw erroArquivo()

  return {
    id: texto(bruto.id),
    jogoId: texto(bruto.jogoId),
    numero,
    inicio: data(bruto.inicio),
    fim: dataOpcional(bruto.fim),
    tempoPausado: Math.max(0, tempoPausado),
    pausadoEm: dataOpcional(bruto.pausadoEm),
    oQueFiz: typeof bruto.oQueFiz === 'string' ? bruto.oQueFiz : '',
    ondeParei: typeof bruto.ondeParei === 'string' ? bruto.ondeParei : '',
    proximoPasso: typeof bruto.proximoPasso === 'string' ? bruto.proximoPasso : '',
  }
}

function lerRegistro(bruto: unknown): Registro {
  if (!ehObjeto(bruto)) throw erroArquivo()

  const tipoLido = texto(bruto.tipo)
  const tipo = TIPOS_RENOMEADOS[tipoLido] ?? tipoLido
  if (!(TIPOS_REGISTRO as readonly string[]).includes(tipo)) throw erroArquivo()

  const registro: Registro = {
    id: texto(bruto.id),
    jogoId: texto(bruto.jogoId),
    sessaoId: texto(bruto.sessaoId),
    tipo: tipo as Registro['tipo'],
    texto: texto(bruto.texto),
    tags: listaDeTextos(bruto.tags ?? []),
    dataHora: data(bruto.dataHora),
  }

  if (tipo === 'Objetivo') {
    registro.concluido = Boolean(bruto.concluido)
    if (registro.concluido) {
      registro.concluidoEm = dataOpcional(bruto.concluidoEm)
      registro.concluidoSessaoId =
        typeof bruto.concluidoSessaoId === 'string' ? bruto.concluidoSessaoId : null
    }
  }

  return registro
}

export type DadosBackup = {
  exportadoEm: Date
  jogos: Jogo[]
  sessoes: Sessao[]
  registros: Registro[]
}

/** Valida e converte o conteúdo de um arquivo de backup. */
export function lerBackup(conteudo: unknown): DadosBackup {
  if (!ehObjeto(conteudo) || conteudo.formato !== FORMATO_BACKUP) throw erroArquivo()

  if (typeof conteudo.versao !== 'number' || conteudo.versao > VERSAO_BACKUP) {
    throw new ErroSavePoint(
      'DADOS_INVALIDOS',
      'Este backup foi feito por uma versão mais nova do SavePoint.',
    )
  }

  if (
    !Array.isArray(conteudo.jogos) ||
    !Array.isArray(conteudo.sessoes) ||
    !Array.isArray(conteudo.registros)
  ) {
    throw erroArquivo()
  }

  return {
    exportadoEm: data(conteudo.exportadoEm),
    jogos: conteudo.jogos.map(lerJogo),
    sessoes: conteudo.sessoes.map(lerSessao),
    registros: conteudo.registros.map(lerRegistro),
  }
}

export function nomeArquivoBackup(agora: Date): string {
  const dia = [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, '0'),
    String(agora.getDate()).padStart(2, '0'),
  ].join('-')

  return `savepoint-backup-${dia}.json`
}

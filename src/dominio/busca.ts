import { normalizarTexto } from './biblioteca'

export const RESULTADOS_POR_PAGINA = 30
export const RECENTES_NA_DICA = 10
export const ESPERA_BUSCA_MS = 250

type RegistroBuscavel = {
  texto: string
  tags: string[]
  tipo: string
  jogoId: string
}

export type FiltrosBusca = {
  texto: string
  jogoId?: string
  tipos?: string[]
}

/**
 * Diz se um registro atende à busca. O termo já deve vir normalizado
 * (sem acentos e em minúsculas). Termo vazio aceita tudo; termo começando
 * com "#" procura só nas tags; os demais procuram no texto e nas tags.
 */
export function registroCorrespondeBusca(
  registro: RegistroBuscavel,
  filtros: FiltrosBusca,
): boolean {
  if (filtros.jogoId && registro.jogoId !== filtros.jogoId) return false
  if (filtros.tipos && filtros.tipos.length > 0 && !filtros.tipos.includes(registro.tipo)) {
    return false
  }

  const termo = filtros.texto
  if (!termo) return true

  const tags = registro.tags.map((tag) => normalizarTexto(tag))

  if (termo.startsWith('#')) {
    return tags.some((tag) => tag.includes(termo))
  }

  if (normalizarTexto(registro.texto ?? '').includes(termo)) return true

  return tags.some((tag) => tag.replace(/^#/, '').includes(termo))
}

export type TrechoDestacado = {
  antes: string
  destaque: string
  depois: string
}

const CONTEXTO_ANTES = 40
const TAMANHO_TRECHO = 160

/**
 * Normaliza caractere a caractere, guardando para cada posição do texto
 * normalizado o índice do caractere original. Assim dá para destacar o
 * trecho original mesmo quando a busca ignora acentos.
 */
function normalizarComMapa(texto: string): { normalizado: string; mapa: number[] } {
  let normalizado = ''
  const mapa: number[] = []

  for (let i = 0; i < texto.length; i++) {
    const pedaco = texto[i]
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s/g, ' ')

    for (const caractere of pedaco) {
      normalizado += caractere
      mapa.push(i)
    }
  }

  return { normalizado, mapa }
}

function cortarNoEspaco(texto: string, inicio: number): number {
  if (inicio <= 0) return 0
  const espaco = texto.indexOf(' ', inicio)
  return espaco === -1 || espaco - inicio > 12 ? inicio : espaco + 1
}

/**
 * Monta um trecho curto do texto com a parte encontrada separada para
 * receber destaque. Sem termo (ou sem correspondência no texto), devolve
 * o começo do texto sem destaque.
 */
export function destacarTrecho(texto: string, termoNormalizado: string): TrechoDestacado {
  const termo = termoNormalizado.replace(/^#/, '')
  const resumo = (valor: string) =>
    valor.length > TAMANHO_TRECHO ? `${valor.slice(0, TAMANHO_TRECHO).trimEnd()}…` : valor

  if (!termo || termoNormalizado.startsWith('#')) {
    return { antes: resumo(texto), destaque: '', depois: '' }
  }

  const { normalizado, mapa } = normalizarComMapa(texto)
  const posicao = normalizado.indexOf(termo)

  if (posicao === -1) {
    return { antes: resumo(texto), destaque: '', depois: '' }
  }

  const inicioOriginal = mapa[posicao]
  const fimOriginal = mapa[posicao + termo.length - 1] + 1

  const inicioTrecho = cortarNoEspaco(texto, Math.max(0, inicioOriginal - CONTEXTO_ANTES))
  const sobra = Math.max(0, TAMANHO_TRECHO - (fimOriginal - inicioTrecho))
  const fimTrecho = Math.min(texto.length, fimOriginal + sobra)

  return {
    antes: `${inicioTrecho > 0 ? '…' : ''}${texto.slice(inicioTrecho, inicioOriginal)}`,
    destaque: texto.slice(inicioOriginal, fimOriginal),
    depois: `${texto.slice(fimOriginal, fimTrecho)}${fimTrecho < texto.length ? '…' : ''}`,
  }
}

export const LARGURA_MAXIMA_CAPA = 800

export type Dimensoes = {
  largura: number
  altura: number
}

export function calcularDimensoesReduzidas(
  largura: number,
  altura: number,
  larguraMaxima: number = LARGURA_MAXIMA_CAPA,
): Dimensoes {
  if (largura <= 0 || altura <= 0 || larguraMaxima <= 0) {
    throw new Error('Dimensões inválidas para redimensionar a imagem.')
  }

  if (largura <= larguraMaxima) {
    return { largura: Math.round(largura), altura: Math.round(altura) }
  }

  const proporcao = larguraMaxima / largura

  return {
    largura: Math.round(larguraMaxima),
    altura: Math.max(1, Math.round(altura * proporcao)),
  }
}

type FonteImagem = {
  largura: number
  altura: number
  /** A imagem decodificada, para desenhar só uma parte dela no recorte. */
  origem: CanvasImageSource
  desenhar: (contexto: CanvasRenderingContext2D, largura: number, altura: number) => void
  liberar: () => void
}

function carregarViaImagem(arquivo: Blob): Promise<FonteImagem> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const imagem = new Image()

    imagem.onload = () => {
      resolve({
        largura: imagem.naturalWidth,
        altura: imagem.naturalHeight,
        origem: imagem,
        desenhar: (contexto, largura, altura) => {
          contexto.drawImage(imagem, 0, 0, largura, altura)
        },
        liberar: () => URL.revokeObjectURL(url),
      })
    }

    imagem.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }

    imagem.src = url
  })
}

async function carregarImagem(arquivo: Blob): Promise<FonteImagem> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(arquivo)

      return {
        largura: bitmap.width,
        altura: bitmap.height,
        origem: bitmap,
        desenhar: (contexto, largura, altura) => {
          contexto.drawImage(bitmap, 0, 0, largura, altura)
        },
        liberar: () => bitmap.close(),
      }
    } catch {
      // Alguns navegadores não decodificam certos formatos via createImageBitmap.
    }
  }

  return carregarViaImagem(arquivo)
}

function converterParaBlob(
  canvas: HTMLCanvasElement,
  tipo: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Não foi possível converter a imagem.'))
        }
      },
      tipo,
      0.85,
    )
  })
}

export async function reduzirImagemParaBlob(
  arquivo: File,
  larguraMaxima: number = LARGURA_MAXIMA_CAPA,
): Promise<Blob> {
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('O arquivo escolhido não é uma imagem.')
  }

  const fonte = await carregarImagem(arquivo)

  try {
    const dimensoes = calcularDimensoesReduzidas(
      fonte.largura,
      fonte.altura,
      larguraMaxima,
    )

    if (dimensoes.largura === fonte.largura && dimensoes.altura === fonte.altura) {
      return arquivo
    }

    const canvas = document.createElement('canvas')
    canvas.width = dimensoes.largura
    canvas.height = dimensoes.altura

    const contexto = canvas.getContext('2d')

    if (!contexto) {
      throw new Error('Não foi possível preparar a imagem.')
    }

    contexto.imageSmoothingQuality = 'high'
    fonte.desenhar(contexto, dimensoes.largura, dimensoes.altura)

    const tipo = arquivo.type === 'image/png' ? 'image/png' : 'image/jpeg'

    return await converterParaBlob(canvas, tipo)
  } finally {
    fonte.liberar()
  }
}

// ---------- Recorte da capa (3x4) ----------

/** Largura dividida pela altura: toda capa é guardada em retrato 3x4. */
export const PROPORCAO_CAPA = 3 / 4
export const LARGURA_CAPA = 600
/** A foto escolhida é reduzida a isto antes do recorte, para não pesar na tela. */
export const LARGURA_MAXIMA_ORIGINAL = 1600
export const ZOOM_MAXIMO_CAPA = 4

export type Quadro = {
  largura: number
  altura: number
}

export type Centro = {
  /** Posição do centro do recorte, de 0 a 1 em relação à imagem. */
  x: number
  y: number
}

export type AreaRecorte = {
  x: number
  y: number
  largura: number
  altura: number
}

/** Tamanho do quadro de recorte (retrato 3x4) que cabe na largura dada. */
export function quadroDeCapa(largura: number): Quadro {
  return { largura, altura: largura / PROPORCAO_CAPA }
}

/** Escala mínima para a imagem cobrir o quadro por inteiro (zoom 1). */
export function escalaDeCobertura(imagem: Dimensoes, quadro: Quadro): number {
  return Math.max(quadro.largura / imagem.largura, quadro.altura / imagem.altura)
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, Math.min(minimo, maximo)), Math.max(minimo, maximo))
}

/** Impede que o recorte passe da borda da imagem. */
export function limitarCentro(
  centro: Centro,
  imagem: Dimensoes,
  quadro: Quadro,
  escala: number,
): Centro {
  const metadeX = quadro.largura / (2 * escala * imagem.largura)
  const metadeY = quadro.altura / (2 * escala * imagem.altura)

  return {
    x: limitar(centro.x, metadeX, 1 - metadeX),
    y: limitar(centro.y, metadeY, 1 - metadeY),
  }
}

/** A parte da imagem original, em pixels, que está dentro do quadro. */
export function areaDeRecorte(
  centro: Centro,
  imagem: Dimensoes,
  quadro: Quadro,
  escala: number,
): AreaRecorte {
  const largura = quadro.largura / escala
  const altura = quadro.altura / escala

  return {
    x: centro.x * imagem.largura - largura / 2,
    y: centro.y * imagem.altura - altura / 2,
    largura,
    altura,
  }
}

/** Tamanho final da capa: 3x4, até LARGURA_CAPA, sem ampliar além do que a foto tem. */
export function dimensoesDaCapa(area: AreaRecorte): Dimensoes {
  const largura = Math.max(1, Math.min(LARGURA_CAPA, Math.round(area.largura)))
  return { largura, altura: Math.max(1, Math.round(largura / PROPORCAO_CAPA)) }
}

/**
 * Corta a parte escolhida da imagem e devolve uma capa JPEG em 3x4.
 * `imagem` são as dimensões usadas na tela de recorte; se o navegador decodificar
 * a foto com outro tamanho, a área é ajustada na mesma proporção.
 */
export async function recortarCapaParaBlob(
  arquivo: Blob,
  area: AreaRecorte,
  imagem: Dimensoes,
): Promise<Blob> {
  const fonte = await carregarImagem(arquivo)

  try {
    const fatorX = fonte.largura / imagem.largura
    const fatorY = fonte.altura / imagem.altura
    const destino = dimensoesDaCapa(area)

    const canvas = document.createElement('canvas')
    canvas.width = destino.largura
    canvas.height = destino.altura

    const contexto = canvas.getContext('2d')

    if (!contexto) {
      throw new Error('Não foi possível preparar a imagem.')
    }

    contexto.imageSmoothingQuality = 'high'
    contexto.drawImage(
      fonte.origem,
      area.x * fatorX,
      area.y * fatorY,
      area.largura * fatorX,
      area.altura * fatorY,
      0,
      0,
      destino.largura,
      destino.altura,
    )

    return await converterParaBlob(canvas, 'image/jpeg')
  } finally {
    fonte.liberar()
  }
}

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

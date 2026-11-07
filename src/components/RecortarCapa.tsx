import { Check, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'
import {
  areaDeRecorte,
  escalaDeCobertura,
  limitarCentro,
  quadroDeCapa,
  recortarCapaParaBlob,
  ZOOM_MAXIMO_CAPA,
} from '../dominio/imagem'
import type { Centro, Dimensoes } from '../dominio/imagem'
import { useObjectUrl } from '../hooks/useObjectUrl'

type RecortarCapaProps = {
  /** A foto a recortar (já reduzida). */
  origem: Blob
  aoConfirmar: (capa: Blob) => void
  aoCancelar: () => void
}

const LARGURA_MAXIMA_QUADRO = 280
const PASSO_TECLADO = 0.03

function larguraDoQuadro(): number {
  return Math.min(LARGURA_MAXIMA_QUADRO, Math.floor(window.innerWidth * 0.74))
}

/**
 * Deixa a pessoa enquadrar a foto na proporção 3x4 das capas: arrastar move,
 * o controle (ou a roda do mouse) dá zoom. O resultado já sai cortado.
 */
export function RecortarCapa({ origem, aoConfirmar, aoCancelar }: RecortarCapaProps) {
  const url = useObjectUrl(origem)
  const [imagem, setImagem] = useState<Dimensoes | null>(null)
  const [larguraQuadro, setLarguraQuadro] = useState(larguraDoQuadro)
  const [zoom, setZoom] = useState(1)
  const [centro, setCentro] = useState<Centro>({ x: 0.5, y: 0.5 })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const arrasto = useRef<{ x: number; y: number } | null>(null)
  const quadroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const aoRedimensionar = () => setLarguraQuadro(larguraDoQuadro())

    window.addEventListener('resize', aoRedimensionar)
    return () => window.removeEventListener('resize', aoRedimensionar)
  }, [])

  useEffect(() => {
    quadroRef.current?.focus()
  }, [imagem])

  const quadro = quadroDeCapa(larguraQuadro)
  const escalaBase = imagem ? escalaDeCobertura(imagem, quadro) : 1
  const escala = escalaBase * zoom
  const centroValido = imagem ? limitarCentro(centro, imagem, quadro, escala) : centro

  function mover(dx: number, dy: number) {
    if (!imagem) return

    setCentro(
      limitarCentro(
        { x: centroValido.x - dx / (imagem.largura * escala), y: centroValido.y - dy / (imagem.altura * escala) },
        imagem,
        quadro,
        escala,
      ),
    )
  }

  function aoComecarArrasto(evento: PointerEvent<HTMLDivElement>) {
    evento.currentTarget.setPointerCapture(evento.pointerId)
    arrasto.current = { x: evento.clientX, y: evento.clientY }
  }

  function aoArrastar(evento: PointerEvent<HTMLDivElement>) {
    if (!arrasto.current) return

    mover(evento.clientX - arrasto.current.x, evento.clientY - arrasto.current.y)
    arrasto.current = { x: evento.clientX, y: evento.clientY }
  }

  function aoSoltar(evento: PointerEvent<HTMLDivElement>) {
    arrasto.current = null
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId)
    }
  }

  function mudarZoom(novo: number) {
    setZoom(Math.min(ZOOM_MAXIMO_CAPA, Math.max(1, novo)))
  }

  function aoRolar(evento: WheelEvent<HTMLDivElement>) {
    mudarZoom(zoom - evento.deltaY * 0.002)
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const passoX = quadro.largura * PASSO_TECLADO * 3
    const passoY = quadro.altura * PASSO_TECLADO * 3

    const acoes: Record<string, () => void> = {
      ArrowLeft: () => mover(passoX, 0),
      ArrowRight: () => mover(-passoX, 0),
      ArrowUp: () => mover(0, passoY),
      ArrowDown: () => mover(0, -passoY),
      '+': () => mudarZoom(zoom + 0.2),
      '=': () => mudarZoom(zoom + 0.2),
      '-': () => mudarZoom(zoom - 0.2),
      Escape: aoCancelar,
    }

    const acao = acoes[evento.key]

    if (acao) {
      evento.preventDefault()
      acao()
    }
  }

  async function confirmar() {
    if (!imagem) return

    setSalvando(true)
    setErro(null)

    try {
      const area = areaDeRecorte(centroValido, imagem, quadro, escala)
      aoConfirmar(await recortarCapaParaBlob(origem, area, imagem))
    } catch {
      setErro('Não foi possível recortar essa imagem. Tente com outra foto.')
      setSalvando(false)
    }
  }

  return (
    <div className="recorte-fundo" role="dialog" aria-modal="true" aria-labelledby="titulo-recorte">
      <div className="recorte">
        <div className="recorte-topo">
          <button
            type="button"
            className="botao-voltar"
            onClick={aoCancelar}
            disabled={salvando}
            aria-label="Cancelar e voltar"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <h2 id="titulo-recorte">Ajustar capa</h2>
        </div>

        <p className="recorte-dica">
          Arraste a foto e use o zoom até a capa ficar do jeito que você quer. O quadro é a
          proporção exata dos cartões.
        </p>

        <div
          ref={quadroRef}
          className="recorte-quadro"
          style={{ width: quadro.largura, height: quadro.altura }}
          tabIndex={0}
          role="group"
          aria-label="Área da capa. Use as setas para mover e + e - para o zoom."
          onPointerDown={aoComecarArrasto}
          onPointerMove={aoArrastar}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          onWheel={aoRolar}
          onKeyDown={aoTeclar}
        >
          {url && (
            <img
              className="recorte-imagem"
              src={url}
              alt=""
              draggable={false}
              onLoad={(evento) =>
                setImagem({
                  largura: evento.currentTarget.naturalWidth,
                  altura: evento.currentTarget.naturalHeight,
                })
              }
              style={
                imagem
                  ? {
                      width: imagem.largura * escala,
                      height: imagem.altura * escala,
                      left: quadro.largura / 2 - centroValido.x * imagem.largura * escala,
                      top: quadro.altura / 2 - centroValido.y * imagem.altura * escala,
                    }
                  : { visibility: 'hidden' }
              }
            />
          )}
          {!imagem && <p className="recorte-carregando">Carregando a foto...</p>}
          <span className="recorte-guia" aria-hidden="true" />
        </div>

        <div className="recorte-zoom">
          <button
            type="button"
            className="recorte-zoom-botao"
            onClick={() => mudarZoom(zoom - 0.25)}
            aria-label="Diminuir o zoom"
          >
            <ZoomOut size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <input
            type="range"
            min={1}
            max={ZOOM_MAXIMO_CAPA}
            step={0.01}
            value={zoom}
            onChange={(evento) => mudarZoom(Number(evento.target.value))}
            aria-label="Zoom"
          />
          <button
            type="button"
            className="recorte-zoom-botao"
            onClick={() => mudarZoom(zoom + 0.25)}
            aria-label="Aumentar o zoom"
          >
            <ZoomIn size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {erro && (
          <p className="campo-erro" role="alert">
            {erro}
          </p>
        )}

        <div className="recorte-acoes">
          <button type="button" className="botao-primario" onClick={() => void confirmar()} disabled={!imagem || salvando}>
            <Check size={18} strokeWidth={2} aria-hidden="true" />
            {salvando ? 'Recortando...' : 'Usar esta capa'}
          </button>
          <button type="button" className="botao-cancelar" onClick={aoCancelar} disabled={salvando}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

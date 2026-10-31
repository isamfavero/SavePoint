// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary, ErroInicial } from '../ErrorBoundary'
import { ServicoProvider } from '../../contexts/ServicoContext'

const ambiente = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
ambiente.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  container?.remove()
  container = null
  root = null
  vi.restoreAllMocks()
})

function renderizar(ui: React.ReactNode) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(ui)
  })
  return container
}

function SempreLanca(): never {
  throw new Error('Falha inesperada do SavePoint.')
}

describe('tela de erro', () => {
  it('renderiza o ErroInicial com mensagem, botão e detalhe técnico em letra pequena', () => {
    const erro = new Error('Não foi possível abrir o IndexedDB.')
    const c = renderizar(<ErroInicial erro={erro} onTentarNovamente={() => {}} />)

    expect(c.textContent).toContain('Algo deu errado ao abrir o SavePoint')

    const botao = c.querySelector('button')
    expect(botao).not.toBeNull()
    expect((botao as HTMLButtonElement).type).toBe('button')
    expect((botao as HTMLButtonElement).textContent).toContain('Tentar de novo')

    const detalhe = c.querySelector('.detalhe-tecnico')
    expect(detalhe).not.toBeNull()
    expect(detalhe!.textContent).toContain('Não foi possível abrir o IndexedDB.')
    expect(detalhe!.className).toContain('detalhe-tecnico')
  })

  it('o ErrorBoundary exibe a tela amigável quando um filho lança e o botão tenta de novo', () => {
    const c = renderizar(
      <ErrorBoundary>
        <SempreLanca />
      </ErrorBoundary>,
    )

    expect(c.textContent).toContain('Algo deu errado ao abrir o SavePoint')
    expect(c.textContent).toContain('Falha inesperada do SavePoint.')
    expect(c.querySelector('button')).not.toBeNull()

    // Clicar em "Tentar de novo" reseta o limite e re-renderiza (o filho lança de novo).
    expect(() =>
      act(() => {
        ;(c.querySelector('button') as HTMLButtonElement).dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        )
      }),
    ).not.toThrow()
    expect(c.textContent).toContain('Algo deu errado ao abrir o SavePoint')
  })

  it('exibe a tela de erro quando o IndexedDB não abrir', async () => {
    const requisicaoCapturada = { valor: null as IDBOpenDBRequest | null }
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const requisicao = {
        onerror: null,
        onsuccess: null,
        onblocked: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest
      requisicaoCapturada.valor = requisicao
      return requisicao
    })

    renderizar(
      <ErrorBoundary>
        <ServicoProvider>
          <p>conteúdo do app</p>
        </ServicoProvider>
      </ErrorBoundary>,
    )

    await act(async () => {})

    requisicaoCapturada.valor?.onerror?.(new Event('error'))
    await act(async () => {})

    expect(container!.textContent).toContain('Algo deu errado ao abrir o SavePoint')

    const botao = container!.querySelector('button')
    expect(botao).not.toBeNull()
    expect((botao as HTMLButtonElement).textContent).toContain('Tentar de novo')

    const detalhe = container!.querySelector('.detalhe-tecnico')
    expect(detalhe).not.toBeNull()
    expect(detalhe!.textContent).toContain('Não foi possível abrir o IndexedDB.')
  })
})

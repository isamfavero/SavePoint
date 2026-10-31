// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AvisoGlobal } from '../../components/AvisoGlobal'
import { AvisoProvider, useAviso } from '../AvisoContext'

const ambiente = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

ambiente.IS_REACT_ACT_ENVIRONMENT = true

function Jornada() {
  return <p>Jornada</p>
}

function NovaAnotacao() {
  const navigate = useNavigate()
  const { mostrarAviso } = useAviso()

  return (
    <button
      type="button"
      onClick={() => {
        mostrarAviso('Anotação registrada na Sessão 4.')
        navigate(-1)
      }}
    >
      Registrar anotação
    </button>
  )
}

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })

  container?.remove()
  container = null
  root = null
})

describe('AvisoProvider', () => {
  it('mantém a confirmação quando a tela anterior é alcançada pelo voltar', async () => {
    const router = createMemoryRouter(
      [
        { path: '/jornada', element: <Jornada /> },
        { path: '/nova-anotacao', element: <NovaAnotacao /> },
      ],
      {
        initialEntries: ['/jornada', '/nova-anotacao'],
        initialIndex: 1,
      },
    )

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <AvisoProvider>
          <RouterProvider router={router} />
          <AvisoGlobal />
        </AvisoProvider>,
      )
    })

    const botao = container.querySelector('button')

    expect(botao).not.toBeNull()

    await act(async () => {
      botao?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('Jornada')
    expect(container.textContent).toContain('Anotação registrada na Sessão 4.')
  })
})

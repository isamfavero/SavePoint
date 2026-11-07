// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { autenticacaoIndisponivel } from '../../conta/autenticacao'
import type { ServicoAutenticacao, Usuario } from '../../conta/autenticacao'
import { ContaProvider } from '../../contexts/ContaContext'
import { ExigeConta } from '../ExigeConta'

const ambiente = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
ambiente.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  container = null
  root = null
})

function contaFalsa(usuario: Usuario | null): ServicoAutenticacao {
  return { ...autenticacaoIndisponivel, disponivel: true, obterUsuario: async () => usuario }
}

async function abrir(servico: ServicoAutenticacao, caminho = '/biblioteca') {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root!.render(
      <ContaProvider servico={servico}>
        <MemoryRouter initialEntries={[caminho]}>
          <Routes>
            <Route path="/boas-vindas" element={<p>tela de boas-vindas</p>} />
            <Route element={<ExigeConta />}>
              <Route path="/biblioteca" element={<p>biblioteca</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ContaProvider>,
    )
  })

  return container
}

describe('ExigeConta', () => {
  it('sem conta conectada, manda para as boas-vindas antes da biblioteca', async () => {
    const tela = await abrir(contaFalsa(null))
    expect(tela.textContent).toBe('tela de boas-vindas')
  })

  it('com conta conectada, abre a biblioteca', async () => {
    const tela = await abrir(contaFalsa({ id: 'u1', email: 'isa@exemplo.com', nome: 'Isa' }))
    expect(tela.textContent).toBe('biblioteca')
  })

  it('sem Supabase configurado, o app segue funcionando neste aparelho', async () => {
    const tela = await abrir(autenticacaoIndisponivel)
    expect(tela.textContent).toBe('biblioteca')
  })
})

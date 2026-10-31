import { describe, it, expect } from 'vitest'

describe('Smoke test', () => {
  it('carrega o App sem erros de importação cíclica', async () => {
    const modulo = await import('../App')
    expect(modulo.App).toBeDefined()
  })
})


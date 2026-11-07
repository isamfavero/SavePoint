import { describe, expect, it, vi } from 'vitest'
import { normalizarUrlSupabase } from '../urlSupabase'

describe('normalizarUrlSupabase', () => {
  it('fica só com a raiz do projeto', () => {
    expect(normalizarUrlSupabase('https://abcd.supabase.co/rest/v1/')).toBe('https://abcd.supabase.co')
    expect(normalizarUrlSupabase(' "https://abcd.supabase.co/" ')).toBe('https://abcd.supabase.co')
    expect(normalizarUrlSupabase('https://abcd.supabase.co')).toBe('https://abcd.supabase.co')
  })

  it('recusa vazio, texto inválido e o link do painel', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(normalizarUrlSupabase(undefined)).toBeUndefined()
    expect(normalizarUrlSupabase('   ')).toBeUndefined()
    expect(normalizarUrlSupabase('abcd')).toBeUndefined()
    expect(normalizarUrlSupabase('https://supabase.com/dashboard/project/abcd')).toBeUndefined()

    aviso.mockRestore()
  })
})

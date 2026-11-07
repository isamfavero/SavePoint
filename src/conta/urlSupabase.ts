/**
 * Aceita a URL do projeto do jeito que vier do painel e devolve só a raiz
 * (https://<projeto>.supabase.co). Endereços copiados com /rest/v1/ ou com
 * barra no fim causam o erro "Invalid path specified in request URL".
 */
export function normalizarUrlSupabase(valor: string | undefined): string | undefined {
  const limpo = valor?.trim().replace(/^["']|["']$/g, '')
  if (!limpo) return undefined

  let endereco: URL

  try {
    endereco = new URL(limpo)
  } catch {
    console.warn('[SavePoint] VITE_SUPABASE_URL no .env não é um endereço válido.')
    return undefined
  }

  if (endereco.hostname === 'supabase.com' || endereco.hostname.endsWith('.supabase.com')) {
    console.warn(
      '[SavePoint] VITE_SUPABASE_URL aponta para o painel. Use a "Project URL", que termina em .supabase.co.',
    )
    return undefined
  }

  return endereco.origin
}

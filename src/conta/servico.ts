import { createClient } from '@supabase/supabase-js'
import { normalizarUrlSupabase } from './urlSupabase'
import {
  autenticacaoIndisponivel,
  criarAutenticacaoSupabase,
  type ClienteAuthSupabase,
  type ServicoAutenticacao,
} from './autenticacao'

const url = normalizarUrlSupabase(import.meta.env.VITE_SUPABASE_URL)
const chavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '')

/**
 * O Supabase só é usado quando as duas variáveis do .env estão preenchidas.
 * Nos testes automatizados ele fica desligado, para não depender do .env nem da rede.
 */
export const supabaseConfigurado =
  import.meta.env.MODE !== 'test' && Boolean(url && chavePublica)

export const clienteSupabase = supabaseConfigurado ? createClient(url!, chavePublica!) : null

export const servicoAutenticacao: ServicoAutenticacao = clienteSupabase
  ? criarAutenticacaoSupabase(
      clienteSupabase as unknown as ClienteAuthSupabase,
      globalThis.location?.origin ?? '',
    )
  : autenticacaoIndisponivel

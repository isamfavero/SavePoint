import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useConta } from '../contexts/ContaContext'

/**
 * Porta de entrada do app: com as contas ativas (Supabase configurado), só
 * passa quem está conectado. Quem não está vai para as boas-vindas, onde cria
 * a conta ou entra. Sem Supabase, o app segue funcionando só neste aparelho.
 */
export function ExigeConta() {
  const { servico, usuario, carregando } = useConta()
  const location = useLocation()

  if (!servico.disponivel) return <Outlet />

  if (carregando) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <p className="biblioteca-aviso" role="status">
            Abrindo sua conta...
          </p>
        </main>
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/boas-vindas" replace state={{ destino: location.pathname }} />
  }

  return <Outlet />
}

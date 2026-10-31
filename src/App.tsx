import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { JogoAtualProvider } from './contexts/JogoAtualContext'
import { ServicoProvider } from './contexts/ServicoContext'
import { SessaoAtivaProvider } from './contexts/SessaoAtivaContext'
import { limparInstanteEncerramento } from './estado/encerramento'
import { AdicionarJogo } from './pages/AdicionarJogo'
import { Biblioteca } from './pages/Biblioteca'
import { Buscar } from './pages/Buscar'
import { EncerrarSessao } from './pages/EncerrarSessao'
import { Jornada } from './pages/Jornada'

export function App() {
  useEffect(() => {
    function aoVoltar() {
      limparInstanteEncerramento()
    }

    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  return (
    <ServicoProvider>
      <JogoAtualProvider>
        <SessaoAtivaProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/biblioteca" replace />} />
                <Route path="/biblioteca" element={<Biblioteca />} />
                <Route path="/jornada" element={<Jornada />} />
                <Route path="/buscar" element={<Buscar />} />
                <Route path="*" element={<Navigate to="/biblioteca" replace />} />
              </Route>
              <Route path="/adicionar-jogo" element={<AdicionarJogo />} />
              <Route path="/encerrar-sessao" element={<EncerrarSessao />} />
            </Routes>
          </BrowserRouter>
        </SessaoAtivaProvider>
      </JogoAtualProvider>
    </ServicoProvider>
  )
}

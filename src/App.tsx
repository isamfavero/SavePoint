import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { JogoAtualProvider } from './contexts/JogoAtualContext'
import { ServicoProvider } from './contexts/ServicoContext'
import { AdicionarJogo } from './pages/AdicionarJogo'
import { Biblioteca } from './pages/Biblioteca'
import { Buscar } from './pages/Buscar'
import { Jornada } from './pages/Jornada'

export function App() {
  return (
    <ServicoProvider>
      <JogoAtualProvider>
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
          </Routes>
        </BrowserRouter>
      </JogoAtualProvider>
    </ServicoProvider>
  )
}

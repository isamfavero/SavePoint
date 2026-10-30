import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Biblioteca } from './pages/Biblioteca'
import { Buscar } from './pages/Buscar'
import { Jornada } from './pages/Jornada'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/biblioteca" replace />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/jornada" element={<Jornada />} />
          <Route path="/buscar" element={<Buscar />} />
          <Route path="*" element={<Navigate to="/biblioteca" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

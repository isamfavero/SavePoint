import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AvisoGlobal } from './components/AvisoGlobal'
import { AppShell } from './components/AppShell'
import { ExigeConta } from './components/ExigeConta'
import { AvisoProvider } from './contexts/AvisoContext'
import { ContaProvider } from './contexts/ContaContext'
import { RecuperarSenha } from './pages/RecuperarSenha'
import { RedefinirSenha } from './pages/RedefinirSenha'
import { JogoAtualProvider } from './contexts/JogoAtualContext'
import { ServicoProvider } from './contexts/ServicoContext'
import { SessaoAtivaProvider } from './contexts/SessaoAtivaContext'
import { limparInstanteEncerramento } from './estado/encerramento'
import { AdicionarJogo } from './pages/AdicionarJogo'
import { Ajustes } from './pages/Ajustes'
import { Biblioteca } from './pages/Biblioteca'
import { BoasVindas } from './pages/BoasVindas'
import { Buscar } from './pages/Buscar'
import { CriarConta } from './pages/CriarConta'
import { Entrar } from './pages/Entrar'
import { EditarSessao } from './pages/EditarSessao'
import { EncerrarSessao } from './pages/EncerrarSessao'
import { Jornada } from './pages/Jornada'
import { NotasSessao } from './pages/NotasSessao'
import { NovaAnotacao } from './pages/NovaAnotacao'
import { PrimeiroMundo } from './pages/PrimeiroMundo'
import { TodasSessoes } from './pages/TodasSessoes'

export function App() {
  useEffect(() => {
    function aoVoltar() {
      limparInstanteEncerramento()
    }

    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  return (
    <ContaProvider>
    <ServicoProvider>
      <JogoAtualProvider>
        <SessaoAtivaProvider>
          <AvisoProvider>
            <BrowserRouter>
              <AvisoGlobal />
              <Routes>
                {/* Abertas: apresentação e conta. */}
                <Route path="/boas-vindas" element={<BoasVindas />} />
                <Route path="/criar-conta" element={<CriarConta />} />
                <Route path="/entrar" element={<Entrar />} />
                <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                <Route path="/redefinir-senha" element={<RedefinirSenha />} />

                {/* O resto do app exige conta quando a nuvem está ligada. */}
                <Route element={<ExigeConta />}>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<Navigate to="/biblioteca" replace />} />
                    <Route path="/biblioteca" element={<Biblioteca />} />
                    <Route path="/jornada" element={<Jornada />} />
                    <Route
                      path="/jornada/sessao/:sessaoId/notas"
                      element={<NotasSessao />}
                    />
                    <Route path="/jornada/todas-sessoes" element={<TodasSessoes />} />
                    <Route path="/buscar" element={<Buscar />} />
                    <Route path="/ajustes" element={<Ajustes />} />
                    <Route path="*" element={<Navigate to="/biblioteca" replace />} />
                  </Route>
                  <Route path="/adicionar-jogo" element={<AdicionarJogo />} />
                  <Route path="/jogo/:jogoId/editar" element={<AdicionarJogo />} />
                  <Route path="/encerrar-sessao" element={<EncerrarSessao />} />
                  <Route path="/nova-anotacao" element={<NovaAnotacao />} />
                  <Route path="/anotacao/:registroId/editar" element={<NovaAnotacao />} />
                  <Route
                    path="/jornada/sessao/:sessaoId/editar"
                    element={<EditarSessao />}
                  />
                  <Route path="/boas-vindas/pronto/:jogoId" element={<PrimeiroMundo />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AvisoProvider>
        </SessaoAtivaProvider>
      </JogoAtualProvider>
    </ServicoProvider>
    </ContaProvider>
  )
}

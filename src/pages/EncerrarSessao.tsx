import { Check, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cronometro } from '../components/Cronometro'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import { calcularDuracaoSessao } from '../data'
import { resolverFimSessao } from '../dominio/cronometro'
import {
  lerInstanteEncerramento,
  limparInstanteEncerramento,
} from '../estado/encerramento'

function mensagemDoErro(erro: unknown, padrao: string): string {
  return erro instanceof Error && erro.message ? erro.message : padrao
}

export function EncerrarSessao() {
  const { sessao, jogo, carregando, encerrarSessao } = useSessaoAtiva()
  const navigate = useNavigate()
  const [instante, setInstante] = useState<Date | null>(null)
  const [oQueFiz, setOQueFiz] = useState('')
  const [ondeParei, setOndeParei] = useState('')
  const [proximoPasso, setProximoPasso] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (carregando) return

    if (!sessao) {
      navigate('/jornada', { replace: true })
      return
    }

    setInstante(
      (atual) => atual ?? lerInstanteEncerramento(sessao.id) ?? new Date(),
    )
  }, [carregando, navigate, sessao])

  function aoCancelar() {
    limparInstanteEncerramento()
    navigate('/jornada', { replace: true })
  }

  async function aoSalvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    if (!sessao || !instante) return

    setSalvando(true)
    setErro(null)

    try {
      await encerrarSessao(
        { oQueFiz, ondeParei, proximoPasso },
        resolverFimSessao(sessao, instante),
      )
      limparInstanteEncerramento()
      navigate('/jornada', { replace: true })
    } catch (falha) {
      setErro(mensagemDoErro(falha, 'Não foi possível encerrar a sessão.'))
      setSalvando(false)
    }
  }

  if (carregando || !sessao || !instante) {
    return (
      <div className="app-shell app-shell-encerrar">
        <main className="app-main encerrar-main">
          <p className="biblioteca-aviso">Carregando a sessão...</p>
        </main>
      </div>
    )
  }

  const fim = resolverFimSessao(sessao, instante)
  const duracaoMs = calcularDuracaoSessao(sessao, fim)
  const pausada = Boolean(sessao.pausadoEm)

  return (
    <div className="app-shell app-shell-encerrar">
      <main className="app-main encerrar-main">
        <div className="formulario-topo">
          <button
            type="button"
            className="botao-voltar"
            onClick={aoCancelar}
            aria-label="Cancelar e voltar para a Jornada"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <span className="selo-novo">
            <Square size={12} strokeWidth={2} aria-hidden="true" />
            Encerrando
          </span>
        </div>

        <h1 className="formulario-titulo">Encerrar sessão</h1>
        <p className="formulario-descricao">
          {jogo ? `${jogo.nome} · Sessão ${sessao.numero}` : `Sessão ${sessao.numero}`}
        </p>

        <Cronometro numero={sessao.numero} duracaoMs={duracaoMs} pausada={pausada} />

        {pausada && (
          <p className="encerrar-aviso">
            A sessão está pausada. O encerramento usa o instante da pausa.
          </p>
        )}

        <form id="form-encerrar-sessao" className="encerrar-form" onSubmit={aoSalvar}>
          <div className="campo">
            <label className="campo-rotulo" htmlFor="o-que-fiz">
              <span>O que fiz</span>
              <span className="campo-opcional">Opcional</span>
            </label>
            <textarea
              id="o-que-fiz"
              className="campo-textarea"
              rows={3}
              value={oQueFiz}
              onChange={(evento) => setOQueFiz(evento.target.value)}
              placeholder="Explorei a ala leste e resolvi o puzzle das engrenagens."
            />
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="onde-parei">
              <span>Onde parei</span>
              <span className="campo-opcional">Opcional</span>
            </label>
            <textarea
              id="onde-parei"
              className="campo-textarea"
              rows={3}
              value={ondeParei}
              onChange={(evento) => setOndeParei(evento.target.value)}
              placeholder="Diante da porta trancada do observatório."
            />
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="proximo-passo">
              <span>Próximo passo</span>
              <span className="campo-opcional">Opcional</span>
            </label>
            <textarea
              id="proximo-passo"
              className="campo-textarea"
              rows={3}
              value={proximoPasso}
              onChange={(evento) => setProximoPasso(evento.target.value)}
              placeholder="Encontrar a chave do observatório no pátio sul."
            />
          </div>

          {erro && (
            <p className="campo-erro" role="alert">
              {erro}
            </p>
          )}
        </form>
      </main>

      <div className="form-acoes">
        <button
          type="submit"
          form="form-encerrar-sessao"
          className="botao-primario"
          disabled={salvando}
        >
          <Check size={18} strokeWidth={2} aria-hidden="true" />
          {salvando ? 'Salvando...' : 'Salvar e encerrar'}
        </button>
        <button
          type="button"
          className="botao-cancelar"
          onClick={aoCancelar}
          disabled={salvando}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

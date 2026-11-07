import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DiarioLista } from '../components/DiarioSessoes'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import { useServicoSavePoint, useVersaoDados } from '../contexts/ServicoContext'
import type { Registro } from '../data'
import { formatarSessoes } from '../dominio/biblioteca'
import { useJogoAtualDetalhe } from '../hooks/useJogoAtualDetalhe'
import { useSessoesDoJogo } from '../hooks/useSessoesDoJogo'

export function TodasSessoes() {
  const servico = useServicoSavePoint()
  const versao = useVersaoDados()
  const navigate = useNavigate()
  const { jogo, carregando, erro } = useJogoAtualDetalhe()
  const { sessoes, carregando: carregandoSessoes } = useSessoesDoJogo(jogo?.id ?? null)
  const { sessao, duracaoMs } = useSessaoAtiva()
  const [registros, setRegistros] = useState<Registro[]>([])

  const sessaoAtiva = sessao && jogo && sessao.jogoId === jogo.id ? sessao : null

  useEffect(() => {
    if (!jogo?.id) return

    let ativo = true

    servico
      .listarRegistrosDoJogo(jogo.id)
      .then((lista) => {
        if (ativo) setRegistros(lista)
      })
      .catch(() => {
        if (ativo) setRegistros([])
      })

    return () => {
      ativo = false
    }
  }, [jogo?.id, servico, versao])

  function voltar() {
    const indice = window.history.state?.idx

    if (typeof indice === 'number' && indice > 0) navigate(-1)
    else navigate('/jornada', { replace: true })
  }

  return (
    <section className="page todas-sessoes" aria-label="Todas as sessões">
      <div className="formulario-topo">
        <button type="button" className="botao-voltar" onClick={voltar} aria-label="Voltar">
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {jogo && <p className="anotacao-jogo">{jogo.nome.toUpperCase()}</p>}
      <h1 className="formulario-titulo">Todas as sessões</h1>
      {!carregandoSessoes && jogo && (
        <p className="formulario-descricao">{formatarSessoes(sessoes.length)} neste jogo.</p>
      )}

      {(carregando || carregandoSessoes) && (
        <p className="biblioteca-aviso">Carregando as sessões...</p>
      )}

      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}

      {!carregando && !jogo && !erro && (
        <div className="estado-vazio">
          <h2>Nenhum jogo escolhido</h2>
          <p>Abra um jogo na Biblioteca para ver as sessões dele.</p>
          <Link className="botao-secundario" to="/biblioteca">
            Ir para a Biblioteca
          </Link>
        </div>
      )}

      {jogo && !carregandoSessoes && sessoes.length === 0 && (
        <div className="estado-vazio">
          <h2>Nenhuma sessão ainda</h2>
          <p>Inicie uma sessão na Jornada para começar o diário deste jogo.</p>
        </div>
      )}

      {jogo && sessoes.length > 0 && (
        <DiarioLista
          sessoes={sessoes}
          registros={registros}
          sessaoAtiva={sessaoAtiva}
          duracaoAtivaMs={duracaoMs}
        />
      )}
    </section>
  )
}

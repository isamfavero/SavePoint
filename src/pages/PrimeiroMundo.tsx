import { BookOpen, LibraryBig, NotebookPen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { JogoCapa } from '../components/JogoCapa'
import { useJogoAtual } from '../contexts/JogoAtualContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { useSessaoAtiva } from '../contexts/SessaoAtivaContext'
import type { Jogo } from '../data'
import { formatarSessoes } from '../dominio/biblioteca'
import { marcarBoasVindasVistas } from '../estado/boasVindas'

export function PrimeiroMundo() {
  const { jogoId } = useParams()
  const servico = useServicoSavePoint()
  const navigate = useNavigate()
  const { definirJogoAtual } = useJogoAtual()
  const { sessao, iniciarSessao } = useSessaoAtiva()

  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [totalSessoes, setTotalSessoes] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)

  useEffect(() => {
    marcarBoasVindasVistas()
    if (!jogoId) return

    let ativo = true

    Promise.all([servico.obterJogo(jogoId), servico.listarSessoesDoJogo(jogoId)])
      .then(([encontrado, sessoes]) => {
        if (!ativo) return

        if (!encontrado) {
          navigate('/biblioteca', { replace: true })
          return
        }

        setJogo(encontrado)
        setTotalSessoes(sessoes.length)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível abrir o jogo. Ele está salvo na sua biblioteca.')
      })

    return () => {
      ativo = false
    }
  }, [jogoId, navigate, servico])

  async function criarPrimeiraNota() {
    if (!jogo) return

    definirJogoAtual(jogo.id)

    // Toda anotação pertence a uma sessão: se não há nenhuma aberta, começa a deste jogo.
    if (sessao && sessao.jogoId !== jogo.id) {
      navigate('/jornada', { replace: true })
      return
    }

    setIniciando(true)
    setErro(null)

    try {
      if (!sessao) await iniciarSessao(jogo.id)
      // A Jornada fica por baixo: ao salvar a nota, o "voltar" leva até ela, não aos slides.
      navigate('/jornada', { replace: true })
      navigate('/nova-anotacao')
    } catch {
      setErro('Não foi possível iniciar a sessão. Tente pela Jornada.')
      setIniciando(false)
    }
  }

  return (
    <div className="app-shell boas-vindas">
      <main className="app-main boas-vindas-main">
        <p className="anotacao-jogo">TUDO CERTO</p>
        <h1 className="formulario-titulo">Seu primeiro mundo está pronto</h1>
        <p className="formulario-descricao">
          O caderno deste jogo já existe. Comece anotando a primeira descoberta ou
          veja sua biblioteca.
        </p>

        {jogo && (
          <article className="primeiro-mundo-cartao" aria-label={jogo.nome}>
            <div className="primeiro-mundo-capa">
              <JogoCapa capa={jogo.capa} alt={`Capa de ${jogo.nome}`} />
            </div>
            <div className="primeiro-mundo-corpo">
              <p className="destaque-plataforma">
                <span>{jogo.plataforma}</span>
                {jogo.generos.length > 0 && (
                  <span className="destaque-generos">{jogo.generos.join(' · ')}</span>
                )}
              </p>
              <h2 className="destaque-nome">{jogo.nome}</h2>
              <span className="meta-pill">
                <BookOpen size={13} strokeWidth={1.5} aria-hidden="true" />
                {formatarSessoes(totalSessoes)}
              </span>
            </div>
          </article>
        )}

        {!jogo && !erro && <p className="biblioteca-aviso">Carregando...</p>}

        {erro && (
          <p className="campo-erro" role="alert">
            {erro}
          </p>
        )}
      </main>

      <div className="form-acoes">
        <button
          type="button"
          className="botao-primario"
          onClick={() => void criarPrimeiraNota()}
          disabled={!jogo || iniciando}
        >
          <NotebookPen size={18} strokeWidth={1.75} aria-hidden="true" />
          {iniciando ? 'Iniciando a sessão...' : 'Criar primeira nota'}
        </button>
        {!sessao && jogo && (
          <p className="boas-vindas-nota">
            Isso inicia a Sessão {totalSessoes + 1} com o cronômetro.
          </p>
        )}
        <button
          type="button"
          className="botao-cancelar"
          onClick={() => navigate('/biblioteca', { replace: true })}
        >
          <LibraryBig size={15} strokeWidth={1.75} aria-hidden="true" /> Ir para minha biblioteca
        </button>
      </div>
    </div>
  )
}

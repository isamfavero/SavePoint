import { ArrowLeft, NotebookPen, Pencil, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useServicoSavePoint, useVersaoDados } from '../contexts/ServicoContext'
import { TIPOS_REGISTRO } from '../constantes'
import type { Jogo, Registro, Sessao } from '../data'

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const FORMATADOR_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

type Conteudo = {
  sessao: Sessao
  jogo: Jogo | null
  registros: Registro[]
}

export function NotasSessao() {
  const { sessaoId } = useParams()
  const servico = useServicoSavePoint()
  const versao = useVersaoDados()
  const navigate = useNavigate()
  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro(null)
      setConteudo(null)

      if (!sessaoId) {
        setErro('Sessão não encontrada.')
        setCarregando(false)
        return
      }

      try {
        const sessao = await servico.obterSessao(sessaoId)

        if (!sessao) {
          if (ativo) {
            setErro('Sessão não encontrada.')
            setCarregando(false)
          }
          return
        }

        const [jogo, registros] = await Promise.all([
          servico.obterJogo(sessao.jogoId),
          servico.listarRegistrosDaSessao(sessao.id),
        ])

        if (!ativo) return

        setConteudo({ sessao, jogo, registros })
      } catch {
        if (ativo) {
          setErro('Não foi possível carregar as notas desta sessão.')
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    void carregar()

    return () => {
      ativo = false
    }
  }, [servico, sessaoId, versao])

  const grupos = conteudo
    ? TIPOS_REGISTRO.map((tipo) => ({
        tipo,
        registros: conteudo.registros
          .filter((registro) => registro.tipo === tipo)
          .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime()),
      })).filter((grupo) => grupo.registros.length > 0)
    : []

  function voltar() {
    const indice = window.history.state?.idx

    if (typeof indice === 'number' && indice > 0) {
      navigate(-1)
      return
    }

    navigate('/jornada', { replace: true })
  }

  return (
    <section className="page notas-sessao" aria-label="Notas da sessão">
      <div className="notas-topo">
        <button type="button" className="botao-voltar" onClick={voltar} aria-label="Voltar">
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {conteudo && (
          <span className="notas-topo-direita">
            <span className="notas-sessao-numero">Sessão {conteudo.sessao.numero}</span>
            <Link
              className="botao-voltar"
              to={`/jornada/sessao/${conteudo.sessao.id}/editar`}
              aria-label={`Ajustes da Sessão ${conteudo.sessao.numero}`}
            >
              <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </span>
        )}
      </div>

      {conteudo && (
        <>
          <p className="anotacao-jogo">{conteudo.jogo?.nome ?? 'Jogo'}</p>
          <h1 className="page-title">Notas da sessão</h1>
          <p className="page-description">
            Sessão {conteudo.sessao.numero} · {FORMATADOR_DATA.format(conteudo.sessao.inicio)}
          </p>
        </>
      )}

      {carregando && <p className="biblioteca-aviso">Carregando as notas...</p>}

      {!carregando && erro && (
        <div className="estado-vazio">
          <span className="estado-vazio-icone" aria-hidden="true">
            <NotebookPen size={24} strokeWidth={1.75} />
          </span>
          <h2>Não foi possível abrir a sessão</h2>
          <p>{erro}</p>
          <Link className="botao-secundario" to="/jornada">
            Voltar para a Jornada
          </Link>
        </div>
      )}

      {!carregando && conteudo && grupos.length === 0 && (
        <div className="estado-vazio">
          <span className="estado-vazio-icone" aria-hidden="true">
            <NotebookPen size={24} strokeWidth={1.75} />
          </span>
          <h2>Nenhuma anotação nesta sessão</h2>
          <p>
            Use o botão de anotar na Jornada para registrar o que você descobriu.
          </p>
        </div>
      )}

      {!carregando && conteudo && grupos.length > 0 && (
        <div className="notas-grupos">
          {grupos.map((grupo) => (
            <section
              key={grupo.tipo}
              className="notas-grupo"
              aria-labelledby={`grupo-${grupo.tipo}`}
            >
              <div className="notas-grupo-topo">
                <h2 id={`grupo-${grupo.tipo}`}>{grupo.tipo}</h2>
                <span>{grupo.registros.length}</span>
              </div>

              <ul className="notas-lista">
                {grupo.registros.map((registro) => (
                  <li key={registro.id} className="nota-cartao">
                    <p className="nota-texto">{registro.texto}</p>

                    {registro.tags.length > 0 && (
                      <div className="notas-tags">
                        {registro.tags.map((tag) => (
                          <span key={tag} className="nota-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="nota-rodape">
                      <time dateTime={registro.dataHora.toISOString()}>
                        {FORMATADOR_DATA_HORA.format(registro.dataHora)}
                      </time>

                      {registro.tipo === 'Objetivo' && (
                        <span
                          className={`nota-status${
                            registro.concluido ? ' nota-status-concluido' : ''
                          }`}
                        >
                          {registro.concluido ? 'Concluído' : 'Pendente'}
                        </span>
                      )}

                      <Link
                        className="nota-editar"
                        to={`/anotacao/${registro.id}/editar`}
                        aria-label="Editar anotação"
                      >
                        <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

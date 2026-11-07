import { Check, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAviso } from '../contexts/AvisoContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { calcularDuracaoSessao } from '../data'
import type { Jogo, Sessao } from '../data'
import { formatarDuracaoCurto } from '../dominio/cronometro'
import { lerCampoDataHora, paraCampoDataHora } from '../dominio/dataHora'

function mensagemDoErro(erro: unknown, padrao: string): string {
  return erro instanceof Error && erro.message ? erro.message : padrao
}

/** Prévia da duração com os horários do formulário, seguindo as regras do serviço. */
function previaDuracao(sessao: Sessao, inicio: Date, fim: Date | null): number | null {
  if (!fim) {
    return sessao.fim === null ? calcularDuracaoSessao({ ...sessao, inicio }) : null
  }

  if (fim.getTime() < inicio.getTime()) return null

  let tempoPausado = sessao.tempoPausado

  if (sessao.fim === null && sessao.pausadoEm && fim.getTime() > sessao.pausadoEm.getTime()) {
    tempoPausado += fim.getTime() - sessao.pausadoEm.getTime()
  }

  tempoPausado = Math.min(tempoPausado, fim.getTime() - inicio.getTime())

  return fim.getTime() - inicio.getTime() - tempoPausado
}

export function EditarSessao() {
  const { sessaoId } = useParams()
  const servico = useServicoSavePoint()
  const { mostrarAviso } = useAviso()
  const navigate = useNavigate()

  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [totalAnotacoes, setTotalAnotacoes] = useState(0)
  const [erroCarregar, setErroCarregar] = useState<string | null>(null)

  const [oQueFiz, setOQueFiz] = useState('')
  const [ondeParei, setOndeParei] = useState('')
  const [proximoPasso, setProximoPasso] = useState('')
  const [campoInicio, setCampoInicio] = useState('')
  const [campoFim, setCampoFim] = useState('')
  const [inicioOriginal, setInicioOriginal] = useState('')
  const [fimOriginal, setFimOriginal] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    if (!sessaoId) return

    let ativo = true

    ;(async () => {
      try {
        const encontrada = await servico.obterSessao(sessaoId)

        if (!encontrada) {
          if (ativo) setErroCarregar('Esta sessão não existe mais.')
          return
        }

        const [jogoDaSessao, registros] = await Promise.all([
          servico.obterJogo(encontrada.jogoId),
          servico.listarRegistrosDaSessao(encontrada.id),
        ])

        if (!ativo) return

        const inicio = paraCampoDataHora(encontrada.inicio)
        const fim = encontrada.fim ? paraCampoDataHora(encontrada.fim) : ''

        setSessao(encontrada)
        setJogo(jogoDaSessao)
        setTotalAnotacoes(registros.length)
        setOQueFiz(encontrada.oQueFiz)
        setOndeParei(encontrada.ondeParei)
        setProximoPasso(encontrada.proximoPasso)
        setCampoInicio(inicio)
        setInicioOriginal(inicio)
        setCampoFim(fim)
        setFimOriginal(fim)
      } catch {
        if (ativo) setErroCarregar('Não foi possível abrir esta sessão.')
      }
    })()

    return () => {
      ativo = false
    }
  }, [servico, sessaoId])

  function voltar() {
    const indice = window.history.state?.idx

    if (typeof indice === 'number' && indice > 0) navigate(-1)
    else navigate('/jornada', { replace: true })
  }

  async function aoSalvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!sessao) return

    setErro(null)

    // Só manda horários que a pessoa mudou: o campo não guarda segundos.
    const inicioMudou = campoInicio !== inicioOriginal
    const fimMudou = campoFim !== fimOriginal

    const inicio = inicioMudou ? lerCampoDataHora(campoInicio) : sessao.inicio
    const fim = fimMudou ? (campoFim ? lerCampoDataHora(campoFim) : null) : undefined

    if (!inicio) {
      setErro('Informe um horário de início válido.')
      return
    }

    if (fimMudou && campoFim && !fim) {
      setErro('Informe um horário de fim válido.')
      return
    }

    if (sessao.fim !== null && fimMudou && !campoFim) {
      setErro('Uma sessão encerrada precisa de um horário de fim.')
      return
    }

    setSalvando(true)

    try {
      await servico.atualizarSessao(sessao.id, {
        oQueFiz,
        ondeParei,
        proximoPasso,
        ...(inicioMudou ? { inicio } : {}),
        ...(fim !== undefined ? { fim } : {}),
      })
      mostrarAviso(
        sessao.fim === null && fim
          ? `Sessão ${sessao.numero} encerrada no horário informado.`
          : `Sessão ${sessao.numero} atualizada.`,
      )
      voltar()
    } catch (falha) {
      setErro(mensagemDoErro(falha, 'Não foi possível salvar a sessão.'))
      setSalvando(false)
    }
  }

  async function aoExcluir() {
    if (!sessao) return

    setExcluindo(true)

    try {
      await servico.excluirSessao(sessao.id)
      mostrarAviso(`Sessão ${sessao.numero} apagada.`)
      // A tela de notas desta sessão deixou de existir: volta direto para a Jornada.
      navigate('/jornada', { replace: true })
    } catch (falha) {
      setExcluindo(false)
      setConfirmarExclusao(false)
      setErro(mensagemDoErro(falha, 'Não foi possível apagar a sessão.'))
    }
  }

  if (!sessao) {
    return (
      <div className="app-shell app-shell-formulario">
        <main className="app-main formulario-main">
          {erroCarregar ? (
            <div className="estado-vazio">
              <h2>Não foi possível abrir</h2>
              <p>{erroCarregar}</p>
              <button
                type="button"
                className="botao-secundario"
                onClick={() => navigate('/jornada', { replace: true })}
              >
                Ir para a Jornada
              </button>
            </div>
          ) : (
            <p className="biblioteca-aviso">Carregando a sessão...</p>
          )}
        </main>
      </div>
    )
  }

  const aberta = sessao.fim === null
  const inicioLido = lerCampoDataHora(campoInicio) ?? sessao.inicio
  const fimLido = campoFim ? lerCampoDataHora(campoFim) : null
  const duracao = previaDuracao(sessao, inicioLido, fimLido)

  return (
    <div className="app-shell app-shell-formulario">
      <main className="app-main formulario-main">
        <div className="formulario-topo">
          <button
            type="button"
            className="botao-voltar"
            onClick={voltar}
            aria-label="Voltar sem salvar"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <span className="selo-novo">
            <SlidersHorizontal size={11} strokeWidth={1.75} aria-hidden="true" />
            Ajustes da sessão
          </span>
        </div>

        <p className="anotacao-jogo">{jogo?.nome.toUpperCase() ?? 'JOGO'}</p>
        <h1 className="formulario-titulo">Sessão {sessao.numero}</h1>
        <p className="formulario-descricao">
          {aberta
            ? 'Esta sessão ainda está aberta. Se você esqueceu de encerrar, informe quando parou de jogar.'
            : 'Corrija os textos ou os horários desta sessão.'}
        </p>

        <form id="form-editar-sessao" className="encerrar-form" onSubmit={aoSalvar} noValidate>
          <div className="campo">
            <label className="campo-rotulo" htmlFor="sessao-inicio">
              Início
            </label>
            <input
              id="sessao-inicio"
              type="datetime-local"
              className="campo-data"
              value={campoInicio}
              max={paraCampoDataHora(new Date())}
              onChange={(evento) => setCampoInicio(evento.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="sessao-fim">
              <span>{aberta ? 'Encerrar em' : 'Fim'}</span>
              {aberta && <span className="campo-opcional">Opcional</span>}
            </label>
            <input
              id="sessao-fim"
              type="datetime-local"
              className="campo-data"
              value={campoFim}
              min={campoInicio}
              max={paraCampoDataHora(new Date())}
              onChange={(evento) => setCampoFim(evento.target.value)}
              aria-describedby="sessao-duracao"
            />
            <p className="campo-ajuda" id="sessao-duracao">
              {duracao === null
                ? 'O fim precisa ser depois do início.'
                : aberta && !fimLido
                  ? `Aberta há ${formatarDuracaoCurto(duracao)} de jogo.`
                  : `Duração: ${formatarDuracaoCurto(duracao)}${
                      sessao.tempoPausado > 0 || sessao.pausadoEm ? ', sem contar as pausas' : ''
                    }.`}
            </p>
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="editar-o-que-fiz">
              <span>O que fiz</span>
              <span className="campo-opcional">Opcional</span>
            </label>
            <textarea
              id="editar-o-que-fiz"
              className="campo-textarea"
              rows={3}
              value={oQueFiz}
              onChange={(evento) => setOQueFiz(evento.target.value)}
            />
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="editar-onde-parei">
              <span>Onde parei</span>
              <span className="campo-opcional">Opcional</span>
            </label>
            <textarea
              id="editar-onde-parei"
              className="campo-textarea"
              rows={3}
              value={ondeParei}
              onChange={(evento) => setOndeParei(evento.target.value)}
            />
          </div>

          <div className="campo">
            <label className="campo-rotulo" htmlFor="editar-proximo-passo">
              <span>Próximo passo</span>
              <span className="campo-opcional">Opcional</span>
            </label>
            <textarea
              id="editar-proximo-passo"
              className="campo-textarea"
              rows={3}
              value={proximoPasso}
              onChange={(evento) => setProximoPasso(evento.target.value)}
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
          form="form-editar-sessao"
          className="botao-primario"
          disabled={salvando}
        >
          <Check size={18} strokeWidth={2} aria-hidden="true" />
          {salvando ? 'Salvando...' : aberta && fimLido ? 'Salvar e encerrar' : 'Salvar alterações'}
        </button>
        <button
          type="button"
          className="botao-perigo-texto"
          onClick={() => setConfirmarExclusao(true)}
          disabled={salvando}
        >
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
          Apagar sessão
        </button>
      </div>

      {confirmarExclusao && (
        <div className="modal-fundo">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-apagar-sessao"
          >
            <h2 id="titulo-apagar-sessao">Apagar a Sessão {sessao.numero}?</h2>
            <p>
              {totalAnotacoes === 0
                ? 'A sessão sai da Trilha e do Diário. Não dá para desfazer.'
                : `${totalAnotacoes === 1 ? 'A anotação' : `As ${totalAnotacoes} anotações`} desta sessão também ${
                    totalAnotacoes === 1 ? 'será apagada' : 'serão apagadas'
                  }. Não dá para desfazer.`}
            </p>
            <div className="modal-acoes">
              <button
                type="button"
                className="botao-secundario"
                onClick={() => setConfirmarExclusao(false)}
                disabled={excluindo}
                autoFocus
              >
                Cancelar
              </button>
              <button
                type="button"
                className="botao-perigo compacto"
                onClick={() => void aoExcluir()}
                disabled={excluindo}
              >
                {excluindo ? 'Apagando...' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

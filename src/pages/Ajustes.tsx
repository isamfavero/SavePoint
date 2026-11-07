import {
  ArrowLeft,
  Download,
  Info,
  LogIn,
  LogOut,
  Sparkles,
  Upload,
  UserRoundPlus,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useConta } from '../contexts/ContaContext'
import { useServicoSavePoint } from '../contexts/ServicoContext'
import { nomeArquivoBackup } from '../data'
import type { ResumoImportacao } from '../data'

function plural(total: number, singular: string, varios: string): string {
  return `${total} ${total === 1 ? singular : varios}`
}

function descreverImportacao(resumo: ResumoImportacao): string {
  const partes = [
    plural(resumo.jogos, 'jogo', 'jogos'),
    plural(resumo.sessoes, 'sessão', 'sessões'),
    plural(resumo.registros, 'anotação', 'anotações'),
  ]

  let texto = `Importado: ${partes.join(', ')}.`

  if (resumo.ignorados > 0) {
    texto += ` ${plural(resumo.ignorados, 'item já existia', 'itens já existiam')} e ${
      resumo.ignorados === 1 ? 'ficou' : 'ficaram'
    } como estava${resumo.ignorados === 1 ? '' : 'm'}.`
  }

  if (resumo.sessoesEncerradas > 0) {
    texto += ` ${plural(
      resumo.sessoesEncerradas,
      'sessão aberta foi encerrada',
      'sessões abertas foram encerradas',
    )}, porque só pode haver uma sessão ativa.`
  }

  return texto
}

export function Ajustes() {
  const servico = useServicoSavePoint()
  const navigate = useNavigate()
  const seletor = useRef<HTMLInputElement>(null)
  const [exportando, setExportando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const { usuario, servico: servicoConta } = useConta()
  const [saindo, setSaindo] = useState(false)

  async function aoSair() {
    setSaindo(true)
    setErro(null)

    try {
      await servicoConta.sair()
      // Sem conta, o app volta para a porta de entrada.
      navigate('/entrar', { replace: true })
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível sair agora.')
    } finally {
      setSaindo(false)
    }
  }

  function voltar() {
    const indice = window.history.state?.idx

    if (typeof indice === 'number' && indice > 0) navigate(-1)
    else navigate('/biblioteca', { replace: true })
  }

  async function aoExportar() {
    setExportando(true)
    setErro(null)
    setMensagem(null)

    try {
      const backup = await servico.exportarDados()
      const arquivo = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      const url = URL.createObjectURL(arquivo)
      const link = document.createElement('a')

      link.href = url
      link.download = nomeArquivoBackup(new Date())
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)

      setMensagem(
        `Backup gerado com ${plural(backup.jogos.length, 'jogo', 'jogos')}, ${plural(
          backup.sessoes.length,
          'sessão',
          'sessões',
        )} e ${plural(backup.registros.length, 'anotação', 'anotações')}.`,
      )
    } catch {
      setErro('Não foi possível gerar o backup. Tente de novo.')
    } finally {
      setExportando(false)
    }
  }

  async function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''

    if (!arquivo) return

    setImportando(true)
    setErro(null)
    setMensagem(null)

    try {
      let conteudo: unknown

      try {
        conteudo = JSON.parse(await arquivo.text())
      } catch {
        throw new Error('Este arquivo não é um backup do SavePoint.')
      }

      const resumo = await servico.importarDados(conteudo)
      setMensagem(descreverImportacao(resumo))
    } catch (falha) {
      setErro(
        falha instanceof Error && falha.message
          ? falha.message
          : 'Não foi possível importar este arquivo.',
      )
    } finally {
      setImportando(false)
    }
  }

  return (
    <section className="page ajustes" aria-label="Ajustes">
      <div className="formulario-topo">
        <button type="button" className="botao-voltar" onClick={voltar} aria-label="Voltar">
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <h1 className="formulario-titulo">Ajustes</h1>
      <p className="formulario-descricao">Conta, cópia de segurança e apresentação do app.</p>

      <h2 className="secao-titulo">Conta</h2>

      {usuario ? (
        <div className="ajustes-acoes">
          <div className="ajustes-item ajustes-conta">
            <span className="ajustes-item-icone marca-avatar" aria-hidden="true">
              {(usuario.nome || usuario.email).charAt(0).toUpperCase()}
            </span>
            <span className="ajustes-item-texto">
              <strong>{usuario.nome}</strong>
              <small>{usuario.email}</small>
            </span>
          </div>
          <p className="ajustes-nota">
            A conta já está ativa. Levar seus jogos e anotações para a nuvem é o próximo
            passo; por enquanto eles continuam salvos neste aparelho.
          </p>
          <button
            type="button"
            className="ajustes-item"
            onClick={() => void aoSair()}
            disabled={saindo}
          >
            <span className="ajustes-item-icone" aria-hidden="true">
              <LogOut size={18} strokeWidth={1.75} />
            </span>
            <span className="ajustes-item-texto">
              <strong>{saindo ? 'Saindo...' : 'Sair da conta'}</strong>
              <small>Seus dados neste aparelho continuam aqui</small>
            </span>
          </button>
        </div>
      ) : (
      <div className="ajustes-acoes">
        <Link className="ajustes-item" to="/criar-conta">
          <span className="ajustes-item-icone" aria-hidden="true">
            <UserRoundPlus size={18} strokeWidth={1.75} />
          </span>
          <span className="ajustes-item-texto">
            <strong>Criar conta</strong>
            <small>Guarde seu diário na nuvem e use em outros aparelhos</small>
          </span>
        </Link>
        <Link className="ajustes-item" to="/entrar">
          <span className="ajustes-item-icone" aria-hidden="true">
            <LogIn size={18} strokeWidth={1.75} />
          </span>
          <span className="ajustes-item-texto">
            <strong>Entrar</strong>
            <small>Já tem uma conta do SavePoint</small>
          </span>
        </Link>
      </div>
      )}

      <h2 className="secao-titulo">Seus dados</h2>

      <div className="aviso">
        <Info size={18} strokeWidth={1.75} aria-hidden="true" />
        <p>
          Por enquanto tudo fica salvo só neste navegador. Limpar os dados do site
          apaga seus jogos e anotações, então guarde um backup de vez em quando.
        </p>
      </div>

      <div className="ajustes-acoes">
        <button
          type="button"
          className="ajustes-item"
          onClick={() => void aoExportar()}
          disabled={exportando || importando}
        >
          <span className="ajustes-item-icone" aria-hidden="true">
            <Download size={18} strokeWidth={1.75} />
          </span>
          <span className="ajustes-item-texto">
            <strong>{exportando ? 'Gerando backup...' : 'Exportar tudo'}</strong>
            <small>Jogos, sessões, anotações e capas em um arquivo .json</small>
          </span>
        </button>

        <input
          ref={seletor}
          type="file"
          accept="application/json,.json"
          className="entrada-arquivo"
          onChange={(evento) => void aoEscolherArquivo(evento)}
          tabIndex={-1}
          aria-hidden="true"
        />

        <button
          type="button"
          className="ajustes-item"
          onClick={() => seletor.current?.click()}
          disabled={exportando || importando}
        >
          <span className="ajustes-item-icone" aria-hidden="true">
            <Upload size={18} strokeWidth={1.75} />
          </span>
          <span className="ajustes-item-texto">
            <strong>{importando ? 'Importando...' : 'Importar backup'}</strong>
            <small>Acrescenta o que falta, sem apagar nem duplicar nada</small>
          </span>
        </button>
      </div>

      {mensagem && (
        <p className="ajustes-mensagem" role="status">
          {mensagem}
        </p>
      )}

      {erro && (
        <p className="campo-erro" role="alert">
          {erro}
        </p>
      )}

      <h2 className="secao-titulo">Apresentação</h2>

      <div className="ajustes-acoes">
        <Link className="ajustes-item" to="/boas-vindas">
          <span className="ajustes-item-icone" aria-hidden="true">
            <Sparkles size={18} strokeWidth={1.75} />
          </span>
          <span className="ajustes-item-texto">
            <strong>Ver as boas-vindas de novo</strong>
            <small>Os slides de apresentação do SavePoint</small>
          </span>
        </Link>
      </div>
    </section>
  )
}

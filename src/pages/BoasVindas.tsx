import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Gamepad2,
  Route,
  Timer,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useConta } from '../contexts/ContaContext'
import { marcarBoasVindasVistas } from '../estado/boasVindas'

type Slide = {
  titulo: string
  texto: string
  Icone: LucideIcon
}

const SLIDES: Slide[] = [
  {
    titulo: 'Cada jogo merece um diário',
    texto: 'Guarde pistas, senhas, enigmas e tudo o que você descobriu, organizado por jogo.',
    Icone: BookOpen,
  },
  {
    titulo: 'Sessões com cronômetro',
    texto: 'Inicie uma sessão quando for jogar. O tempo conta sozinho e cada anotação fica ligada à sessão.',
    Icone: Timer,
  },
  {
    titulo: 'Volte de onde parou',
    texto: 'A Jornada mostra sua trilha, os objetivos em aberto e onde você parou da última vez.',
    Icone: Route,
  },
]

export function BoasVindas() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { servico, usuario } = useConta()
  // Com contas ativas, a pergunta do primeiro jogo só aparece para quem já entrou.
  const podeIrAoJogo = !servico.disponivel || Boolean(usuario)
  const pedeEtapaJogo = params.get('etapa') === 'jogo'
  const [etapa, setEtapa] = useState<'slides' | 'jogo'>(
    pedeEtapaJogo && podeIrAoJogo ? 'jogo' : 'slides',
  )
  const [indice, setIndice] = useState(0)
  const [nome, setNome] = useState('')

  // Ao voltar do link de confirmação do e-mail, a conta carrega depois da tela.
  useEffect(() => {
    if (pedeEtapaJogo && podeIrAoJogo) setEtapa('jogo')
  }, [pedeEtapaJogo, podeIrAoJogo])

  const slide = SLIDES[indice]
  const ultimo = indice === SLIDES.length - 1

  function comecar() {
    marcarBoasVindasVistas()

    if (!podeIrAoJogo) {
      navigate('/criar-conta')
      return
    }

    setEtapa('jogo')
  }

  function pular() {
    marcarBoasVindasVistas()
    navigate('/biblioteca', { replace: true })
  }

  function aoContinuar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const limpo = nome.trim()
    if (!limpo) return

    const params = new URLSearchParams({ origem: 'boas-vindas', nome: limpo })
    navigate(`/adicionar-jogo?${params.toString()}`)
  }

  if (etapa === 'jogo') {
    return (
      <div className="app-shell boas-vindas">
        <main className="app-main boas-vindas-main">
          <div className="formulario-topo">
            <button
              type="button"
              className="botao-voltar"
              onClick={() => setEtapa('slides')}
              aria-label="Voltar para a apresentação"
            >
              <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <p className="anotacao-jogo">PRIMEIRO PASSO</p>
          <h1 className="formulario-titulo">O que você está jogando agora?</h1>
          <p className="formulario-descricao">
            Digite o nome do jogo. No próximo passo você escolhe a plataforma e,
            se quiser, uma capa.
          </p>

          <form id="form-boas-vindas" onSubmit={aoContinuar}>
            <label className="campo-input">
              <Gamepad2 size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                placeholder="Nome do jogo"
                aria-label="Nome do jogo"
                autoFocus
                enterKeyHint="next"
              />
            </label>
          </form>
        </main>

        <div className="form-acoes">
          <button
            type="submit"
            form="form-boas-vindas"
            className="botao-primario"
            disabled={!nome.trim()}
          >
            Continuar
            <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button type="button" className="botao-cancelar" onClick={pular}>
            Pular por enquanto
          </button>
        </div>
      </div>
    )
  }

  const Icone = slide.Icone

  return (
    <div className="app-shell boas-vindas">
      <main className="app-main boas-vindas-main boas-vindas-slides">
        <div className="boas-vindas-marca">
          <img src="/logo.png" alt="" className="marca-logo-img" />
          <span className="marca-nome">SavePoint</span>
        </div>

        <section
          className="boas-vindas-slide"
          aria-roledescription="slide"
          aria-label={`${indice + 1} de ${SLIDES.length}`}
          aria-live="polite"
        >
          <span className="boas-vindas-icone" aria-hidden="true">
            <Icone size={34} strokeWidth={1.5} />
          </span>
          <h1 className="boas-vindas-titulo">{slide.titulo}</h1>
          <p className="boas-vindas-texto">{slide.texto}</p>
        </section>

        <div className="boas-vindas-navegacao">
          <div className="boas-vindas-pontos" role="group" aria-label="Escolher slide">
            {SLIDES.map((item, posicao) => (
              <button
                key={item.titulo}
                type="button"
                className="boas-vindas-ponto"
                aria-current={posicao === indice ? 'step' : undefined}
                aria-label={`Slide ${posicao + 1}: ${item.titulo}`}
                onClick={() => setIndice(posicao)}
              />
            ))}
          </div>

          {!ultimo && (
            <button
              type="button"
              className="botao-texto"
              onClick={() => setIndice(indice + 1)}
            >
              Próximo
            </button>
          )}
        </div>
      </main>

      <div className="form-acoes">
        <button type="button" className="botao-primario" onClick={comecar}>
          {podeIrAoJogo ? 'Começar' : 'Criar conta e começar'}
          <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        {!usuario && (
          <div className="boas-vindas-conta">
            <button
              type="button"
              className="botao-cancelar"
              onClick={() => {
                marcarBoasVindasVistas()
                navigate('/entrar')
              }}
            >
              Já tenho conta
            </button>
            {!servico.disponivel && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="botao-cancelar"
                  onClick={() => navigate('/criar-conta')}
                >
                  Criar conta
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { describe, expect, it } from 'vitest'
import { RepositorioMemoria } from '../repositorio-memoria'
import { ServicoSavePoint } from '../servico'

function criarJogo(servico: ServicoSavePoint) {
  return servico.criarJogo({
    nome: 'Jogo Teste',
    plataforma: 'PC',
    generos: ['RPG'],
    situacao: 'Jogando',
  })
}

describe('contador de versão e atualização em tempo real', () => {
  it('criar registro com sessão ativa dispara o contador e as consultas devolvem o novo registro sem encerrar a sessão', async () => {
    const repositorio = new RepositorioMemoria()
    let mudancas = 0
    const servico = new ServicoSavePoint(repositorio, {
      onChange: () => {
        mudancas++
      },
    })

    const jogo = await criarJogo(servico)
    const sessao = await servico.iniciarSessao(jogo.id)

    // Verificar que a sessão está ativa
    const sessoes = await servico.listarSessoesDoJogo(jogo.id)
    const sessaoAtiva = sessoes.find((s) => s.fim === null)
    expect(sessaoAtiva).not.toBeNull()
    expect(sessaoAtiva?.id).toBe(sessao.id)

    // Contador começa em 0
    expect(mudancas).toBe(0)

    // Criar um registro vinculado à sessão ativa
    const registro = await servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Marco',
      texto: 'Encontrou a espada lendária',
    })

    // O contador deve ter disparado
    expect(mudancas).toBe(1)

    // A sessão continua ativa (não encerrada)
    const sessoesDepois = await servico.listarSessoesDoJogo(jogo.id)
    const sessaoAindaAtiva = sessoesDepois.find((s) => s.fim === null)
    expect(sessaoAindaAtiva).not.toBeNull()
    expect(sessaoAindaAtiva?.id).toBe(sessao.id)

    // As consultas devem devolver o novo registro sem encerrar a sessão
    const registrosJogo = await servico.listarRegistrosDoJogo(jogo.id)
    expect(registrosJogo.length).toBe(1)
    expect(registrosJogo[0].id).toBe(registro.id)
    expect(registrosJogo[0].texto).toBe('Encontrou a espada lendária')
    expect(registrosJogo[0].tipo).toBe('Marco')

    const registrosSessao = await servico.listarRegistrosDaSessao(sessao.id)
    expect(registrosSessao.length).toBe(1)
    expect(registrosSessao[0].id).toBe(registro.id)
  })

  it('atualizar registro também dispara o contador', async () => {
    const repositorio = new RepositorioMemoria()
    let mudancas = 0
    const servico = new ServicoSavePoint(repositorio, {
      onChange: () => {
        mudancas++
      },
    })

    const jogo = await criarJogo(servico)
    const sessao = await servico.iniciarSessao(jogo.id)

    const registro = await servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Marco',
      texto: 'Texto original',
    })

    expect(mudancas).toBe(1)

    await servico.atualizarRegistro(registro.id, { texto: 'Texto atualizado' })

    expect(mudancas).toBe(2)

    const atualizado = await servico.obterRegistro(registro.id)
    expect(atualizado?.texto).toBe('Texto atualizado')
  })

  it('concluir e reabrir objetivo também disparam o contador', async () => {
    const repositorio = new RepositorioMemoria()
    let mudancas = 0
    const servico = new ServicoSavePoint(repositorio, {
      onChange: () => {
        mudancas++
      },
    })

    const jogo = await criarJogo(servico)
    const sessao = await servico.iniciarSessao(jogo.id)

    const registro = await servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Objetivo',
      texto: 'Derrotar o chefe final',
    })

    expect(mudancas).toBe(1)

    await servico.concluirObjetivo(registro.id, {
      concluidoSessaoId: sessao.id,
    })

    expect(mudancas).toBe(2)

    const concluido = await servico.obterRegistro(registro.id)
    expect(concluido?.concluido).toBe(true)

    await servico.reabrirObjetivo(registro.id)

    expect(mudancas).toBe(3)

    const reaberto = await servico.obterRegistro(registro.id)
    expect(reaberto?.concluido).toBe(false)
  })

  it('excluir registro dispara o contador', async () => {
    const repositorio = new RepositorioMemoria()
    let mudancas = 0
    const servico = new ServicoSavePoint(repositorio, {
      onChange: () => {
        mudancas++
      },
    })

    const jogo = await criarJogo(servico)
    const sessao = await servico.iniciarSessao(jogo.id)

    const registro = await servico.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'Anotação temporária',
    })

    expect(mudancas).toBe(1)

    await servico.excluirRegistro(registro.id)

    expect(mudancas).toBe(2)

    const excluido = await servico.obterRegistro(registro.id)
    expect(excluido).toBeNull()
  })
})

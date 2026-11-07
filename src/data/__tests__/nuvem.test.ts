import { describe, expect, it } from 'vitest'
import { contarPendentesLocais, enviarLocalParaNuvem, temPendentes } from '../envio-local'
import {
  erroDaNuvem,
  extensaoDaCapa,
  jogoDeLinha,
  linhaDeJogo,
  linhaDeRegistro,
  linhaDeSessao,
  registroDeLinha,
  sessaoDeLinha,
} from '../repositorio-supabase'
import { RepositorioMemoria } from '../repositorio-memoria'
import { ServicoSavePoint } from '../servico'
import type { Jogo, Registro, Sessao } from '../tipos'

const AGORA = new Date('2026-11-07T12:00:00.000Z')

describe('mapeamento entre o app e as linhas do Supabase', () => {
  it('jogo: vai e volta sem perder nada', () => {
    const jogo: Jogo = {
      id: 'j1',
      nome: 'Ecos da Torre',
      plataforma: 'PC',
      generos: ['Aventura', 'Puzzle'],
      capa: null,
      situacao: 'Jogando',
      criadoEm: AGORA,
      atualizadoEm: AGORA,
    }

    const linha = linhaDeJogo(jogo, 'u1/j1.jpg')
    expect(linha.capa_caminho).toBe('u1/j1.jpg')
    expect(jogoDeLinha(linha, null)).toEqual(jogo)
  })

  it('sessão: preserva pausas e horários', () => {
    const sessao: Sessao = {
      id: 's1',
      jogoId: 'j1',
      numero: 3,
      inicio: AGORA,
      fim: new Date(AGORA.getTime() + 3_600_000),
      tempoPausado: 90_000,
      pausadoEm: null,
      oQueFiz: 'Explorei',
      ondeParei: 'No portão',
      proximoPasso: 'Achar a chave',
    }

    expect(sessaoDeLinha(linhaDeSessao(sessao))).toEqual(sessao)
  })

  it('registro comum: sem campos de conclusão', () => {
    const registro: Registro = {
      id: 'r1',
      jogoId: 'j1',
      sessaoId: 's1',
      tipo: 'Documentos',
      texto: 'Carta',
      tags: ['#lore'],
      dataHora: AGORA,
    }

    const linha = linhaDeRegistro(registro)
    expect(linha.concluido).toBeNull()
    expect(linha.concluido_sessao_id).toBeNull()
    expect(registroDeLinha(linha)).toEqual(registro)
  })

  it('objetivo: aberto, concluído e reaberto', () => {
    const aberto: Registro = {
      id: 'r2',
      jogoId: 'j1',
      sessaoId: 's1',
      tipo: 'Objetivo',
      texto: 'Abrir o portão',
      tags: [],
      dataHora: AGORA,
      concluido: false,
    }

    expect(registroDeLinha(linhaDeRegistro(aberto))).toEqual(aberto)

    const concluido: Registro = {
      ...aberto,
      concluido: true,
      concluidoEm: AGORA,
      concluidoSessaoId: 's1',
    }
    const linha = linhaDeRegistro(concluido)
    expect(linha.concluido_sessao_id).toBe('s1')
    expect(registroDeLinha(linha)).toEqual(concluido)

    // Reaberto: a conclusão some, e o banco não guarda restos dela.
    const reaberto = linhaDeRegistro({ ...concluido, concluido: false })
    expect(reaberto.concluido_em).toBeNull()
    expect(reaberto.concluido_sessao_id).toBeNull()
  })

  it('escolhe a extensão da capa pelo tipo da imagem', () => {
    expect(extensaoDaCapa('image/png')).toBe('png')
    expect(extensaoDaCapa('image/webp')).toBe('webp')
    expect(extensaoDaCapa('image/jpeg')).toBe('jpg')
    expect(extensaoDaCapa('')).toBe('jpg')
  })

  it('explica em português quando as tabelas ainda não existem', () => {
    expect(erroDaNuvem({ code: 'PGRST205', message: 'Could not find the table' }).message).toContain(
      '0001_savepoint.sql',
    )
    expect(erroDaNuvem({ message: 'TypeError: Failed to fetch' }).message).toContain('Sem conexão')
    expect(erroDaNuvem({ code: 'XX', message: 'estranho' }).message).toContain('Detalhe: XX: estranho')
  })
})

describe('enviar os dados deste navegador para a conta', () => {
  function criar(prefixo: string) {
    let contador = 0
    return new ServicoSavePoint(new RepositorioMemoria(), {
      idFactory: () => `${prefixo}-${++contador}`,
      agora: () => AGORA,
    })
  }

  it('conta o que falta, envia sem duplicar e mantém a cópia local', async () => {
    const local = criar('local')
    const nuvem = criar('nuvem')

    const jogo = await local.criarJogo({
      nome: 'Ecos da Torre',
      plataforma: 'PC',
      generos: [],
      situacao: 'Jogando',
    })
    const sessao = await local.iniciarSessao(jogo.id)
    await local.criarRegistro({
      jogoId: jogo.id,
      sessaoId: sessao.id,
      tipo: 'Diário',
      texto: 'Primeira nota',
    })
    await local.encerrarSessao(sessao.id)

    expect(await contarPendentesLocais(local, nuvem)).toEqual({ jogos: 1, sessoes: 1, registros: 1 })

    const resumo = await enviarLocalParaNuvem(local, nuvem)
    expect(resumo).toMatchObject({ jogos: 1, sessoes: 1, registros: 1, ignorados: 0 })

    const pendentes = await contarPendentesLocais(local, nuvem)
    expect(temPendentes(pendentes)).toBe(false)

    // Enviar de novo não duplica.
    expect(await enviarLocalParaNuvem(local, nuvem)).toMatchObject({ jogos: 0, registros: 0 })
    expect(await nuvem.listarJogos()).toHaveLength(1)
    expect(await local.listarJogos()).toHaveLength(1)
  })
})

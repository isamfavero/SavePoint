export type CodigoErroSavePoint =
  | 'JOGO_NAO_ENCONTRADO'
  | 'SESSAO_NAO_ENCONTRADA'
  | 'REGISTRO_NAO_ENCONTRADO'
  | 'SESSAO_ATIVA_EXISTENTE'
  | 'SESSAO_ENCERRADA'
  | 'SESSAO_NAO_PAUSADA'
  | 'SESSAO_JA_PAUSADA'
  | 'SESSAO_DE_OUTRO_JOGO'
  | 'REGISTRO_EXIGE_SESSAO'
  | 'DADOS_INVALIDOS'

export class ErroSavePoint extends Error {
  readonly codigo: CodigoErroSavePoint

  constructor(codigo: CodigoErroSavePoint, mensagem: string) {
    super(mensagem)
    this.name = 'ErroSavePoint'
    this.codigo = codigo
  }
}

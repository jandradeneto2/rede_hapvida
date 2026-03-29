import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export enum TipoBuscaRedeProduto {
  BENEFICIARIO_NOME = 'beneficiario-nome',
  BENEFICIARIO_CARTEIRINHA = 'beneficiario-carteirinha',
  PLANO = 'plano',
  PRODUTO = 'produto',
  REDE = 'rede',
}

export class SearchRedeProdutoDto {
  @IsEnum(TipoBuscaRedeProduto, {
    message: 'tipo deve ser um de: beneficiario-nome, beneficiario-carteirinha, plano, produto, rede',
  })
  tipo: TipoBuscaRedeProduto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  q: string;
}

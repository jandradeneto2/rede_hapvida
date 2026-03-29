import { IsArray, IsNotEmpty, ArrayMinSize, ArrayMaxSize, ValidateNested, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class PrestadorItemDto {
  @IsOptional()
  @IsString()
  operacao?: string;

  @IsString()
  @IsNotEmpty()
  operadora: string;

  @IsString()
  nomeFantasia: string;

  @IsString()
  uf: string;

  @IsString()
  cidade: string;

  @IsString()
  endereco: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  telefones?: string;

  @IsString()
  contratacao: string;

  @IsString()
  servico: string;

  @IsOptional()
  @IsString()
  grupoServico?: string;

  @IsOptional()
  @IsString()
  especialidade?: string;

  @IsString()
  rede: string;

  @IsOptional()
  @ValidateIf((o) => o.lat != null)
  @IsNumber()
  @Transform(({ value }) => (value == null ? undefined : Number(value)))
  lat?: number | null;

  @IsOptional()
  @ValidateIf((o) => o.lon != null)
  @IsNumber()
  @Transform(({ value }) => (value == null ? undefined : Number(value)))
  lon?: number | null;

  @IsNumber()
  codigoPrestador: number;

  @IsString()
  cnpjCpf: string;

  @IsString()
  razaoSocial: string;

  @IsOptional()
  @IsString()
  crmCnes?: string;

  @IsOptional()
  @IsString()
  redeProduto?: string;
}

export class CreatePrestadorBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => PrestadorItemDto)
  prestadores: PrestadorItemDto[];
}

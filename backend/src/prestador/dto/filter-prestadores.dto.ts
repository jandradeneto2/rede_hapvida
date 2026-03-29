import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class FilterPrestadoresDto {
  @IsOptional()
  @IsString()
  operadora?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  servico?: string;

  @IsOptional()
  @IsString()
  grupoServico?: string;

  @IsOptional()
  @IsString()
  especialidade?: string;

  @IsOptional()
  @IsString()
  rede?: string;

  @IsOptional()
  @IsString()
  redeProduto?: string;

  @IsOptional()
  @IsString()
  cnpjCpf?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  searchAfter?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 50;
}

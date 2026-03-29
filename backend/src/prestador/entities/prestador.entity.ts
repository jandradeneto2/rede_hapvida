export interface Prestador {
  operadora: string;
  nomeFantasia: string;
  uf: string;
  cidade: string;
  endereco: string;
  complemento: string;
  bairro: string;
  cep: string;
  telefones: string;
  contratacao: string;
  servico: string;
  grupoServico: string;
  especialidade: string;
  rede: string;
  localizacao?: { lat: number; lon: number } | null;
  codigoPrestador: number;
  cnpjCpf: string;
  razaoSocial: string;
  crmCnes: string;
}

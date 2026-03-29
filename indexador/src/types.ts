export interface PrestadorRow {
  operacao: string;
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
  lat: number | null;
  lon: number | null;
  codigoPrestador: number;
  cnpjCpf: string;
  razaoSocial: string;
  crmCnes: string;
  redeProduto: string;
}

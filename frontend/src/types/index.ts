export interface Prestador {
  id: string;
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

export interface AggItem {
  name: string;
  count: number;
}

export interface Kpis {
  totalPrestadores: number;
  totalLocais: number;
  totalUfs: number;
  totalCidades: number;
  ownNetwork: number;
  accreditedNetwork: number;
}

export interface AggregationsResponse {
  kpis: Kpis;
  porOperadora: AggItem[];
  porUf: AggItem[];
  porCidade: AggItem[];
  porServico: AggItem[];
  porGrupo: AggItem[];
  porEspecialidade: AggItem[];
  porRede: AggItem[];
}

export interface PrestadoresResponse {
  data: Prestador[];
  total: number;
  limit: number;
  nextSearchAfter: string | null;
}

export interface FilterOptions {
  operadoras: string[];
  ufs: string[];
  cidades: string[];
  servicos: string[];
  grupos: string[];
  especialidades: string[];
  redes: string[];
  redeProdutos: string[];
}

export interface SuggestItem {
  id: string;
  nomeFantasia: string;
  cnpjCpf: string;
  razaoSocial: string;
  codigoPrestador: number;
}

export interface GeoMarker {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpjCpf: string;
  servico: string;
  rede: string;
  cidade: string;
  uf: string;
  operadora: string;
  localizacao: { lat: number; lon: number };
}

export interface RaioContagem {
  faixa: string;
  prestadores: number;
}

export interface GeoResponse {
  markers: GeoMarker[];
  raioContagens: RaioContagem[];
}

export interface ActiveFilters {
  operacao: string;
  operadora: string;
  uf: string;
  cidade: string;
  servico: string;
  grupoServico: string;
  especialidade: string;
  rede: string;
  search: string;
  cnpjCpf: string;
  redeProduto: string;
}

export type TipoBuscaRedeProduto =
  | 'beneficiario-nome'
  | 'beneficiario-carteirinha'
  | 'plano'
  | 'produto'
  | 'rede';

export interface RedeProdutoSearchResult {
  cdTipoRedeAtendimento: number | null;
  nmComercialRede: string;
  nmPessoa?: string;
  nuCgcCpf?: string;
  operadora?: string;
  cdPlano?: number;
  nmPlano?: string;
  nuRegPlanoAns?: string;
  dsPlanoAns?: string;
  cdUsuario?: string;
}

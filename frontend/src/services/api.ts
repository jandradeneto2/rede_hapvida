import axios from 'axios';
import type {
  AggregationsResponse,
  PrestadoresResponse,
  FilterOptions,
  SuggestItem,
  GeoResponse,
  ActiveFilters,
  TipoBuscaRedeProduto,
  RedeProdutoSearchResult,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const api = axios.create({ baseURL: BASE_URL });

function toQueryParams(filters: Partial<ActiveFilters>): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.operacao) params.operacao = filters.operacao;
  if (filters.operadora) params.operadora = filters.operadora;
  if (filters.uf) params.uf = filters.uf;
  if (filters.cidade) params.cidade = filters.cidade;
  if (filters.servico) params.servico = filters.servico;
  if (filters.grupoServico) params.grupoServico = filters.grupoServico;
  if (filters.especialidade) params.especialidade = filters.especialidade;
  if (filters.rede) params.rede = filters.rede;
  if (filters.search) params.search = filters.search;
  if (filters.cnpjCpf) params.cnpjCpf = filters.cnpjCpf;
  if (filters.redeProduto) params.redeProduto = filters.redeProduto;
  return params;
}

export async function fetchAggregations(
  filters: Partial<ActiveFilters>,
): Promise<AggregationsResponse> {
  const { data } = await api.get<AggregationsResponse>('/prestadores/aggregations', {
    params: toQueryParams(filters),
  });
  return data;
}

export async function fetchPrestadores(
  filters: Partial<ActiveFilters>,
  searchAfter?: string | null,
  limit = 50,
): Promise<PrestadoresResponse> {
  const params: Record<string, string> = { ...toQueryParams(filters), limit: String(limit) };
  if (searchAfter) params.searchAfter = searchAfter;
  const { data } = await api.get<PrestadoresResponse>('/prestadores', { params });
  return data;
}

export async function fetchFilterOptions(uf?: string, operacao?: string): Promise<FilterOptions> {
  const params: Record<string, string> = {};
  if (uf) params.uf = uf;
  if (operacao) params.operacao = operacao;
  const { data } = await api.get<FilterOptions>('/prestadores/filter-options', { params });
  return data;
}

export async function fetchSuggest(q: string): Promise<SuggestItem[]> {
  if (!q || q.length < 2) return [];
  const { data } = await api.get<SuggestItem[]>('/prestadores/suggest', {
    params: { q },
  });
  return data;
}

export async function fetchGeo(
  filters: Partial<ActiveFilters>,
  lat?: number,
  lng?: number,
  raios?: number[],
): Promise<GeoResponse> {
  const params: Record<string, string> = toQueryParams(filters);
  if (lat != null) params.lat = String(lat);
  if (lng != null) params.lng = String(lng);
  if (raios?.length) params.raios = raios.join(',');

  const { data } = await api.get<GeoResponse>('/prestadores/geo', { params });
  return data;
}

export async function searchRedeProduto(
  tipo: TipoBuscaRedeProduto,
  q: string,
): Promise<RedeProdutoSearchResult[]> {
  const { data } = await api.get<RedeProdutoSearchResult[]>('/rede-produto/search', {
    params: { tipo, q },
  });
  return data;
}

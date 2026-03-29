import axios, { AxiosInstance } from 'axios';
import { config } from './config';
import { PrestadorRow } from './types';

let client: AxiosInstance;

function getClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: config.api.url,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.api.key,
      },
      timeout: 300_000,
    });
  }
  return client;
}

export async function clearIndex(): Promise<void> {
  console.log('[API] Clearing index...');
  await getClient().delete('/prestadores/clear');
  console.log('[API] Index cleared.');
}

export async function sendBatch(batch: PrestadorRow[]): Promise<{ indexed: number; errors: any[] }> {
  const payload = {
    prestadores: batch.map((row) => ({
      operacao: row.operacao,
      operadora: row.operadora,
      nomeFantasia: row.nomeFantasia,
      uf: row.uf,
      cidade: row.cidade,
      endereco: row.endereco,
      complemento: row.complemento,
      bairro: row.bairro,
      cep: row.cep,
      telefones: row.telefones,
      contratacao: row.contratacao,
      servico: row.servico,
      grupoServico: row.grupoServico,
      especialidade: row.especialidade,
      rede: row.rede,
      lat: row.lat,
      lon: row.lon,
      codigoPrestador: row.codigoPrestador,
      cnpjCpf: row.cnpjCpf,
      razaoSocial: row.razaoSocial,
      crmCnes: row.crmCnes,
      redeProduto: row.redeProduto,
    })),
  };

  const response = await getClient().post<{ indexed: number; errors: any[] }>(
    '/prestadores/batch',
    payload,
  );

  return response.data;
}

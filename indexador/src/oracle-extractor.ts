import oracledb from 'oracledb';
import { config } from './config';
import { PrestadorRow } from './types';

// ─── SQL fragments ────────────────────────────────────────────────────────────

const SELECT_COLS = `
  CASE WHEN x.FL_ODONTOLOGIA = 'S' THEN 'Odonto' ELSE 'Saúde' END         AS OPERACAO,
  CASE
    WHEN x.CD_EMPRESA_PLANO = 14 THEN 'NDI SP'
    WHEN x.CD_EMPRESA_PLANO = 12 THEN 'HB SAUDE'
    WHEN x.CD_EMPRESA_PLANO = 10 THEN 'NDI MG'
    WHEN x.CD_EMPRESA_PLANO = 9  THEN 'CLINIPAM'
    WHEN x.CD_EMPRESA_PLANO = 8  THEN 'CCG'
    WHEN x.CD_EMPRESA_PLANO = 7  THEN 'RN'
    WHEN x.CD_EMPRESA_PLANO = 1  THEN 'HAPVIDA'
    WHEN x.CD_EMPRESA_PLANO = 3  THEN 'ODONTO'
    WHEN x.CD_EMPRESA_PLANO = '' THEN 'HAP ODONTO'
    ELSE 'OUTROS'
  END                                                                        AS OPERADORA,
  x.NM_FANTASIA                                                              AS NOME_FANTASIA,
  x.CD_UF                                                                    AS UF,
  x.NM_CIDADE                                                                AS CIDADE,
  x.ENDERECO                                                                 AS ENDERECO,
  x.DS_COMPL_ENDERECO                                                        AS COMPLEMENTO,
  x.NM_BAIRRO                                                                AS BAIRRO,
  x.CD_CEP                                                                   AS CEP,
  x.DS_FONE                                                                  AS TELEFONES,
  CASE WHEN x.FL_TIPO_PESSOA = 1 THEN 'Física' ELSE 'Jurídica' END          AS CONTRATACAO,
  x.DS_SERVICO                                                               AS SERVICO,
  CASE WHEN x.DS_SERVICO <> 'CONSULTORIOS/CLINICAS'
    THEN x.DS_ESPECIALIDADE ELSE '' END                                      AS GRUPO_SERVICO,
  CASE WHEN x.DS_SERVICO = 'CONSULTORIOS/CLINICAS'
    THEN x.DS_ESPECIALIDADE ELSE '' END                                      AS ESPECIALIDADE,
  CASE WHEN NVL(PJ.CD_NATUREZA_JURIDICA, 99) IN (21, 22)
    THEN 'Própria' ELSE 'Credenciada' END                                   AS REDE,
  e.CD_LATITUDE                                                              AS LATITUDE,
  e.CD_LONGITUDE                                                             AS LONGITUDE,
  x.CD_PRESTADOR                                                             AS CODIGO_PRESTADOR,
  x.NU_CGC_CPF                                                               AS CNPJ_CPF,
  x.NM_PRESTADOR                                                             AS RAZAO_SOCIAL,
  x.NU_CNES_CRM                                                              AS CRM_CNES`;

const FROM_JOINS = `
FROM
  TB_GUIA_ON_LINE x,
  TB_PRESTADOR_JURIDICO pj,
  TB_PRESTADOR_FISICO pf,
  TB_ENDERECO_PRESTADOR e
WHERE
  pj.CD_PESSOA(+) = x.CD_PRESTADOR
  AND pf.CD_PESSOA(+) = x.CD_PRESTADOR
  AND e.CD_PESSOA(+) = x.CD_PRESTADOR
  AND e.NU_ORDEM_ENDERECO(+) = x.NU_ORDEM_ENDERECO`;

const GROUP_COLS = `
  CASE WHEN x.FL_ODONTOLOGIA = 'S' THEN 'Odonto' ELSE 'Saúde' END,
  CASE
    WHEN x.CD_EMPRESA_PLANO = 14 THEN 'NDI SP'
    WHEN x.CD_EMPRESA_PLANO = 12 THEN 'HB SAUDE'
    WHEN x.CD_EMPRESA_PLANO = 10 THEN 'NDI MG'
    WHEN x.CD_EMPRESA_PLANO = 9  THEN 'CLINIPAM'
    WHEN x.CD_EMPRESA_PLANO = 8  THEN 'CCG'
    WHEN x.CD_EMPRESA_PLANO = 7  THEN 'RN'
    WHEN x.CD_EMPRESA_PLANO = 1  THEN 'HAPVIDA'
    WHEN x.CD_EMPRESA_PLANO = 3  THEN 'ODONTO'
    WHEN x.CD_EMPRESA_PLANO = '' THEN 'HAP ODONTO'
    ELSE 'OUTROS'
  END,
  x.NM_FANTASIA,
  x.CD_UF,
  x.NM_CIDADE,
  x.ENDERECO,
  x.DS_COMPL_ENDERECO,
  x.NM_BAIRRO,
  x.CD_CEP,
  x.DS_FONE,
  CASE WHEN x.FL_TIPO_PESSOA = 1 THEN 'Física' ELSE 'Jurídica' END,
  x.DS_SERVICO,
  CASE WHEN x.DS_SERVICO <> 'CONSULTORIOS/CLINICAS' THEN x.DS_ESPECIALIDADE ELSE '' END,
  CASE WHEN x.DS_SERVICO = 'CONSULTORIOS/CLINICAS'  THEN x.DS_ESPECIALIDADE ELSE '' END,
  CASE WHEN NVL(PJ.CD_NATUREZA_JURIDICA, 99) IN (21, 22) THEN 'Própria' ELSE 'Credenciada' END,
  e.CD_LATITUDE,
  e.CD_LONGITUDE,
  x.CD_PRESTADOR,
  x.NU_CGC_CPF,
  x.NM_PRESTADOR,
  x.NU_CNES_CRM`;

// ─── Company filter map ───────────────────────────────────────────────────────

// Maps INDEX_WORKER values to an additional WHERE clause for Parte 2.
// 'parte2' (no suffix) means all companies — no extra filter.
const EMPRESA_FILTERS: Record<string, string> = {
  'parte2-hapvida':       'AND x.CD_EMPRESA_PLANO IN (1)',
  'parte2-ccg-clinipam':  'AND x.CD_EMPRESA_PLANO IN (8, 9)',
  'parte2-ndi':           'AND x.CD_EMPRESA_PLANO IN (10, 14)',
  'parte2-outros':        'AND (x.CD_EMPRESA_PLANO NOT IN (1, 3, 7, 8, 9, 10, 12, 14) OR x.CD_EMPRESA_PLANO IS NULL)',
};

// ─── SQL builders ─────────────────────────────────────────────────────────────

function buildParte1(): string {
  return `
-- Parte 1: consolidação para todas as redes (rede_produto = '0')
SELECT ${SELECT_COLS},
  '0' AS REDE_PRODUTO
${FROM_JOINS}
GROUP BY ${GROUP_COLS}`;
}

function buildParte2(extraWhere: string = ''): string {
  return `
-- Parte 2: consolidação por rede (rede_produto = cd_rede_hap)
SELECT ${SELECT_COLS},
  x.CD_REDE_HAP AS REDE_PRODUTO
${FROM_JOINS}
  ${extraWhere}
GROUP BY
  x.CD_REDE_HAP,
${GROUP_COLS}`;
}

function buildSQL(worker: string): string {
  if (worker === 'parte1') {
    return buildParte1();
  }
  if (worker.startsWith('parte2')) {
    const extraWhere = EMPRESA_FILTERS[worker] ?? '';
    return buildParte2(extraWhere);
  }
  // 'all' — original UNION ALL behaviour
  return `${buildParte1()}\nUNION ALL\n${buildParte2()}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(val: any): number | null {
  if (val == null) return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function toString(val: any): string {
  return val == null ? '' : String(val).trim();
}

// ─── Main extractor ───────────────────────────────────────────────────────────

export async function* extractPrestadores(
  batchSize: number,
): AsyncGenerator<PrestadorRow[]> {
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

  const libDir = process.env.ORACLE_LIB_DIR;
  if (libDir) {
    try {
      oracledb.initOracleClient({ libDir });
      console.log(`[Oracle] Thick mode initialized from ${libDir}`);
    } catch {
      console.warn('[Oracle] initOracleClient failed — continuing in Thin mode');
    }
  }

  const connection = await oracledb.getConnection({
    user: config.oracle.user,
    password: config.oracle.password,
    connectionString: config.oracle.connectionString,
  });

  const sql = buildSQL(config.indexWorker);
  console.log(`[Oracle] Worker: ${config.indexWorker} — Connected. Running extraction query...`);

  try {
    const result = await connection.execute(sql, [], {
      fetchArraySize: batchSize,
      resultSet: true,
    });

    const rs = result.resultSet!;
    let batch: PrestadorRow[] = [];
    let row: any;
    let totalRows = 0;

    while ((row = await rs.getRow())) {
      batch.push({
        operacao: toString(row.OPERACAO),
        operadora: toString(row.OPERADORA),
        nomeFantasia: toString(row.NOME_FANTASIA),
        uf: toString(row.UF),
        cidade: toString(row.CIDADE),
        endereco: toString(row.ENDERECO),
        complemento: toString(row.COMPLEMENTO),
        bairro: toString(row.BAIRRO),
        cep: toString(row.CEP),
        telefones: toString(row.TELEFONES),
        contratacao: toString(row.CONTRATACAO),
        servico: toString(row.SERVICO),
        grupoServico: toString(row.GRUPO_SERVICO),
        especialidade: toString(row.ESPECIALIDADE),
        rede: toString(row.REDE),
        lat: toNumber(row.LATITUDE),
        lon: toNumber(row.LONGITUDE),
        codigoPrestador: toNumber(row.CODIGO_PRESTADOR) ?? 0,
        cnpjCpf: toString(row.CNPJ_CPF),
        razaoSocial: toString(row.RAZAO_SOCIAL),
        crmCnes: toString(row.CRM_CNES),
        redeProduto: toString(row.REDE_PRODUTO),
      });

      totalRows++;

      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
        console.log(`[Oracle] Extracted ${totalRows} rows so far...`);
      }
    }

    if (batch.length > 0) {
      yield batch;
      console.log(`[Oracle] Extraction complete. Total rows: ${totalRows}`);
    }

    await rs.close();
  } finally {
    await connection.close();
    console.log('[Oracle] Connection closed.');
  }
}

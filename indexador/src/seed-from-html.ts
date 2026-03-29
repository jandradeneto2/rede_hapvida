/**
 * Seeder que extrai o array RAW embutido no index.html do protótipo
 * e indexa os dados via POST /prestadores/batch.
 *
 * Uso:
 *   npx ts-node src/seed-from-html.ts [caminho/para/index.html]
 *   ou via npm: npm run seed
 *
 * O script busca o index.html automaticamente na raiz do monorepo
 * se nenhum caminho for fornecido como argumento.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'hapvida-secret-key';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '5000', 10);
const CLEAN_INDEX = process.env.CLEAN_INDEX === 'true';

// ─── Field mapping: prototype short keys → API full keys ────────────────────
interface RawRecord {
  op: string;   // operadora
  nm: string;   // nomeFantasia
  uf: string;
  ci: string;   // cidade
  en: string;   // endereco
  co: string;   // complemento
  ba: string;   // bairro
  cep: string;
  fo: string;   // telefones
  ct: string;   // contratacao
  sv: string;   // servico
  gs: string;   // grupoServico
  es: string;   // especialidade
  re: string;   // rede
  la: number | null;  // lat
  lo: number | null;  // lon
  pr: number;   // codigoPrestador
  cn: string;   // cnpjCpf
  rs: string;   // razaoSocial
  crm: string;  // crmCnes
}

function mapRecord(r: RawRecord) {
  return {
    operadora:        r.op || '',
    nomeFantasia:     r.nm || '',
    uf:               r.uf || '',
    cidade:           r.ci || '',
    endereco:         r.en || '',
    complemento:      r.co || '',
    bairro:           r.ba || '',
    cep:              r.cep || '',
    telefones:        r.fo || '',
    contratacao:      r.ct || '',
    servico:          r.sv || '',
    grupoServico:     r.gs || '',
    especialidade:    r.es || '',
    rede:             r.re || '',
    lat:              r.la ?? null,
    lon:              r.lo ?? null,
    codigoPrestador:  Number(r.pr) || 0,
    cnpjCpf:          String(r.cn || ''),
    razaoSocial:      r.rs || '',
    crmCnes:          String(r.crm || ''),
    redeProduto:      '0',
  };
}

// ─── Extract RAW array from HTML ─────────────────────────────────────────────
function extractRawArray(html: string): RawRecord[] {
  const START_TOKEN = 'const RAW = ';
  const startIdx = html.indexOf(START_TOKEN);
  if (startIdx === -1) throw new Error('Could not find "const RAW = " in index.html');

  let i = startIdx + START_TOKEN.length;

  // Skip to opening bracket
  while (i < html.length && html[i] !== '[') i++;
  if (i >= html.length) throw new Error('No opening bracket found after "const RAW = "');

  const arrayStart = i;
  let depth = 0;

  while (i < html.length) {
    const ch = html[i];

    if (ch === '"') {
      // Skip over string contents
      i++;
      while (i < html.length && html[i] !== '"') {
        if (html[i] === '\\') i++; // skip escaped character
        i++;
      }
    } else if (ch === '[' || ch === '{') {
      depth++;
    } else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) {
        return JSON.parse(html.slice(arrayStart, i + 1));
      }
    }
    i++;
  }

  throw new Error('Unterminated RAW array — could not find closing bracket');
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
  timeout: 60_000,
});

async function clearIndex() {
  console.log('[API] Clearing index...');
  await client.delete('/prestadores/clear');
  console.log('[API] Index cleared.');
}

async function sendBatch(batch: ReturnType<typeof mapRecord>[]) {
  const res = await client.post<{ indexed: number; errors: any[] }>(
    '/prestadores/batch',
    { prestadores: batch },
  );
  return res.data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const htmlArg = process.argv[2];
  const htmlPath = htmlArg
    ? path.resolve(htmlArg)
    : path.resolve(__dirname, '../../../index.html');

  console.log('==============================================');
  console.log(' Hapvida Seeder — index.html → API');
  console.log('==============================================');
  console.log(`HTML:       ${htmlPath}`);
  console.log(`API URL:    ${API_URL}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Clean:      ${CLEAN_INDEX}`);
  console.log('----------------------------------------------');

  if (!fs.existsSync(htmlPath)) {
    console.error(`[ERROR] File not found: ${htmlPath}`);
    console.error('Usage: npx ts-node src/seed-from-html.ts [path/to/index.html]');
    process.exit(1);
  }

  console.log('[HTML] Reading file...');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  console.log(`[HTML] File size: ${(html.length / 1024 / 1024).toFixed(1)} MB`);

  console.log('[HTML] Extracting RAW array...');
  const raw = extractRawArray(html);
  console.log(`[HTML] Found ${raw.length.toLocaleString('pt-BR')} records.`);

  const mapped = raw.map(mapRecord);

  if (CLEAN_INDEX) await clearIndex();

  let totalIndexed = 0;
  let totalErrors = 0;
  let batchNum = 0;
  const startTime = Date.now();

  for (let offset = 0; offset < mapped.length; offset += BATCH_SIZE) {
    batchNum++;
    const batch = mapped.slice(offset, offset + BATCH_SIZE);
    process.stdout.write(`[Batch ${batchNum}] Sending ${batch.length} records... `);

    try {
      const result = await sendBatch(batch);
      totalIndexed += result.indexed;
      totalErrors += result.errors?.length ?? 0;

      if (result.errors?.length) {
        console.log(`✗ ${result.indexed} indexed, ${result.errors.length} errors`);
        result.errors.slice(0, 3).forEach((e: any) =>
          console.error('  Error:', JSON.stringify(e)),
        );
      } else {
        console.log(`✓ ${result.indexed} indexed`);
      }
    } catch (err: any) {
      console.error(`\n[ERROR] Batch ${batchNum} failed:`, err.message);
      if (err.response?.data) console.error('  Response:', JSON.stringify(err.response.data));
      totalErrors += batch.length;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('==============================================');
  console.log(`Seeding complete in ${elapsed}s`);
  console.log(`  Total records:  ${raw.length.toLocaleString('pt-BR')}`);
  console.log(`  Total indexed:  ${totalIndexed.toLocaleString('pt-BR')}`);
  console.log(`  Total errors:   ${totalErrors}`);
  console.log('==============================================');

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});

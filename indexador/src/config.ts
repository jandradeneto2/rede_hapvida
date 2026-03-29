import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  oracle: {
    user: process.env.ORACLE_USER || '',
    password: process.env.ORACLE_PASSWORD || '',
    connectionString: process.env.ORACLE_CONNECTION_STRING || '',
  },
  api: {
    url: process.env.API_URL || 'http://localhost:3000',
    key: process.env.API_KEY || 'hapvida-secret-key',
  },
  batchSize: parseInt(process.env.BATCH_SIZE || '5000', 10),
  cleanIndex: process.env.CLEAN_INDEX === 'true',
  sendConcurrency: parseInt(process.env.SEND_CONCURRENCY || '5', 10),
  // INDEX_WORKER controls which SQL partition this process runs:
  //   'all'               — UNION ALL completo (default, comportamento original)
  //   'parte1'            — Parte 1 apenas (rede_produto='0')
  //   'parte2'            — Parte 2 apenas (rede_produto=cd_rede_hap), todas as empresas
  //   'parte2-hapvida'    — Parte 2, CD_EMPRESA_PLANO IN (1)
  //   'parte2-ccg-clinipam' — Parte 2, CD_EMPRESA_PLANO IN (8,9)
  //   'parte2-ndi'        — Parte 2, CD_EMPRESA_PLANO IN (10,14)
  //   'parte2-outros'     — Parte 2, demais empresas (NOT IN 1,3,7,8,9,10,12,14)
  indexWorker: process.env.INDEX_WORKER || 'all',
};

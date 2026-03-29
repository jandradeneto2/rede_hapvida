import { config } from './config';
import { extractPrestadores } from './oracle-extractor';
import { sendBatch, clearIndex } from './api-loader';
import { PrestadorRow } from './types';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

async function sendWithRetry(
  batch: PrestadorRow[],
  batchNum: number,
): Promise<{ indexed: number; errors: any[] }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await sendBatch(batch);
    } catch (err: any) {
      if (attempt === MAX_RETRIES) throw err;
      const delay = attempt * RETRY_BASE_DELAY_MS;
      console.warn(
        `[Batch ${batchNum}] Attempt ${attempt}/${MAX_RETRIES} failed (${err.message}) — retrying in ${delay}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}

async function main() {
  console.log('======================================');
  console.log(' Hapvida Indexador — Oracle → API');
  console.log('======================================');
  console.log(`Config:`);
  console.log(`  API URL:     ${config.api.url}`);
  console.log(`  Batch size:  ${config.batchSize}`);
  console.log(`  Concurrency: ${config.sendConcurrency}`);
  console.log(`  Retries:     ${MAX_RETRIES}`);
  console.log(`  Worker:      ${config.indexWorker}`);
  console.log(`  Clean:       ${config.cleanIndex}`);
  console.log(`  Oracle:      ${config.oracle.user}@${config.oracle.connectionString}`);
  console.log('--------------------------------------');

  if (!config.oracle.user || !config.oracle.connectionString) {
    console.error('[ERROR] Oracle credentials not configured.');
    process.exit(1);
  }

  if (config.cleanIndex) {
    await clearIndex();
  }

  let totalIndexed = 0;
  let totalErrors = 0;
  let batchNum = 0;
  const startTime = Date.now();
  const concurrency = config.sendConcurrency;

  // Concurrent sliding window: at most `concurrency` batches in-flight simultaneously.
  // Each promise removes itself from the Set when settled.
  const inFlight = new Set<Promise<void>>();

  for await (const batch of extractPrestadores(config.batchSize)) {
    const currentBatch = ++batchNum;

    const p: Promise<void> = sendWithRetry(batch, currentBatch)
      .then((result) => {
        totalIndexed += result.indexed;
        totalErrors += result.errors.length;
        if (result.errors.length > 0) {
          console.log(`[Batch ${currentBatch}] ✗ ${result.indexed} indexed, ${result.errors.length} errors`);
          result.errors.slice(0, 3).forEach((e: any) =>
            console.error('  Error:', JSON.stringify(e)),
          );
        } else {
          console.log(`[Batch ${currentBatch}] ✓ ${result.indexed} indexed`);
        }
      })
      .catch((err: any) => {
        console.error(`[Batch ${currentBatch}] FAILED after ${MAX_RETRIES} retries: ${err.message}`);
        if (err.response?.data) console.error('  Response:', JSON.stringify(err.response.data));
        totalErrors += batch.length;
      })
      .finally(() => {
        inFlight.delete(p);
      });

    inFlight.add(p);
    console.log(`[Batch ${currentBatch}] Sending ${batch.length} records (in-flight: ${inFlight.size}/${concurrency})`);

    // When window is full, wait for any one to complete before reading next batch
    if (inFlight.size >= concurrency) {
      await Promise.race(inFlight);
    }
  }

  // Wait for all remaining in-flight batches
  await Promise.all(inFlight);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('======================================');
  console.log(`Indexing complete in ${elapsed}s`);
  console.log(`  Total indexed: ${totalIndexed}`);
  console.log(`  Total errors:  ${totalErrors}`);
  console.log('======================================');

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});

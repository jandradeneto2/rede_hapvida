import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import oracledb from 'oracledb';

@Injectable()
export class OracleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OracleService.name);
  private pool: oracledb.Pool | null = null;
  private credentialsConfigured = false;
  private clientInitialized = false;

  async onModuleInit() {
    const user = process.env.ORACLE_USER;
    const password = process.env.ORACLE_PASSWORD;
    const connectionString = process.env.ORACLE_CONNECTION_STRING;

    if (!user || !password || !connectionString) {
      this.logger.warn('Oracle credentials not configured — Oracle queries will be unavailable.');
      return;
    }

    this.credentialsConfigured = true;

    const libDir = process.env.ORACLE_LIB_DIR;
    if (libDir && !this.clientInitialized) {
      try {
        oracledb.initOracleClient({ libDir });
        this.clientInitialized = true;
        this.logger.log(`Oracle Thick mode initialized from ${libDir}`);
      } catch {
        this.logger.warn('initOracleClient failed — continuing in Thin mode');
      }
    }

    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    await this.createPool();
  }

  private async createPool() {
    const user = process.env.ORACLE_USER;
    const password = process.env.ORACLE_PASSWORD;
    const connectionString = process.env.ORACLE_CONNECTION_STRING;

    try {
      this.pool = await oracledb.createPool({
        user,
        password,
        connectString: connectionString,
        poolMin: 0,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 60,
      });
      this.logger.log('Oracle connection pool created.');
    } catch (err) {
      this.logger.error(`Failed to create Oracle pool: ${(err as Error).message}`);
      this.pool = null;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      try {
        await this.pool.close(0);
        this.logger.log('Oracle connection pool closed.');
      } catch {
        // ignore on shutdown
      }
    }
  }

  async query<T = Record<string, any>>(sql: string, binds: Record<string, any> = {}): Promise<T[]> {
    if (!this.credentialsConfigured) {
      throw new ServiceUnavailableException(
        'Oracle não está configurado neste ambiente. Defina ORACLE_USER, ORACLE_PASSWORD e ORACLE_CONNECTION_STRING.',
      );
    }

    // Tenta recriar o pool se ele falhou na inicialização (ex: servidor temporariamente indisponível)
    if (!this.pool) {
      this.logger.log('Pool não disponível, tentando reconectar ao Oracle...');
      await this.createPool();
    }

    if (!this.pool) {
      throw new ServiceUnavailableException(
        'Não foi possível conectar ao banco Oracle. Verifique se o servidor está acessível e tente novamente.',
      );
    }

    const connection = await this.pool.getConnection();
    try {
      const result = await connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        maxRows: 500,
      });
      return (result.rows ?? []) as T[];
    } finally {
      await connection.close();
    }
  }
}

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import oracledb from 'oracledb';

@Injectable()
export class OracleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OracleService.name);
  private pool: oracledb.Pool | null = null;

  async onModuleInit() {
    const user = process.env.ORACLE_USER;
    const password = process.env.ORACLE_PASSWORD;
    const connectionString = process.env.ORACLE_CONNECTION_STRING;

    if (!user || !password || !connectionString) {
      this.logger.warn('Oracle credentials not configured — Oracle queries will be unavailable.');
      return;
    }

    const libDir = process.env.ORACLE_LIB_DIR;
    if (libDir) {
      try {
        oracledb.initOracleClient({ libDir });
        this.logger.log(`Oracle Thick mode initialized from ${libDir}`);
      } catch {
        this.logger.warn('initOracleClient failed — continuing in Thin mode');
      }
    }

    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    try {
      this.pool = await oracledb.createPool({
        user,
        password,
        connectString: connectionString,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1,
      });
      this.logger.log('Oracle connection pool created.');
    } catch (err) {
      this.logger.error('Failed to create Oracle pool', err);
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
    if (!this.pool) {
      throw new Error('Oracle connection pool is not available. Check ORACLE_USER, ORACLE_PASSWORD and ORACLE_CONNECTION_STRING environment variables.');
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

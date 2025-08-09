import { Pool, PoolClient } from 'pg';
import { Job, EnqueueOptions, ClientConfig, JobRow } from './types';
import { JobInstance } from './job';
import { SQL_QUERIES } from './sql';
import { formatJobArgs } from './utils';

export class Client {
  private pool: Pool;

  constructor(config: ClientConfig = {}) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      max: config.maxConnections || 10,
    });
  }

  async enqueue(
    jobClass: string,
    args: any[] = [],
    options: EnqueueOptions = {}
  ): Promise<Job> {
    const {
      priority = 100,
      runAt = new Date(),
      queue = ''
    } = options;

    const argsJson = formatJobArgs(args);
    
    const result = await this.pool.query(SQL_QUERIES.ENQUEUE_JOB, [
      jobClass,
      argsJson,
      priority,
      runAt,
      queue
    ]);

    const row = result.rows[0] as JobRow;
    return new JobInstance(row, this.pool);
  }

  async enqueueInTx(
    client: PoolClient,
    jobClass: string,
    args: any[] = [],
    options: EnqueueOptions = {}
  ): Promise<Job> {
    const {
      priority = 100,
      runAt = new Date(),
      queue = ''
    } = options;

    const argsJson = formatJobArgs(args);
    
    const result = await client.query(SQL_QUERIES.ENQUEUE_JOB, [
      jobClass,
      argsJson,
      priority,
      runAt,
      queue
    ]);

    const row = result.rows[0] as JobRow;
    return new JobInstance(row, this.pool);
  }

  async lockJob(queue: string = ''): Promise<Job | null> {
    const result = await this.pool.query(SQL_QUERIES.LOCK_JOB, [queue]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as JobRow;
    return new JobInstance(row, this.pool);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
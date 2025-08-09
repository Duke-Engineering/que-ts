import { Pool } from 'pg';
import { Job, JobRow } from './types';
import { SQL_QUERIES } from './sql';
import { parseJobArgs, calculateRetryDelay } from './utils';

export class JobInstance implements Job {
  public readonly id: number;
  public readonly queue: string;
  public readonly priority: number;
  public readonly runAt: Date;
  public readonly jobClass: string;
  public readonly args: any[];
  public readonly errorCount: number;
  public readonly lastError?: string;

  private pool: Pool;

  constructor(row: JobRow, pool: Pool) {
    this.id = row.job_id;
    this.queue = row.queue;
    this.priority = row.priority;
    this.runAt = row.run_at;
    this.jobClass = row.job_class;
    this.args = parseJobArgs(row.args);
    this.errorCount = row.error_count;
    this.lastError = row.last_error || undefined;
    this.pool = pool;
  }

  async delete(): Promise<void> {
    await this.pool.query(SQL_QUERIES.DELETE_JOB, [this.id]);
    await this.unlock();
  }

  async done(): Promise<void> {
    await this.delete();
  }

  async error(errorMessage: string): Promise<void> {
    const retryDelay = calculateRetryDelay(this.errorCount + 1);
    const updateQuery = SQL_QUERIES.UPDATE_JOB_ERROR.replace('%d', retryDelay.toString());
    
    await this.pool.query(updateQuery, [this.id, errorMessage]);
    await this.unlock();
  }

  private async unlock(): Promise<void> {
    await this.pool.query(SQL_QUERIES.UNLOCK_JOB, [this.id]);
  }
}
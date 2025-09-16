import { Pool, PoolClient } from "pg";
import { Job, EnqueueOptions, ClientConfig, JobRow, JSONArray } from "./types";
import { JobInstance } from "./job";
import { SQL_QUERIES } from "./sql";
import { formatJobArgs, runMigrations } from "./utils";

export class Client {
  private pool: Pool;
  private migrationPromise: Promise<void>;

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
      idleTimeoutMillis: 5000, // Close idle connections after 5 seconds
      connectionTimeoutMillis: 5000, // Timeout connection attempts after 5 seconds
    });
    // run migrations on startup and store the promise
    this.migrationPromise = runMigrations(this.pool).catch((error) => {
      // Only log if it's not a "table already exists" error
      if (!error.message?.includes('already exists')) {
        console.error("Error running migrations", error);
      }
    });
  }

  // Helper to ensure migrations are complete before operations
  private async ensureMigrations(): Promise<void> {
    await this.migrationPromise;
  }

  async enqueue(
    jobClass: string,
    args: JSONArray = [],
    options: EnqueueOptions = {}
  ): Promise<Job> {
    await this.ensureMigrations();
    const { priority = 100, runAt = new Date(), queue = "" } = options;

    const argsJson = formatJobArgs(args);

    const result = await this.pool.query(SQL_QUERIES.ENQUEUE_JOB, [
      jobClass,
      argsJson,
      priority,
      runAt,
      queue,
    ]);

    const row = result.rows[0] as JobRow;
    return new JobInstance(row, this.pool);
  }

  async enqueueInTx(
    client: PoolClient,
    jobClass: string,
    args: JSONArray = [],
    options: EnqueueOptions = {}
  ): Promise<Job> {
    const { priority = 100, runAt = new Date(), queue = "" } = options;

    const argsJson = formatJobArgs(args);

    const result = await client.query(SQL_QUERIES.ENQUEUE_JOB, [
      jobClass,
      argsJson,
      priority,
      runAt,
      queue,
    ]);

    const row = result.rows[0] as JobRow;
    return new JobInstance(row, this.pool);
  }

  async lockJob(queue: string = ""): Promise<Job | null> {
    await this.ensureMigrations();
    const result = await this.pool.query(SQL_QUERIES.LOCK_JOB, [queue]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as JobRow;
    return new JobInstance(row, this.pool);
  }

  async close(): Promise<void> {
    await this.pool.end();
    // Small delay to ensure all connections are fully closed
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

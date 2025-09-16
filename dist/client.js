"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const pg_1 = require("pg");
const job_1 = require("./job");
const sql_1 = require("./sql");
const utils_1 = require("./utils");
class Client {
    constructor(config = {}) {
        this.pool = new pg_1.Pool({
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
        this.migrationPromise = (0, utils_1.runMigrations)(this.pool).catch((error) => {
            // Only log if it's not a "table already exists" error
            if (!error.message?.includes('already exists')) {
                console.error("Error running migrations", error);
            }
        });
    }
    // Helper to ensure migrations are complete before operations
    async ensureMigrations() {
        await this.migrationPromise;
    }
    async enqueue(jobClass, args = [], options = {}) {
        await this.ensureMigrations();
        const { priority = 100, runAt = new Date(), queue = "" } = options;
        const argsJson = (0, utils_1.formatJobArgs)(args);
        const result = await this.pool.query(sql_1.SQL_QUERIES.ENQUEUE_JOB, [
            jobClass,
            argsJson,
            priority,
            runAt,
            queue,
        ]);
        const row = result.rows[0];
        return new job_1.JobInstance(row, this.pool);
    }
    async enqueueInTx(client, jobClass, args = [], options = {}) {
        const { priority = 100, runAt = new Date(), queue = "" } = options;
        const argsJson = (0, utils_1.formatJobArgs)(args);
        const result = await client.query(sql_1.SQL_QUERIES.ENQUEUE_JOB, [
            jobClass,
            argsJson,
            priority,
            runAt,
            queue,
        ]);
        const row = result.rows[0];
        return new job_1.JobInstance(row, this.pool);
    }
    async lockJob(queue = "") {
        await this.ensureMigrations();
        const result = await this.pool.query(sql_1.SQL_QUERIES.LOCK_JOB, [queue]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return new job_1.JobInstance(row, this.pool);
    }
    async close() {
        await this.pool.end();
        // Small delay to ensure all connections are fully closed
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map
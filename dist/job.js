"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobInstance = void 0;
const sql_1 = require("./sql");
const utils_1 = require("./utils");
class JobInstance {
    constructor(row, pool) {
        this.id = parseInt(row.job_id, 10);
        this.queue = row.queue;
        this.priority = row.priority;
        this.runAt = row.run_at;
        this.jobClass = row.job_class;
        this.args = (0, utils_1.parseJobArgs)(row.args);
        this.errorCount = row.error_count;
        this.lastError = row.last_error || undefined;
        this.pool = pool;
    }
    async delete() {
        await this.pool.query(sql_1.SQL_QUERIES.DELETE_JOB, [this.id]);
        await this.unlock();
    }
    async done() {
        await this.delete();
    }
    async error(errorMessage) {
        const retryDelay = (0, utils_1.calculateRetryDelay)(this.errorCount + 1);
        const updateQuery = sql_1.SQL_QUERIES.UPDATE_JOB_ERROR.replace('%d', retryDelay.toString());
        await this.pool.query(updateQuery, [this.id, errorMessage]);
        await this.unlock();
    }
    async unlock() {
        await this.pool.query(sql_1.SQL_QUERIES.UNLOCK_JOB, [this.id]);
    }
}
exports.JobInstance = JobInstance;
//# sourceMappingURL=job.js.map
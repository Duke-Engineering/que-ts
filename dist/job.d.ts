import { Pool } from 'pg';
import { Job, JobRow } from './types';
export declare class JobInstance implements Job {
    readonly id: number;
    readonly queue: string;
    readonly priority: number;
    readonly runAt: Date;
    readonly jobClass: string;
    readonly args: any[];
    readonly errorCount: number;
    readonly lastError?: string;
    private pool;
    constructor(row: JobRow, pool: Pool);
    delete(): Promise<void>;
    done(): Promise<void>;
    error(errorMessage: string): Promise<void>;
    private unlock;
}
//# sourceMappingURL=job.d.ts.map
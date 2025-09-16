import { PoolClient } from "pg";
import { Job, EnqueueOptions, ClientConfig, JSONArray } from "./types";
export declare class Client {
    private pool;
    private migrationPromise;
    constructor(config?: ClientConfig);
    private ensureMigrations;
    enqueue(jobClass: string, args?: JSONArray, options?: EnqueueOptions): Promise<Job>;
    enqueueInTx(client: PoolClient, jobClass: string, args?: JSONArray, options?: EnqueueOptions): Promise<Job>;
    lockJob(queue?: string): Promise<Job | null>;
    close(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map
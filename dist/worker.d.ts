import { WorkFunction, WorkerOptions, ClientConfig } from './types';
export declare class Worker {
    private client;
    private workMap;
    private queue;
    private interval;
    private running;
    private shutdownPromise;
    private timeoutId;
    constructor(clientConfig?: ClientConfig, options?: WorkerOptions);
    register(jobClass: string, workFunc: WorkFunction): void;
    work(): Promise<void>;
    workOne(): Promise<boolean>;
    shutdown(): Promise<void>;
    private workLoop;
    private processJob;
}
//# sourceMappingURL=worker.d.ts.map
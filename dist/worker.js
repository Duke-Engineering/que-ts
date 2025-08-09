"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const client_1 = require("./client");
class Worker {
    constructor(clientConfig = {}, options = {}) {
        this.workMap = {};
        this.running = false;
        this.shutdownPromise = null;
        this.timeoutId = null;
        this.client = new client_1.Client(clientConfig);
        this.queue = options.queue || '';
        this.interval = options.interval || 5000;
    }
    register(jobClass, workFunc) {
        this.workMap[jobClass] = workFunc;
    }
    async work() {
        if (this.running) {
            throw new Error('Worker is already running');
        }
        this.running = true;
        this.shutdownPromise = this.workLoop();
        return this.shutdownPromise;
    }
    async workOne() {
        const job = await this.client.lockJob(this.queue);
        if (!job) {
            return false;
        }
        await this.processJob(job);
        return true;
    }
    async shutdown() {
        if (!this.running) {
            return;
        }
        this.running = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.shutdownPromise) {
            await this.shutdownPromise;
        }
        await this.client.close();
    }
    async workLoop() {
        while (this.running) {
            try {
                const processed = await this.workOne();
                if (!processed && this.running) {
                    await new Promise((resolve) => {
                        this.timeoutId = setTimeout(resolve, this.interval);
                    });
                }
            }
            catch (error) {
                console.error('Worker error:', error);
                if (this.running) {
                    await new Promise((resolve) => {
                        this.timeoutId = setTimeout(resolve, this.interval);
                    });
                }
            }
        }
    }
    async processJob(job) {
        const workFunc = this.workMap[job.jobClass];
        if (!workFunc) {
            await job.error(`No work function registered for job class: ${job.jobClass}`);
            return;
        }
        try {
            await workFunc(job);
            await job.done();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await job.error(errorMessage);
        }
    }
}
exports.Worker = Worker;
//# sourceMappingURL=worker.js.map
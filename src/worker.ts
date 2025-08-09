import { Client } from './client';
import { Job, WorkFunction, WorkMap, WorkerOptions, ClientConfig } from './types';

export class Worker {
  private client: Client;
  private workMap: WorkMap = {};
  private queue: string;
  private interval: number;
  private running: boolean = false;
  private shutdownPromise: Promise<void> | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(clientConfig: ClientConfig = {}, options: WorkerOptions = {}) {
    this.client = new Client(clientConfig);
    this.queue = options.queue || '';
    this.interval = options.interval || 5000;
  }

  register(jobClass: string, workFunc: WorkFunction): void {
    this.workMap[jobClass] = workFunc;
  }

  async work(): Promise<void> {
    if (this.running) {
      throw new Error('Worker is already running');
    }

    this.running = true;
    this.shutdownPromise = this.workLoop();
    return this.shutdownPromise;
  }

  async workOne(): Promise<boolean> {
    const job = await this.client.lockJob(this.queue);
    
    if (!job) {
      return false;
    }

    await this.processJob(job);
    return true;
  }

  async shutdown(): Promise<void> {
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

  private async workLoop(): Promise<void> {
    while (this.running) {
      try {
        const processed = await this.workOne();
        
        if (!processed && this.running) {
          await new Promise<void>((resolve) => {
            this.timeoutId = setTimeout(resolve, this.interval);
          });
        }
      } catch (error) {
        console.error('Worker error:', error);
        
        if (this.running) {
          await new Promise<void>((resolve) => {
            this.timeoutId = setTimeout(resolve, this.interval);
          });
        }
      }
    }
  }

  private async processJob(job: Job): Promise<void> {
    const workFunc = this.workMap[job.jobClass];
    
    if (!workFunc) {
      await job.error(`No work function registered for job class: ${job.jobClass}`);
      return;
    }

    try {
      await workFunc(job);
      await job.done();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await job.error(errorMessage);
    }
  }
}
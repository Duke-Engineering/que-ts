import { Client, EnqueueOptions, Job, Worker, JSONValue } from '../../src/index';
import { TEST_DB_CONFIG } from '../setup';


export interface WorkerInterface<T extends JSONValue> {
  worker: (args: T | undefined) => Promise<Error | void>;
}

class Que {
  private client: Client;
  private worker: Worker;

  constructor() {
    this.client = new Client(TEST_DB_CONFIG);
    this.worker = new Worker(TEST_DB_CONFIG, { interval: 1000 });

    process.on('SIGINT', async () => {
      console.log('Shutting down worker...');
      await this.worker.shutdown();
      await this.client.close();
    });
  }

  async registerWorker<T extends JSONValue>(workerFunction: WorkerInterface<T>) {
    this.worker.register(workerFunction.constructor.name, async (job: Job) => {
      let arg: T | undefined;
      try {
        // job.args are already parsed, no need to JSON.parse again
        arg = job.args.length > 0 ? (job.args[0] as T) : undefined;
      } catch (error) {
        throw error;
      }
      const result = await workerFunction.worker(arg);
      if (result instanceof Error) {
        throw result;
      }
      return result;
    });
  }

  start() {
    // Don't await - let it run in background
    this.worker.work().catch(console.error);
  }

  async shutdown() {
    try {
      await this.worker.shutdown();
      await this.client.close();
    } catch (error) {
      console.error('Shutdown error:', error);
    }
  }

  async enqueue<T extends JSONValue>(cls: abstract new (...args: any[]) => WorkerInterface<T>, args: T, options?: Omit<EnqueueOptions, 'queue'>) {
    // Pass args directly, no need to stringify since client handles serialization
    return await this.client.enqueue(cls.name, [args], options);
  }
}

// Export a singleton instance of the Que class
export const que = new Que();

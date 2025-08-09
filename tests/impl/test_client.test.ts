import { que, WorkerInterface } from './test_client';

const workerResult: (string | undefined)[] = []

class TestWorker implements WorkerInterface<string> {
  async worker(args: string | undefined) {
    // Worker successfully processed job with args: args
    console.log(`TestWorker processed with args ${args}`)
    workerResult.push(args)
    return undefined;
  }
}

describe('que', () => {
  beforeAll(async () => {
    await que.registerWorker(new TestWorker());
    que.start();
    // Give worker a moment to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await que.shutdown();
  });

  it('should enqueue a job', async () => {
    const job = await que.enqueue(TestWorker, 'test');
    expect(job).toBeDefined();
    expect(job.jobClass).toBe('TestWorker');
    expect(job.id).toBeGreaterThan(0);

    expect(workerResult).toHaveLength(0)

    // Wait for job to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(workerResult).toHaveLength(1)
    expect(workerResult[0]).toBe('test')
  });
});

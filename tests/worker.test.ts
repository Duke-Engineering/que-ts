import { Worker } from '../src/worker';
import { Client } from '../src/client';
import { setupTestDatabase, cleanupTestDatabase, TEST_DB_CONFIG } from './setup';
import { Pool } from 'pg';

describe('Worker', () => {
  let pool: Pool;
  let client: Client;
  let worker: Worker;

  beforeAll(async () => {
    pool = await setupTestDatabase();
  });

  beforeEach(async () => {
    client = new Client(TEST_DB_CONFIG);
    worker = new Worker(TEST_DB_CONFIG);
    await pool.query('TRUNCATE que_jobs');
  });

  afterEach(async () => {
    await worker.shutdown();
    await client.close();
    // Clean up any advisory locks
    await pool.query('SELECT pg_advisory_unlock_all()');
    // Small delay to ensure connections are fully closed
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await cleanupTestDatabase(pool);
  });

  describe('register', () => {
    it('should register work functions', () => {
      const mockWorkFunc = jest.fn();
      worker.register('TestJob', mockWorkFunc);
      
      // Access private field for testing (not ideal but necessary for this test)
      expect((worker as any).workMap['TestJob']).toBe(mockWorkFunc);
    });
  });

  describe('workOne', () => {
    it('should return false when no jobs available', async () => {
      const result = await worker.workOne();
      expect(result).toBe(false);
    });

    it('should process a job when available', async () => {
      const mockWorkFunc = jest.fn().mockResolvedValue(undefined);
      worker.register('TestJob', mockWorkFunc);

      await client.enqueue('TestJob', ['test', 'data']);
      
      const result = await worker.workOne();
      expect(result).toBe(true);
      expect(mockWorkFunc).toHaveBeenCalledTimes(1);
      
      const job = mockWorkFunc.mock.calls[0][0];
      expect(job.jobClass).toBe('TestJob');
      expect(job.args).toEqual(['test', 'data']);
    });

    it('should handle work function errors', async () => {
      const mockWorkFunc = jest.fn().mockRejectedValue(new Error('Work failed'));
      worker.register('TestJob', mockWorkFunc);

      await client.enqueue('TestJob', ['test']);
      
      const result = await worker.workOne();
      expect(result).toBe(true);
      expect(mockWorkFunc).toHaveBeenCalledTimes(1);

      // Check that the job was marked with an error
      const failedJob = await pool.query('SELECT * FROM que_jobs WHERE job_class = $1', ['TestJob']);
      expect(failedJob.rows.length).toBe(1);
      expect(failedJob.rows[0].error_count).toBe(1);
      expect(failedJob.rows[0].last_error).toBe('Work failed');
    });

    it('should handle unregistered job classes', async () => {
      await client.enqueue('UnregisteredJob', ['test']);
      
      const result = await worker.workOne();
      expect(result).toBe(true);

      // Check that the job was marked with an error
      const failedJob = await pool.query('SELECT * FROM que_jobs WHERE job_class = $1', ['UnregisteredJob']);
      expect(failedJob.rows.length).toBe(1);
      expect(failedJob.rows[0].error_count).toBe(1);
      expect(failedJob.rows[0].last_error).toContain('No work function registered');
    });
  });
});
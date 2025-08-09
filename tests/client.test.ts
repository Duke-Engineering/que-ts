import { Client } from '../src/client';
import { setupTestDatabase, cleanupTestDatabase, TEST_DB_CONFIG } from './setup';
import { Pool } from 'pg';

describe('Client', () => {
  let pool: Pool;
  let client: Client;

  beforeAll(async () => {
    pool = await setupTestDatabase();
  });

  beforeEach(async () => {
    client = new Client(TEST_DB_CONFIG);
    await pool.query('TRUNCATE que_jobs');
  });

  afterEach(async () => {
    await client.close();
  });

  afterAll(async () => {
    await cleanupTestDatabase(pool);
  });

  describe('enqueue', () => {
    it('should enqueue a job with default options', async () => {
      const job = await client.enqueue('TestJob', ['arg1', 'arg2']);

      expect(job.jobClass).toBe('TestJob');
      expect(job.args).toEqual(['arg1', 'arg2']);
      expect(job.priority).toBe(100);
      expect(job.queue).toBe('');
      expect(job.errorCount).toBe(0);
      expect(job.id).toBeGreaterThan(0);
    });

    it('should enqueue a job with custom options', async () => {
      const runAt = new Date(Date.now() + 60000);
      const job = await client.enqueue('TestJob', ['arg1'], {
        priority: 50,
        runAt,
        queue: 'test-queue'
      });

      expect(job.priority).toBe(50);
      expect(job.queue).toBe('test-queue');
      expect(Math.abs(job.runAt.getTime() - runAt.getTime())).toBeLessThan(1000);
    });
  });

  describe('lockJob', () => {
    it('should return null when no jobs are available', async () => {
      const job = await client.lockJob();
      expect(job).toBeNull();
    });

    it('should lock and return a job when available', async () => {
      await client.enqueue('TestJob', ['test']);
      
      const job = await client.lockJob();
      expect(job).not.toBeNull();
      expect(job!.jobClass).toBe('TestJob');
      expect(job!.args).toEqual(['test']);
    });

    it('should respect queue filtering', async () => {
      await client.enqueue('TestJob1', [], { queue: 'queue1' });
      await client.enqueue('TestJob2', [], { queue: 'queue2' });
      
      const job = await client.lockJob('queue2');
      expect(job).not.toBeNull();
      expect(job!.jobClass).toBe('TestJob2');
      expect(job!.queue).toBe('queue2');
    });
  });
});
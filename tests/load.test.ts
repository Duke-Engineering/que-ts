import { Worker } from "../src/worker";
import { Client } from "../src/client";
import {
  setupTestDatabase,
  cleanupTestDatabase,
  TEST_DB_CONFIG,
} from "./setup";
import { Pool } from "pg";

// Performance measurement utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryStart: NodeJS.MemoryUsage = {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
    arrayBuffers: 0,
  };

  start(): void {
    this.startTime = Date.now();
    this.memoryStart = process.memoryUsage();
  }

  end(): {
    duration: number;
    memoryDelta: NodeJS.MemoryUsage;
    throughput: number;
  } {
    this.endTime = Date.now();
    const duration = this.endTime - this.startTime;
    const memoryEnd = process.memoryUsage();
    const memoryDelta = {
      rss: memoryEnd.rss - this.memoryStart.rss,
      heapTotal: memoryEnd.heapTotal - this.memoryStart.heapTotal,
      heapUsed: memoryEnd.heapUsed - this.memoryStart.heapUsed,
      external: memoryEnd.external - this.memoryStart.external,
      arrayBuffers: memoryEnd.arrayBuffers - this.memoryStart.arrayBuffers,
    };

    return {
      duration,
      memoryDelta,
      throughput: 0, // Will be calculated by caller
    };
  }
}

// Test job implementations
const createTestJob = (duration: number = 0) => {
  return async (job: any) => {
    if (duration > 0) {
      await new Promise((resolve) => setTimeout(resolve, duration));
    }
    // Simulate some work
    const result = job.args.reduce((sum: number, arg: number) => sum + arg, 0);
    return result;
  };
};

const createFailingJob = (failureRate: number = 0.1) => {
  return async (job: any) => {
    if (Math.random() < failureRate) {
      throw new Error(`Simulated failure for job ${job.id}`);
    }
    return job.args;
  };
};

describe("Load Tests", () => {
  let pool: Pool;
  let client: Client;
  let workers: Worker[] = [];

  beforeAll(async () => {
    pool = await setupTestDatabase();
  });

  beforeEach(async () => {
    client = new Client(TEST_DB_CONFIG);
    await pool.query("TRUNCATE que_jobs");
    // Small delay to ensure TRUNCATE completes
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  afterEach(async () => {
    // Shutdown all workers
    await Promise.all(workers.map((worker) => worker.shutdown()));
    workers = [];
    await client.close();
    // Clean up any advisory locks
    await pool.query("SELECT pg_advisory_unlock_all()");
    // Small delay to ensure connections are fully closed
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await cleanupTestDatabase(pool);
  });

  describe("Job Enqueue Throughput", () => {
    it("should measure enqueue throughput for different batch sizes", async () => {
      const batchSizes = [100, 500, 1000, 2000];
      const results: Array<{
        batchSize: number;
        throughput: number;
        duration: number;
      }> = [];

      for (const batchSize of batchSizes) {
        const monitor = new PerformanceMonitor();
        monitor.start();

        // Enqueue jobs in parallel
        const enqueuePromises = Array.from({ length: batchSize }, (_, i) =>
          client.enqueue("TestJob", [i, i * 2])
        );

        await Promise.all(enqueuePromises);

        const metrics = monitor.end();
        const throughput = batchSize / (metrics.duration / 1000); // jobs per second

        results.push({
          batchSize,
          throughput,
          duration: metrics.duration,
        });

        console.log(
          `Batch size ${batchSize}: ${throughput.toFixed(2)} jobs/sec (${
            metrics.duration
          }ms)`
        );
      }

      // Verify all jobs were enqueued
      const totalJobs = await pool.query(
        "SELECT COUNT(*) as count FROM que_jobs"
      );
      expect(parseInt(totalJobs.rows[0].count)).toBe(
        batchSizes.reduce((sum, size) => sum + size, 0)
      );

      // Log results for analysis
      console.log("\nEnqueue Throughput Results:");
      results.forEach((result) => {
        console.log(
          `  ${result.batchSize} jobs: ${result.throughput.toFixed(2)} jobs/sec`
        );
      });
    }, 30000);

    it("should measure enqueue throughput with different job complexities", async () => {
      const jobCount = 1000;
      const testCases = [
        { name: "Simple", args: [1, 2, 3] },
        { name: "Medium", args: Array.from({ length: 10 }, (_, i) => i) },
        {
          name: "Complex",
          args: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            data: `item-${i}`,
          })),
        },
      ];

      for (const testCase of testCases) {
        const monitor = new PerformanceMonitor();
        monitor.start();

        const enqueuePromises = Array.from({ length: jobCount }, (_, i) =>
          client.enqueue("TestJob", testCase.args)
        );

        await Promise.all(enqueuePromises);

        const metrics = monitor.end();
        const throughput = jobCount / (metrics.duration / 1000);

        console.log(
          `${testCase.name} jobs: ${throughput.toFixed(2)} jobs/sec (${
            metrics.duration
          }ms)`
        );
      }
    }, 20000);
  });

  describe("Worker Processing Capacity", () => {
    it("should measure single worker processing throughput", async () => {
      const jobCount = 1000;
      const worker = new Worker(TEST_DB_CONFIG);
      workers.push(worker);

      // Register a simple job handler
      worker.register("TestJob", createTestJob(0));

      // Enqueue jobs
      const enqueuePromises = Array.from({ length: jobCount }, (_, i) =>
        client.enqueue("TestJob", [i])
      );
      await Promise.all(enqueuePromises);

      const monitor = new PerformanceMonitor();
      monitor.start();

      // Start worker and wait for all jobs to be processed
      const workPromise = worker.work();

      // Poll until all jobs are processed
      let processedCount = 0;
      while (processedCount < jobCount) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const result = await pool.query(
          "SELECT COUNT(*) as count FROM que_jobs"
        );
        processedCount = jobCount - parseInt(result.rows[0].count);
      }

      const metrics = monitor.end();
      const throughput = jobCount / (metrics.duration / 1000);

      console.log(
        `Single worker throughput: ${throughput.toFixed(2)} jobs/sec (${
          metrics.duration
        }ms)`
      );

      // Shutdown worker
      await worker.shutdown();
      workers = [];

      expect(processedCount).toBe(jobCount);
    }, 30000);

    it("should measure worker throughput with different job durations", async () => {
      const jobCount = 100;
      const jobDurations = [0, 10, 50, 100]; // milliseconds

      for (const duration of jobDurations) {
        const worker = new Worker(TEST_DB_CONFIG);
        workers.push(worker);

        worker.register("TestJob", createTestJob(duration));

        // Enqueue jobs
        const enqueuePromises = Array.from({ length: jobCount }, (_, i) =>
          client.enqueue("TestJob", [i])
        );
        await Promise.all(enqueuePromises);

        const monitor = new PerformanceMonitor();
        monitor.start();

        const workPromise = worker.work();

        // Wait for all jobs to be processed
        let processedCount = 0;
        while (processedCount < jobCount) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const result = await pool.query(
            "SELECT COUNT(*) as count FROM que_jobs"
          );
          processedCount = jobCount - parseInt(result.rows[0].count);
        }

        const metrics = monitor.end();
        const throughput = jobCount / (metrics.duration / 1000);

        console.log(
          `Job duration ${duration}ms: ${throughput.toFixed(2)} jobs/sec (${
            metrics.duration
          }ms)`
        );

        await worker.shutdown();
        workers = [];
      }
    }, 60000);
  });

  describe("Concurrent Worker Scaling", () => {
    it("should measure throughput with multiple concurrent workers", async () => {
      const jobCount = 2000;
      const workerCounts = [1, 2, 4, 8];

      for (const workerCount of workerCounts) {
        // Create workers
        const currentWorkers = Array.from({ length: workerCount }, () => {
          const worker = new Worker(TEST_DB_CONFIG);
          worker.register("TestJob", createTestJob(0));
          return worker;
        });
        workers.push(...currentWorkers);

        // Enqueue jobs
        const enqueuePromises = Array.from({ length: jobCount }, (_, i) =>
          client.enqueue("TestJob", [i])
        );
        await Promise.all(enqueuePromises);

        const monitor = new PerformanceMonitor();
        monitor.start();

        // Start all workers
        const workPromises = currentWorkers.map((worker) => worker.work());

        // Wait for all jobs to be processed
        let processedCount = 0;
        while (processedCount < jobCount) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const result = await pool.query(
            "SELECT COUNT(*) as count FROM que_jobs"
          );
          processedCount = jobCount - parseInt(result.rows[0].count);
        }

        const metrics = monitor.end();
        const throughput = jobCount / (metrics.duration / 1000);

        console.log(
          `${workerCount} workers: ${throughput.toFixed(2)} jobs/sec (${
            metrics.duration
          }ms)`
        );

        // Shutdown workers
        await Promise.all(currentWorkers.map((worker) => worker.shutdown()));
        workers = [];
      }
    }, 120000);

    it("should measure worker efficiency with different queue distributions", async () => {
      const jobCount = 1000;
      const queueCounts = [1, 2, 4, 8];

      for (const queueCount of queueCounts) {
        // Create workers for each queue
        const currentWorkers = Array.from({ length: queueCount }, (_, i) => {
          const worker = new Worker(TEST_DB_CONFIG, { queue: `queue-${i}` });
          worker.register("TestJob", createTestJob(0));
          return worker;
        });
        workers.push(...currentWorkers);

        // Enqueue jobs across different queues
        const enqueuePromises = Array.from({ length: jobCount }, (_, i) =>
          client.enqueue("TestJob", [i], { queue: `queue-${i % queueCount}` })
        );
        await Promise.all(enqueuePromises);

        const monitor = new PerformanceMonitor();
        monitor.start();

        // Start all workers
        const workPromises = currentWorkers.map((worker) => worker.work());

        // Wait for all jobs to be processed
        let processedCount = 0;
        while (processedCount < jobCount) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const result = await pool.query(
            "SELECT COUNT(*) as count FROM que_jobs"
          );
          processedCount = jobCount - parseInt(result.rows[0].count);
        }

        const metrics = monitor.end();
        const throughput = jobCount / (metrics.duration / 1000);

        console.log(
          `${queueCount} queues: ${throughput.toFixed(2)} jobs/sec (${
            metrics.duration
          }ms)`
        );

        // Shutdown workers
        await Promise.all(currentWorkers.map((worker) => worker.shutdown()));
        workers = [];
      }
    }, 120000);
  });

  describe("Error Handling and Recovery", () => {
    it("should measure throughput with job failures", async () => {
      const jobCount = 1000;
      const failureRates = [0, 0.1, 0.2, 0.5];

      for (const failureRate of failureRates) {
        const worker = new Worker(TEST_DB_CONFIG);
        workers.push(worker);

        worker.register("TestJob", createFailingJob(failureRate));

        // Enqueue jobs
        const enqueuePromises = Array.from({ length: jobCount }, (_, i) =>
          client.enqueue("TestJob", [i])
        );
        await Promise.all(enqueuePromises);

        const monitor = new PerformanceMonitor();
        monitor.start();

        const workPromise = worker.work();

        // Wait for all jobs to be processed (including retries)
        let processedCount = 0;
        let maxWaitTime = 30000; // 30 seconds max
        const startTime = Date.now();

        while (
          processedCount < jobCount &&
          Date.now() - startTime < maxWaitTime
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const result = await pool.query(
            "SELECT COUNT(*) as count FROM que_jobs"
          );
          processedCount = jobCount - parseInt(result.rows[0].count);
        }

        const metrics = monitor.end();
        const throughput = jobCount / (metrics.duration / 1000);

        // Check error distribution
        const errorResult = await pool.query(
          "SELECT error_count, COUNT(*) as count FROM que_jobs GROUP BY error_count"
        );
        const errorDistribution = errorResult.rows.reduce((acc, row) => {
          acc[row.error_count] = parseInt(row.count);
          return acc;
        }, {} as Record<number, number>);

        console.log(
          `Failure rate ${failureRate}: ${throughput.toFixed(2)} jobs/sec (${
            metrics.duration
          }ms)`
        );
        console.log(`  Error distribution:`, errorDistribution);

        await worker.shutdown();
        workers = [];
      }
    }, 180000);
  });

  describe("Memory and Resource Usage", () => {
    it("should monitor memory usage during high load", async () => {
      const jobCount = 5000;
      const worker = new Worker(TEST_DB_CONFIG);
      workers.push(worker);

      worker.register("TestJob", createTestJob(0));

      const initialMemory = process.memoryUsage();
      console.log("Initial memory:", {
        rss: Math.round(initialMemory.rss / 1024 / 1024),
        heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024),
      });

      // Enqueue jobs in batches to monitor memory growth
      const batchSize = 1000;
      for (let i = 0; i < jobCount; i += batchSize) {
        const batchPromises = Array.from(
          { length: Math.min(batchSize, jobCount - i) },
          (_, j) => client.enqueue("TestJob", [i + j])
        );
        await Promise.all(batchPromises);

        const currentMemory = process.memoryUsage();
        console.log(`After enqueuing ${i + batchSize} jobs:`, {
          rss: Math.round(currentMemory.rss / 1024 / 1024),
          heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024),
        });
      }

      // Process all jobs
      const workPromise = worker.work();

      let processedCount = 0;
      while (processedCount < jobCount) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const result = await pool.query(
          "SELECT COUNT(*) as count FROM que_jobs"
        );
        processedCount = jobCount - parseInt(result.rows[0].count);
      }

      const finalMemory = process.memoryUsage();
      console.log("Final memory:", {
        rss: Math.round(finalMemory.rss / 1024 / 1024),
        heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(finalMemory.heapTotal / 1024 / 1024),
      });

      await worker.shutdown();
      workers = [];

      expect(processedCount).toBe(jobCount);
    }, 60000);
  });

  describe("Latency Measurements", () => {
    it("should measure job processing latency distribution", async () => {
      const jobCount = 1000;
      const worker = new Worker(TEST_DB_CONFIG);
      workers.push(worker);

      const latencies: number[] = [];

      worker.register("TestJob", async (job) => {
        const startTime = Date.now();
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
        const endTime = Date.now();
        latencies.push(endTime - startTime);
      });

      // Enqueue jobs
      const enqueuePromises = Array.from({ length: jobCount }, (_, i) =>
        client.enqueue("TestJob", [i])
      );
      await Promise.all(enqueuePromises);

      const workPromise = worker.work();

      // Wait for all jobs to be processed
      let processedCount = 0;
      while (processedCount < jobCount) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const result = await pool.query(
          "SELECT COUNT(*) as count FROM que_jobs"
        );
        processedCount = jobCount - parseInt(result.rows[0].count);
      }

      await worker.shutdown();
      workers = [];

      // Calculate latency statistics
      latencies.sort((a, b) => a - b);
      const avgLatency =
        latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];

      console.log("Latency statistics:");
      console.log(`  Average: ${avgLatency.toFixed(2)}ms`);
      console.log(`  P50: ${p50}ms`);
      console.log(`  P95: ${p95}ms`);
      console.log(`  P99: ${p99}ms`);

      expect(latencies.length).toBe(jobCount);
    }, 30000);
  });
});

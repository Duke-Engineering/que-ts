export interface Job {
  id: number;
  queue: string;
  priority: number;
  runAt: Date;
  jobClass: string;
  args: any[];
  errorCount: number;
  lastError?: string;
}

export interface EnqueueOptions {
  priority?: number;
  runAt?: Date;
  queue?: string;
}

export interface WorkFunction {
  (job: Job): Promise<void>;
}

export interface WorkMap {
  [jobClass: string]: WorkFunction;
}

export interface ClientConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
}

export interface WorkerOptions {
  queue?: string;
  interval?: number;
  maxAttempts?: number;
}

export interface JobRow {
  priority: number;
  run_at: Date;
  job_id: number;
  job_class: string;
  args: string;
  error_count: number;
  last_error?: string;
  queue: string;
}
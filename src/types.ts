// JSON type that represents valid JSON values
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> { }

export interface Job {
  id: number;
  queue: string;
  priority: number;
  runAt: Date;
  jobClass: string;
  args: JSONArray;
  errorCount: number;
  lastError?: string;

  // Job instance methods
  delete(): Promise<void>;
  done(): Promise<void>;
  error(errorMessage: string): Promise<void>;
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
  job_id: string; // PostgreSQL bigserial comes as string from pg driver
  job_class: string;
  args: JSONArray; // PostgreSQL JSON column - always an array for job arguments
  error_count: number;
  last_error?: string | null;
  queue: string;
}

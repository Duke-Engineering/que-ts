# Que-TS: TypeScript Port of que-go

## Project Overview

This project is a TypeScript implementation of [que-go](https://github.com/bgentry/que-go), which itself is a Golang port of the Ruby Que queuing library for PostgreSQL. The goal is to provide a Node.js/TypeScript job queue that maintains interoperability with both the Ruby and Go implementations.

## Core Concept

Que is a job queue that uses PostgreSQL's advisory locks for reliability and performance. It allows for:
- Cross-language job enqueueing and processing
- Reliable job processing with strong consistency guarantees
- Minimal infrastructure requirements (just PostgreSQL)
- Built-in retry logic with exponential backoff

## Key Features to Implement

### 1. Job Queue Management
- **Job Enqueueing**: Add jobs to the queue with priority and scheduling
- **Job Locking**: Use PostgreSQL advisory locks to ensure only one worker processes each job
- **Job Processing**: Execute registered work functions for different job types
- **Error Handling**: Track failures, implement retry logic with exponential backoff

### 2. Worker System
- **Continuous Processing**: Workers that poll and process jobs
- **Graceful Shutdown**: Clean worker termination
- **Configurable Polling**: Adjustable wake intervals
- **Work Function Registration**: Map job classes to handler functions

### 3. Database Integration
- **Connection Pool Management**: Maintain persistent connections for advisory locks
- **Transaction Support**: Enqueue jobs within existing transactions
- **Prepared Statements**: Optimize database performance
- **Schema Management**: Handle database migrations and setup

## Database Schema

The core table structure (must match Ruby/Go implementations for interoperability):

```sql
CREATE TABLE que_jobs (
    priority    smallint    NOT NULL DEFAULT 100,
    run_at      timestamptz NOT NULL DEFAULT now(),
    job_id      bigserial   NOT NULL,
    job_class   text        NOT NULL,
    args        json        NOT NULL DEFAULT '[]'::json,
    error_count integer     NOT NULL DEFAULT 0,
    last_error  text,
    queue       text        NOT NULL DEFAULT ''
);

-- Composite primary key for efficient job ordering
PRIMARY KEY (queue, priority, run_at, job_id);
```

## Core TypeScript Interfaces

### Job Structure
```typescript
interface Job {
  id: number;
  queue: string;
  priority: number;
  runAt: Date;
  jobClass: string;
  args: any[];
  errorCount: number;
  lastError?: string;
}
```

### Client Interface
```typescript
interface Client {
  enqueue(jobClass: string, args?: any[], options?: EnqueueOptions): Promise<Job>;
  enqueueInTx(tx: Transaction, jobClass: string, args?: any[], options?: EnqueueOptions): Promise<Job>;
  lockJob(queue?: string): Promise<Job | null>;
}
```

### Worker Interface
```typescript
interface Worker {
  work(): Promise<void>;
  workOne(): Promise<boolean>;
  shutdown(): Promise<void>;
  register(jobClass: string, workFunc: WorkFunction): void;
}
```

## Technical Implementation Requirements

### 1. PostgreSQL Advisory Locks
- Must use `pg_try_advisory_lock()` for job locking
- Maintain connection consistency during job processing
- Handle lock cleanup on connection termination

### 2. Job Processing Workflow
1. **Lock Acquisition**: Use recursive CTE to find and lock highest priority job
2. **Job Execution**: Unmarshal arguments and call registered work function
3. **Completion Handling**: Delete successful jobs, update failed jobs with error info
4. **Retry Logic**: Calculate exponential backoff using `error_count^4` seconds

### 3. Error Handling
- Recover from work function exceptions
- Track error messages and counts
- Implement exponential backoff for retries
- Preserve jobs for manual intervention after excessive failures

### 4. Interoperability Considerations
- JSON argument serialization compatible with Ruby/Go
- Identical database schema and query patterns
- Same job priority and scheduling logic
- Compatible retry and error handling behavior

## Project Structure (Proposed)

```
que-ts/
├── src/
│   ├── client.ts          # Main client implementation
│   ├── worker.ts          # Worker implementation
│   ├── job.ts             # Job class and methods
│   ├── sql.ts             # SQL statements and queries
│   ├── types.ts           # TypeScript interfaces
│   ├── utils.ts           # Utility functions
│   └── index.ts           # Public API exports
├── migrations/
│   └── schema.sql         # Database schema setup
├── tests/
│   ├── client.test.ts
│   ├── worker.test.ts
│   └── integration.test.ts
├── examples/
│   └── basic-usage.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

### Core Dependencies
- **pg**: PostgreSQL client for Node.js
- **pg-pool**: Connection pooling

### Development Dependencies
- **typescript**: TypeScript compiler
- **@types/pg**: TypeScript definitions for pg
- **jest**: Testing framework
- **@types/jest**: TypeScript definitions for jest

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Database connection and pooling
- [ ] Basic job enqueueing
- [ ] Job locking mechanism
- [ ] Database schema setup

### Phase 2: Worker System
- [ ] Worker implementation
- [ ] Work function registration
- [ ] Job processing workflow
- [ ] Error handling and retries

### Phase 3: Advanced Features
- [ ] Transaction support for enqueueing
- [ ] Graceful shutdown
- [ ] Multiple queue support
- [ ] Performance optimizations

### Phase 4: Testing and Documentation
- [ ] Comprehensive test suite
- [ ] Integration tests with PostgreSQL
- [ ] API documentation
- [ ] Usage examples

### Phase 5: Interoperability Validation
- [ ] Test compatibility with Ruby Que
- [ ] Test compatibility with que-go
- [ ] Cross-language job processing validation

## Notes and Considerations

1. **Connection Management**: Critical to maintain the same connection during job processing for advisory locks to work correctly

2. **Prepared Statements**: Should be used for performance optimization, similar to the Go implementation

3. **Exponential Backoff**: Must implement the exact same retry logic (`intPow(errorCount, 4)`) for interoperability

4. **JSON Handling**: Argument serialization must be compatible with Ruby's JSON implementation

5. **Error Recovery**: Need to handle both application errors and database connection issues gracefully

6. **Performance**: Should aim for similar performance characteristics as the Go implementation

## Success Criteria

- [ ] Jobs enqueued in TypeScript can be processed by Ruby/Go workers
- [ ] Jobs enqueued in Ruby/Go can be processed by TypeScript workers
- [ ] No job loss or duplicate processing under normal conditions
- [ ] Graceful handling of worker failures and database disconnections
- [ ] Performance comparable to existing implementations
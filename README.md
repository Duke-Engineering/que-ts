# que-ts

A TypeScript job queue library for PostgreSQL, compatible with Ruby Que and que-go implementations.

## Features

- **Cross-language compatibility**: Works with [Que (Ruby)](https://github.com/chanks/que) and [que-go](https://github.com/bgentry/que-go) job queues
- **PostgreSQL advisory locks**: Reliable job processing with no duplicate execution
- **TypeScript support**: Full type safety with comprehensive interfaces
- **Retry logic**: Exponential backoff for failed jobs
- **Multiple queues**: Support for named queues and priorities
- **Transaction support**: Enqueue jobs within existing database transactions

## Installation

```bash
npm install que-ts
```

## Quick Start

### Database Setup

#### Option 1: Using Docker (Recommended for Development)

```bash
# Start PostgreSQL with Docker
npm run docker:up

# Run tests
npm test

# Stop when done
npm run docker:down
```

For detailed Docker usage, see [DOCKER.md](DOCKER.md).

#### Option 2: Manual Database Setup

Create the required database table:

```sql
CREATE TABLE que_jobs (
    priority    smallint    NOT NULL DEFAULT 100,
    run_at      timestamptz NOT NULL DEFAULT now(),
    job_id      bigserial   NOT NULL,
    job_class   text        NOT NULL,
    args        json        NOT NULL DEFAULT '[]'::json,
    error_count integer     NOT NULL DEFAULT 0,
    last_error  text,
    queue       text        NOT NULL DEFAULT '',
    PRIMARY KEY (queue, priority, run_at, job_id)
);
```

### Basic Usage

```typescript
import { Client, Worker } from 'que-ts';

// Create a client
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'password'
});

// Enqueue jobs
await client.enqueue('SendEmail', ['user@example.com', 'Welcome!']);

await client.enqueue('ProcessPayment', [{ amount: 100, currency: 'USD' }], {
  priority: 10,
  runAt: new Date(Date.now() + 60000) // Run in 1 minute
});

// Create and start a worker
const worker = new Worker({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'password'
});

// Register job handlers
worker.register('SendEmail', async (job) => {
  const [email, message] = job.args;
  console.log(`Sending email to ${email}: ${message}`);
  // Email sending logic here
});

worker.register('ProcessPayment', async (job) => {
  const paymentData = job.args[0];
  console.log(`Processing payment of ${paymentData.amount} ${paymentData.currency}`);
  // Payment processing logic here
});

// Start processing jobs
await worker.work();

// Graceful shutdown
process.on('SIGINT', async () => {
  await worker.shutdown();
  await client.close();
});
```

## API Reference

### Client

#### Constructor

```typescript
new Client(config?: ClientConfig)
```

#### Methods

- `enqueue(jobClass: string, args?: any[], options?: EnqueueOptions): Promise<Job>`
- `enqueueInTx(client: PoolClient, jobClass: string, args?: any[], options?: EnqueueOptions): Promise<Job>`
- `lockJob(queue?: string): Promise<Job | null>`
- `close(): Promise<void>`

### Worker

#### Constructor

```typescript
new Worker(clientConfig?: ClientConfig, options?: WorkerOptions)
```

#### Methods

- `register(jobClass: string, workFunc: WorkFunction): void`
- `work(): Promise<void>`
- `workOne(): Promise<boolean>`
- `shutdown(): Promise<void>`

### Job

#### Properties

- `id: number`
- `queue: string`
- `priority: number`
- `runAt: Date`
- `jobClass: string`
- `args: any[]`
- `errorCount: number`
- `lastError?: string`

#### Methods

- `done(): Promise<void>`
- `delete(): Promise<void>`
- `error(errorMessage: string): Promise<void>`

## Configuration

### ClientConfig

```typescript
interface ClientConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
}
```

### WorkerOptions

```typescript
interface WorkerOptions {
  queue?: string;        // Queue name to process (default: '')
  interval?: number;     // Polling interval in ms (default: 5000)
  maxAttempts?: number;  // Max retry attempts (default: 5)
}
```

### EnqueueOptions

```typescript
interface EnqueueOptions {
  priority?: number;  // Job priority (lower = higher priority, default: 100)
  runAt?: Date;       // When to run the job (default: now)
  queue?: string;     // Queue name (default: '')
}
```

## Error Handling and Retries

Failed jobs are automatically retried with exponential backoff:

- 1st retry: after 1 second
- 2nd retry: after 16 seconds  
- 3rd retry: after 81 seconds
- 4th retry: after 256 seconds
- etc.

Jobs that exceed the maximum number of retries remain in the queue for manual inspection.

## Queues and Priorities

Jobs can be organized into named queues and assigned priorities:

```typescript
// High priority job in 'critical' queue
await client.enqueue('ProcessPayment', [paymentData], {
  queue: 'critical',
  priority: 1
});

// Low priority job in 'background' queue
await client.enqueue('SendNewsletter', [newsletterData], {
  queue: 'background', 
  priority: 500
});

// Worker processing only critical queue
const criticalWorker = new Worker(config, { queue: 'critical' });
```

## Cross-Language Compatibility

que-ts is designed to be fully compatible with:

- **[Ruby Que](https://github.com/chanks/que)** - The original Ruby implementation
- **[que-go](https://github.com/bgentry/que-go)** - Golang port (currently unmaintained)

You can enqueue jobs in one language and process them in another, or run workers in multiple languages simultaneously.

## Related Projects

### Official Implementations
- **[Que (Ruby)](https://github.com/chanks/que)** - The original and most mature implementation
- **[que-go](https://github.com/bgentry/que-go)** - Go implementation (unmaintained, but stable)
- **que-ts** - This TypeScript/Node.js implementation

## Development

### Using Docker (Recommended)

```bash
# Install dependencies
npm install

# Start PostgreSQL with Docker
npm run docker:up

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build
npm run build

# Lint
npm run lint

# Stop Docker containers
npm run docker:down
```

### Docker Commands

- `npm run docker:up` - Start PostgreSQL and Adminer
- `npm run docker:down` - Stop containers  
- `npm run docker:logs` - View PostgreSQL logs
- `npm run docker:clean` - Remove containers and volumes
- `npm run test:docker` - Full test cycle with Docker

Access database admin at http://localhost:8080 (user: `que_user`, password: `que_password`)

See [DOCKER.md](DOCKER.md) for detailed Docker documentation.

### Manual Setup

If you prefer not to use Docker, ensure PostgreSQL is running and create the database schema manually using `migrations/schema.sql`.

## License

MIT

import { Client, Worker } from '../src';

async function basicExample(): Promise<void> {
  const config = {
    host: 'localhost',
    port: 5432,
    database: 'que_db',
    user: 'postgres',
    password: 'password'
  };

  const client = new Client(config);

  await client.enqueue('SendEmail', ['user@example.com', 'Welcome!']);

  await client.enqueue('ProcessPayment', [{ amount: 100, currency: 'USD' }], {
    priority: 10,
    runAt: new Date(Date.now() + 60000)
  });

  const worker = new Worker(config);

  worker.register('SendEmail', async (job) => {
    console.log(`Sending email to ${job.args[0]}: ${job.args[1]}`);
  });

  worker.register('ProcessPayment', async (job) => {
    const paymentData = job.args[0];
    console.log(`Processing payment of ${paymentData['amount']} ${paymentData['currency']}`);
  });

  console.log('Starting worker...');
  await worker.work();

  process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await worker.shutdown();
    await client.close();
    process.exit(0);
  });
}

if (require.main === module) {
  basicExample().catch(console.error);
}

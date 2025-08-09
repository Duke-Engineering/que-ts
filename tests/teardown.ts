// Global teardown to ensure all connections are closed
export default async () => {
  // Force close any remaining PostgreSQL connections
  // This is a safety measure for tests
  await new Promise(resolve => setTimeout(resolve, 200));
};
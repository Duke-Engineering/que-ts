-- Additional initialization script for test database
-- This runs after the main schema.sql

-- Grant necessary permissions to the user
GRANT ALL PRIVILEGES ON DATABASE que_test TO que_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO que_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO que_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO que_user;

-- Ensure the user can create tables (needed for tests)
ALTER USER que_user CREATEDB;

-- Create additional indexes that might be useful for testing
CREATE INDEX IF NOT EXISTS que_jobs_run_at_idx ON que_jobs (run_at);
CREATE INDEX IF NOT EXISTS que_jobs_error_count_idx ON que_jobs (error_count);

-- Insert some test data for development (optional)
-- INSERT INTO que_jobs (job_class, args, priority, queue) 
-- VALUES 
--   ('TestJob', '["test", "data"]', 100, 'test'),
--   ('AnotherTestJob', '["more", "test", "data"]', 200, 'background');

-- Show some info about the setup
SELECT 'Database initialization complete' as status;
SELECT version() as postgresql_version;
SELECT current_database() as database_name;
SELECT current_user as current_user;
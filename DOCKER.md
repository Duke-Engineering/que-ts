# Docker Development Setup

This document explains how to use Docker for development and testing with que-ts.

## Quick Start

### 1. Start the Database

```bash
npm run docker:up
```

This will start:
- PostgreSQL 15 on port 5432
- Adminer (database admin UI) on port 8080

### 2. Run Tests

```bash
npm test
```

Or run tests with Docker lifecycle management:

```bash
npm run test:docker
```

### 3. Access Database Admin

Open http://localhost:8080 in your browser to access Adminer.

**Login credentials:**
- System: PostgreSQL
- Server: postgres
- Username: que_user
- Password: que_password
- Database: que_test

## Docker Commands

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start PostgreSQL and Adminer containers |
| `npm run docker:down` | Stop containers |
| `npm run docker:logs` | View PostgreSQL logs |
| `npm run docker:clean` | Stop containers and remove volumes |
| `npm run docker:reset` | Clean and restart containers |
| `npm run test:docker` | Run full test cycle with Docker |

## Environment Configuration

The Docker setup uses these environment variables (defined in `.env.test`):

```env
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=que_test
TEST_DB_USER=que_user
TEST_DB_PASSWORD=que_password
TEST_DB_SSL=false
```

## Database Schema

The database schema is automatically initialized when the container starts using:
- `migrations/schema.sql` - Main que_jobs table
- `docker/init-test-db.sql` - Additional setup and permissions

## Troubleshooting

### Container won't start
```bash
npm run docker:clean
npm run docker:up
```

### Connection refused
Wait a few seconds for PostgreSQL to fully initialize:
```bash
npm run docker:logs
```
Look for "database system is ready to accept connections"

### Permission denied
The init script grants necessary permissions, but if issues persist:
```bash
npm run docker:reset
```

### Tests fail with connection errors
Ensure the database is healthy:
```bash
docker-compose ps
```

Both containers should show "Up" and postgres should show "(healthy)".

## Development Workflow

### Daily Development
1. `npm run docker:up` - Start database
2. `npm run dev` - Start TypeScript compiler in watch mode
3. `npm run test:watch` - Run tests in watch mode
4. `npm run docker:down` - Stop when done

### Testing Changes
1. `npm run test:docker` - Full test cycle with clean database
2. Or manually: `npm run docker:reset && npm test`

### Debugging Database Issues
1. `npm run docker:logs` - Check PostgreSQL logs
2. Access Adminer at http://localhost:8080
3. Run manual queries to inspect job state

## Production Considerations

This Docker setup is for **development and testing only**. For production:

1. Use a managed PostgreSQL service
2. Set proper environment variables
3. Use connection pooling configuration
4. Configure SSL/TLS
5. Set up monitoring and backups

## Docker Compose Details

The setup includes:

### PostgreSQL Container
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Database**: que_test
- **User**: que_user / que_password
- **Volume**: Persistent data storage
- **Health checks**: Ensures database is ready

### Adminer Container
- **Image**: adminer:latest
- **Port**: 8080
- **Purpose**: Database administration UI
- **Auto-configured**: Connects to PostgreSQL container
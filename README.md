# example-three-tier-application

A reference implementation of a three-tier web application: a Next.js frontend, an Express REST API, and a PostgreSQL database. It runs locally with Docker Compose and deploys to Google Cloud Platform (Cloud Run + Cloud SQL) via Terraform.

## Architecture

```
Browser → Web (Next.js :3000) → API (Express :3001) → PostgreSQL
```

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 16, React 19, Tailwind CSS | `src/web/` |
| API | Express 5, Node.js 22 | `src/api/` |
| Database | PostgreSQL 17 | managed by Docker / Cloud SQL |
| Migrations | node-pg-migrate | `src/db/` |
| Infrastructure | Terraform (GCP) | `src/infrastructure/` |

The app is a simple task manager (to-do list) that demonstrates how the three tiers communicate.

## Local Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)
  - Ensure Docker daemon is running before starting the stack
  - Verify installation: `docker --version` and `docker compose version`
- Git (to clone the repository)
- At least 4 GB of available disk space for Docker images and volumes

### Clone and navigate to the repository

```bash
git clone https://github.com/hoehnebwwt/example-three-tier-application.git
cd example-three-tier-application
```

### Environment configuration

The application uses sensible defaults for local development. No `.env` file is required to start, but you can customize behavior:

**For the API** (`src/api/`):
- `PORT` — API server port (default: 3001, internal only)
- `DATABASE_URL` — PostgreSQL connection string (default: `postgres://app:app@postgres:5432/app`)
- `NODE_ENV` — Set to `development` for verbose logging (default: `production`)

**For the web frontend** (`src/web/`):
- `PORT` — Next.js server port (default: 3000)
- `API_URL` — API endpoint URL (default: `http://api:3001` in Docker, `http://localhost:3001` for local Node.js)
- `NEXT_PUBLIC_API_URL` — Public API URL for browser requests (optional, defaults to relative paths)

**For the database** (`src/db/`):
- `DATABASE_URL` — PostgreSQL connection string (default: `postgres://app:app@postgres:5432/app`)

All services are configured in `docker-compose.yml` and inherit these defaults automatically.

### Start the stack

```bash
docker compose up --build
```

This starts four services in order:

1. **postgres** — PostgreSQL 17 database, waits until healthy
2. **migrate** — runs `node-pg-migrate up` to apply schema migrations, then exits
3. **api** — Express API on port 3001 (internal only)
4. **web** — Next.js frontend on port 3000 (exposed to host)

Once running, open [http://localhost:3000](http://localhost:3000).

### Verify the stack is running

```bash
# Check all services are healthy
docker compose ps

# View logs from all services
docker compose logs -f

# View logs from a specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres
```

### Stop and clean up

```bash
# Stop containers (keeps the postgres_data volume)
docker compose down

# Stop and delete all data
docker compose down -v
```

### Rebuild after code changes

```bash
docker compose up --build
```

To rebuild a specific service:

```bash
docker compose up --build api
docker compose up --build web
```

### Troubleshooting local setup

**Port already in use**
- If port 3000 or 3001 is already in use, modify `docker-compose.yml`:
  ```yaml
  ports:
    - "3001:3000"  # Host port 3001 → Container port 3000
  ```

**Database connection errors**
- Ensure the `postgres` service is healthy: `docker compose ps`
- Check database logs: `docker compose logs postgres`
- Verify `DATABASE_URL` matches the service configuration

**Migrations fail to run**
- Check migration logs: `docker compose logs migrate`
- Ensure all migration files in `src/db/migrations/` are valid JavaScript
- Manually run migrations: `docker compose exec api npx node-pg-migrate up`

**Frontend cannot reach API**
- Verify the API service is running: `docker compose ps api`
- Check API logs: `docker compose logs api`
- Ensure `API_URL` in `docker-compose.yml` is correct (should be `http://api:3001` inside Docker)

**Docker image build failures**
- Clear Docker cache: `docker system prune -a`
- Rebuild from scratch: `docker compose down -v && docker compose up --build`

### Running tests locally

Each tier has its own test suite:

```bash
# API tests
docker compose exec api npm test

# Web frontend tests
docker compose exec web npm test

# Run tests in watch mode
docker compose exec api npm test -- --watch
docker compose exec web npm test -- --watch
```

### API endpoints

The API is not exposed directly, but you can reach it through the web container or by temporarily mapping its port:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/tasks` | List all tasks |
| POST | `/tasks` | Create a task (`{ "title": "..." }`) |
| PATCH | `/tasks/:id` | Update a task (`{ "completed": true }` or `{ "title": "..." }`) |

## Project structure

```
src/
├── api/            # Express REST API
│   ├── index.js    # Route handlers
│   ├── db.js       # PostgreSQL connection pool
│   └── Dockerfile
├── db/             # Database migrations
│   ├── migrations/ # node-pg-migrate migration files
│   └── Dockerfile
├── web/            # Next.js frontend
│   ├── app/        # App Router pages and components
│   └── Dockerfile
└── infrastructure/ # Terraform for GCP deployment
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

## Deploying to GCP

The `src/infrastructure/` directory contains Terraform that provisions:

- VPC network and subnet
- Cloud SQL PostgreSQL 17 instance (private IP)
- Cloud Run services for the API and web frontend
- Secret Manager secret for the database URL
- Service accounts and IAM bindings

### Required variables

| Variable | Description |
|----------|-------------|
| `project_id` | GCP project ID |
| `api_image` | Container image URI for the API (e.g. `gcr.io/PROJECT/api:TAG`) |
| `web_image` | Container image URI for the web frontend |
| `region` | GCP region (default: `us-central1`) |
| `environment` | `dev`, `staging`, or `prod` (default: `dev`) |

```bash
cd src/infrastructure
terraform init
terraform apply -var="project_id=my-project" \
                -var="api_image=gcr.io/my-project/api:latest" \
                -var="web_image=gcr.io/my-project/web:latest"
```

After apply, `terraform output web_url` gives the public URL.

## Database migrations

Migrations live in `src/db/migrations/` and use [node-pg-migrate](https://salsita.github.io/node-pg-migrate/).

```bash
# Apply all pending migrations (run inside the db container or with DATABASE_URL set)
cd src/db
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate up

# Roll back the last migration
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate down
```

When running via Docker Compose the `migrate` service handles this automatically on startup.

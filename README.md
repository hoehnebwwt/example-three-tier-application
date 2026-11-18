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

## Quick Start

Get the app running in 30 seconds:

```bash
# Prerequisites: Docker Desktop installed
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

**That's it!** The stack starts automatically:
- PostgreSQL database
- Database migrations
- Express API (internal)
- Next.js frontend (exposed on port 3000)

To stop: `docker compose down`

To stop and delete all data: `docker compose down -v`

## Running locally with Docker Compose

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)

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

### API endpoints

The API is not exposed directly, but you can reach it through the web container or by temporarily mapping its port:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/tasks` | List all tasks |
| POST | `/tasks` | Create a task (`{ "title": "..." }`) |
| PATCH | `/tasks/:id` | Update a task (`{ "completed": true }` or `{ "title": "..." }`) |

## Development Workflow

### Making code changes

The three tiers can be modified independently:

#### Frontend (Next.js)
- Edit files in `src/web/app/`
- Changes hot-reload automatically (no rebuild needed)
- Restart the web container if hot-reload doesn't work: `docker compose restart web`

#### API (Express)
- Edit files in `src/api/`
- Restart the API container: `docker compose restart api`
- Or rebuild and restart: `docker compose up --build api`

#### Database schema
- Create a new migration file in `src/db/migrations/`
- Restart the stack: `docker compose down -v && docker compose up --build`
- This ensures migrations run fresh

### Rebuilding after changes

```bash
# Rebuild all services
docker compose up --build

# Rebuild just one service
docker compose up --build api
docker compose up --build web
```

### Resetting the database

```bash
# Stop and delete all data (including postgres_data volume)
docker compose down -v

# Start fresh
docker compose up --build
```

This is useful when you've made schema changes or want to start with a clean slate.

### Viewing logs

```bash
# View logs from all services
docker compose logs -f

# View logs from a specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres

# View logs from the last 100 lines
docker compose logs --tail=100 api
```

## Troubleshooting

### Port conflicts

**Problem:** `docker compose up` fails with "port 3000 already in use" or "port 3001 already in use"

**Solution:** Either stop the conflicting process or change the port mapping in `docker-compose.yml`:

```yaml
services:
  web:
    ports:
      - "3000:3000"  # Change first 3000 to something else, e.g., 3002:3000
  api:
    ports:
      - "3001:3001"  # Change first 3001 to something else, e.g., 3002:3001
```

Then restart: `docker compose up --build`

### Docker not running

**Problem:** `docker: command not found` or `Cannot connect to Docker daemon`

**Solution:** 
- Make sure Docker Desktop is installed and running
- On Linux, ensure the Docker daemon is started: `sudo systemctl start docker`
- Check Docker is working: `docker ps`

### Containers keep restarting

**Problem:** A service (e.g., `migrate` or `api`) keeps restarting

**Solution:** Check the logs to see what's failing:

```bash
docker compose logs migrate
docker compose logs api
```

Common causes:
- Database not ready yet (wait a few seconds and check again)
- Migration syntax error (check `src/db/migrations/`)
- API connection string wrong (check `docker-compose.yml` environment variables)

### Database connection errors

**Problem:** API logs show "connect ECONNREFUSED" or "password authentication failed"

**Solution:**
- Ensure postgres service is healthy: `docker compose ps` (should show `postgres` as "Up")
- Check the DATABASE_URL in `docker-compose.yml` matches the postgres credentials
- Reset the database: `docker compose down -v && docker compose up --build`

### Migrations not running

**Problem:** Schema changes aren't applied, or `migrate` service exits with an error

**Solution:**
- Check migration syntax: `docker compose logs migrate`
- Ensure migration files are in `src/db/migrations/` with correct naming (timestamp prefix)
- Manually run migrations: `docker compose exec postgres psql -U app -d app -c "SELECT * FROM pgmigrations;"`
- Reset and retry: `docker compose down -v && docker compose up --build`

### Web frontend shows blank page or 404

**Problem:** [http://localhost:3000](http://localhost:3000) shows nothing or "not found"

**Solution:**
- Check web service is running: `docker compose ps` (should show `web` as "Up")
- Check logs: `docker compose logs web`
- Restart the web service: `docker compose restart web`
- Hard refresh browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

## Environment Variables

Each service uses environment variables for configuration. These are defined in `docker-compose.yml` and can be overridden by creating a `.env` file in the project root.

### PostgreSQL (postgres service)

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `app` | Database user |
| `POSTGRES_PASSWORD` | `app` | Database password |
| `POSTGRES_DB` | `app` | Database name |
| `POSTGRES_INITDB_ARGS` | (none) | Extra init arguments |

### Database Migrations (migrate service)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://app:app@postgres:5432/app` | PostgreSQL connection string |

### API (api service)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://app:app@postgres:5432/app` | PostgreSQL connection string |
| `PORT` | `3001` | Port to listen on |
| `NODE_ENV` | `development` | Environment (development, production) |

### Web Frontend (web service)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://api:3001` | API base URL (internal Docker network) |

### Customizing environment variables

Create a `.env` file in the project root to override defaults:

```bash
# .env
POSTGRES_PASSWORD=my-secure-password
DATABASE_URL=postgres://app:my-secure-password@postgres:5432/app
```

Then restart: `docker compose down && docker compose up --build`

## Testing the API

The API is not exposed to the host by default (it only listens on the internal Docker network). Here are two ways to test it:

### Option 1: Test through the web frontend

The web frontend at [http://localhost:3000](http://localhost:3000) communicates with the API. Use the UI to create, read, and update tasks.

### Option 2: Temporarily expose the API port

Edit `docker-compose.yml` to expose the API port:

```yaml
services:
  api:
    ports:
      - "3001:3001"  # Add this line
```

Then restart: `docker compose up --build`

Now you can test the API directly with curl:

```bash
# Health check
curl http://localhost:3001/health

# List all tasks
curl http://localhost:3001/tasks

# Create a task
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries"}'

# Update a task (mark as completed)
curl -X PATCH http://localhost:3001/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Update a task (change title)
curl -X PATCH http://localhost:3001/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries and cook dinner"}'
```

### Viewing API responses

For prettier JSON output, pipe curl to `jq`:

```bash
curl http://localhost:3001/tasks | jq .
```

(Install jq: `brew install jq` on Mac, `apt-get install jq` on Linux, or `choco install jq` on Windows)

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

## Next Steps

Now that you have the app running, here are some things to try:

### For new developers
- **Explore the code:** Start with `src/web/app/page.tsx` to see how the frontend works, then check `src/api/index.js` to understand the API
- **Make a small change:** Edit the title in `src/web/app/page.tsx` and watch it update live
- **Add a feature:** Try adding a DELETE endpoint to the API and wire it to a delete button in the UI
- **Check the database:** Run `docker compose exec postgres psql -U app -d app` to explore the schema

### For AI-assisted development
- **Use Claude Code:** This project is designed to work well with AI agents. See [agents.md](agents.md) for detailed prompts and patterns
- **Suggested first task:** Ask Claude to "Explain how a task flows from the browser through the web tier, to the API, and into the database"
- **Add a feature with AI:** Try "Add a due_date column to the tasks table. Create the migration, update the API to accept and return it, and show it in the UI"

### For infrastructure
- **Deploy to GCP:** Follow the "Deploying to GCP" section above to push this app to production
- **Understand Terraform:** Check `src/infrastructure/main.tf` to see how the cloud resources are defined

### For learning
- **Three-tier architecture:** This app demonstrates the classic separation of concerns: frontend, API, database
- **Docker Compose:** See how services communicate and depend on each other
- **Node.js and PostgreSQL:** Both are production-ready and widely used

For more detailed guidance on working with this codebase, especially with AI agents, see [agents.md](agents.md).

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

### Environment variables (local)

When running with Docker Compose, these are set automatically:

| Variable | Value | Purpose |
|----------|-------|---------|
| `PORT` | `3001` (API), `3000` (web) | Service port |
| `API_URL` | `http://api:3001` | Web tier's API endpoint |
| `DATABASE_URL` | `postgres://app:app@postgres:5432/app` | Database connection string |

**Note:** Default database credentials are `app:app` (user:password). These are hardcoded in `docker-compose.yml` for local development only.

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
    ├── outputs.tf
    └── migration.tf
```

## Database migrations

Migrations live in `src/db/migrations/` and use [node-pg-migrate](https://salsita.github.io/node-pg-migrate/).

### Running migrations locally

```bash
# Apply all pending migrations (run inside the db container or with DATABASE_URL set)
cd src/db
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate up

# Roll back the last migration
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate down
```

When running via Docker Compose, the `migrate` service handles this automatically on startup.

### Creating a new migration

```bash
cd src/db
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate create <migration_name>
```

This creates a new migration file in `migrations/`. Edit it to define your schema changes, then run `docker compose up` to apply it.

**Important:** Migrations are append-only. Never edit an existing migration file; create a new one to make additional changes.

## Deploying to GCP

The `src/infrastructure/` directory contains Terraform that provisions:

- VPC network and subnet
- Cloud SQL PostgreSQL 17 instance (private IP)
- Cloud Run services for the API and web frontend
- Cloud Run Job for database migrations
- Secret Manager secret for the database URL
- Service accounts and IAM bindings

### Prerequisites for deployment

1. **GCP Project** — Create a project and enable these APIs:
   - Cloud Run
   - Cloud SQL Admin
   - Compute Engine
   - Secret Manager
   - Container Registry

2. **Workload Identity Federation** — Set up OIDC for GitHub Actions:
   - Create a service account for CI/CD
   - Configure Workload Identity Provider
   - Store these as GitHub secrets:
     - `GCP_WORKLOAD_IDENTITY_PROVIDER`
     - `GCP_SERVICE_ACCOUNT`
     - `GCP_PROJECT_ID`
     - `TF_STATE_BUCKET` (GCS bucket for Terraform state)

3. **Terraform State Bucket** — Create a GCS bucket to store Terraform state:
   ```bash
   gsutil mb gs://my-project-terraform-state
   ```

### Terraform variables

| Variable | Required | Description |
|----------|----------|-------------|
| `project_id` | Yes | GCP project ID |
| `api_image` | Yes | Container image URI for the API (e.g. `gcr.io/PROJECT/api:TAG`) |
| `web_image` | Yes | Container image URI for the web frontend |
| `db_image` | Yes | Container image URI for the migration job |
| `region` | No | GCP region (default: `us-central1`) |
| `environment` | No | `dev`, `staging`, or `prod` (default: `dev`) |
| `app_name` | No | Application name prefix (default: `todo`) |
| `db_tier` | No | Cloud SQL machine tier (default: `db-f1-micro`) |
| `api_max_instances` | No | Max Cloud Run instances for API (default: `10`) |
| `web_max_instances` | No | Max Cloud Run instances for web (default: `10`) |

### Manual deployment

```bash
cd src/infrastructure
terraform init -backend-config="bucket=my-project-terraform-state" \
                -backend-config="prefix=terraform/dev"

terraform plan \
  -var="project_id=my-project" \
  -var="api_image=gcr.io/my-project/api:latest" \
  -var="web_image=gcr.io/my-project/web:latest" \
  -var="db_image=gcr.io/my-project/db:latest"

terraform apply
```

After apply, get the public URL:
```bash
terraform output web_url
```

## CI/CD Pipeline

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automates deployment to GCP.

### Workflow stages

1. **Build & Push Images** — Builds Docker images for API, web, and migrations, pushes to Google Container Registry
2. **Terraform Apply** — Provisions/updates GCP infrastructure
3. **Run DB Migrations** — Executes the migration Cloud Run Job to apply schema changes

### Triggering deployments

**Automatic (on push to main):**
```bash
git push origin main
```
Deploys to the `dev` environment.

**Manual (via GitHub UI):**
1. Go to Actions → Deploy
2. Click "Run workflow"
3. Select target environment: `dev`, `staging`, or `prod`

### Required GitHub secrets

Set these in your repository settings (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider resource name |
| `GCP_SERVICE_ACCOUNT` | Service account email for CI/CD |
| `GCP_PROJECT_ID` | GCP project ID |
| `TF_STATE_BUCKET` | GCS bucket name for Terraform state |

### Environment-specific configuration

The workflow uses GitHub Environments to manage secrets per environment. Create environments in Settings → Environments:

- `dev` — Development environment
- `staging` — Staging environment
- `prod` — Production environment

Each environment can have its own secrets (e.g., different `GCP_PROJECT_ID` for prod).

## Production database migrations

In production, migrations run as a Cloud Run Job triggered by the CI/CD pipeline:

1. The `build` job builds the `db` image (contains `node-pg-migrate`)
2. The `infrastructure` job provisions the Cloud Run Job resource
3. The `migrate` job executes the Cloud Run Job, which connects to Cloud SQL and runs pending migrations

The migration job:
- Reads `DATABASE_URL` from Secret Manager
- Runs `node-pg-migrate up`
- Exits with status 0 on success, non-zero on failure
- Logs are available in Cloud Logging

## Working with AI Agents

This repository includes `agents.md`, a guide for using Claude Code and other AI tools to develop on this codebase. It covers:

- How to structure prompts for AI-assisted development
- Suggested prompts for common tasks (adding features, debugging, etc.)
- Best practices for three-tier application development
- Project-specific conventions

See [agents.md](./agents.md) for details.

## Troubleshooting

### Docker Compose issues

**Problem:** `migrate` service keeps restarting
- Check that `postgres` is healthy: `docker compose logs postgres`
- Verify `DATABASE_URL` is correct in `docker-compose.yml`
- Check migration files for syntax errors: `docker compose logs migrate`

**Problem:** API can't connect to database
- Ensure `postgres` service is running: `docker compose ps`
- Verify `DATABASE_URL` in the `api` service matches the `postgres` service
- Check database logs: `docker compose logs postgres`

**Problem:** Web frontend shows "API connection failed"
- Verify `API_URL` is set correctly in the `web` service (should be `http://api:3001`)
- Check that `api` service is running: `docker compose ps`
- View API logs: `docker compose logs api`

### GCP deployment issues

**Problem:** Terraform init fails
- Verify the GCS bucket exists: `gsutil ls gs://my-bucket`
- Check service account has `storage.buckets.get` permission
- Ensure `TF_STATE_BUCKET` secret is set correctly

**Problem:** Cloud Run deployment fails
- Check that container images were pushed to GCR: `gcloud container images list`
- Verify service account has `run.services.create` permission
- View deployment logs: `gcloud run services describe <service-name> --region us-central1`

**Problem:** Database migrations fail in production
- Check Cloud Run Job logs: `gcloud run jobs describe <job-name> --region us-central1`
- Verify `DATABASE_URL` secret exists in Secret Manager
- Ensure Cloud SQL instance is running and accessible

### Database issues

**Problem:** "too many connections" error
- Reduce `max_instances` in Terraform variables
- Check for connection leaks in API code
- Increase Cloud SQL instance tier

**Problem:** Migration fails with "relation already exists"
- Check if migration was already applied: `docker compose exec postgres psql -U app -d app -c "\dt"`
- Verify migration files haven't been edited (they should be append-only)

## Development tips

- **One tier at a time** — When adding features, implement the database schema first, then the API, then the UI
- **Test locally first** — Always test with `docker compose up` before pushing to CI/CD
- **Use environment variables** — Never hardcode configuration; use env vars for all external dependencies
- **Keep migrations clean** — Each migration should be a single logical change; don't mix schema and data changes
- **Check logs early** — When something breaks, check `docker compose logs <service>` first

## License

MIT

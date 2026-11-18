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

## CI/CD and Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automates the build and deployment process.

### Workflow overview

The workflow is triggered on:
- **Push to `main` branch** — automatically deploys to the `dev` environment
- **Manual dispatch** — allows you to select a target environment (`dev`, `staging`, or `prod`)

### Workflow steps

1. **Build & Push Images** — Builds Docker images for the API, web frontend, and database migrations, then pushes them to Google Container Registry (GCR)
2. **Terraform Apply** — Provisions or updates GCP infrastructure (Cloud Run services, Cloud SQL, networking, etc.)
3. **Run DB Migrations** — Executes pending database migrations on the deployed Cloud SQL instance

Each step depends on the previous one, ensuring infrastructure is ready before migrations run.

## GCP Setup

To deploy this application to GCP, you need to set up the following prerequisites:

### 1. Create a GCP Project

```bash
gcloud projects create my-project --name="My Project"
gcloud config set project my-project
```

Enable required APIs:

```bash
gcloud services enable \
  compute.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  containerregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  sts.googleapis.com
```

### 2. Set up Workload Identity Federation

Workload Identity Federation allows GitHub Actions to authenticate to GCP without storing long-lived credentials.

```bash
# Create a Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="my-project" \
  --location="global" \
  --display-name="GitHub Actions"

# Create a Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="my-project" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,assertion.aud=assertion.aud,assertion.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get the Workload Identity Provider resource name
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="my-project" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

### 3. Create a Terraform State Bucket

```bash
gsutil mb gs://my-project-terraform-state
gsutil versioning set on gs://my-project-terraform-state
```

### 4. Create a Service Account

```bash
gcloud iam service-accounts create github-actions \
  --project="my-project" \
  --display-name="GitHub Actions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:github-actions@my-project.iam.gserviceaccount.com" \
  --role="roles/editor"

# Allow the GitHub Actions workflow to impersonate this service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@my-project.iam.gserviceaccount.com \
  --project="my-project" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/hoehnebwwt/example-three-tier-application"
```

Replace `PROJECT_NUMBER` with your GCP project number and update the repository path as needed.

## GitHub Secrets

Configure the following secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

| Secret | Description | Example |
|--------|-------------|---------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | The Workload Identity Provider resource name from step 2 above | `projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | The service account email | `github-actions@my-project.iam.gserviceaccount.com` |
| `GCP_PROJECT_ID` | Your GCP project ID | `my-project` |
| `TF_STATE_BUCKET` | The Terraform state bucket name (without `gs://` prefix) | `my-project-terraform-state` |

These secrets are used by the GitHub Actions workflow to authenticate to GCP and manage infrastructure.

## Environment Variables

The application uses environment variables to configure behavior across all three tiers. These are set in `docker-compose.yml` for local development and passed to Cloud Run services during deployment.

| Variable | Description | Used by | Example |
|----------|-------------|---------|---------|
| `PORT` | HTTP server port | API, Web | `3001` (API), `3000` (Web) |
| `DATABASE_URL` | PostgreSQL connection string | API, Migrations | `postgres://app:app@postgres:5432/app` |
| `API_URL` | Base URL for API requests | Web | `http://api:3001` (local), `https://api.example.com` (production) |

### Local development

In `docker-compose.yml`, these variables are set per service:

- **API**: `PORT=3001`, `DATABASE_URL=postgres://app:app@postgres:5432/app`
- **Web**: `PORT=3000`, `API_URL=http://api:3001`
- **Migrations**: `DATABASE_URL=postgres://app:app@postgres:5432/app`

### Production (GCP)

During Terraform deployment, these variables are passed to Cloud Run services via the `--set-env-vars` flag. The `DATABASE_URL` is stored in Secret Manager and injected securely.

## Testing

Testing guidance and best practices for this repository are documented in [`agents.md`](./agents.md). This includes:

- How to use Claude Code to understand and test the codebase
- Suggested prompts for running tests and debugging
- Tips for testing each tier independently
- Database migration testing strategies

Refer to [`agents.md`](./agents.md) for detailed testing workflows and examples.

## Working with AI Agents

This repository is designed to work well with AI-assisted development tools like [Claude Code](https://claude.ai/code).

For comprehensive guidance on using Claude Code with this codebase, including:

- Getting started with Claude Code
- Suggested prompts for common tasks (adding features, debugging, refactoring)
- Best practices for three-tier application development
- Project-specific conventions and patterns

See [`agents.md`](./agents.md) for detailed instructions and examples.

## License

This project is licensed under the terms specified in the [`LICENSE`](./LICENSE) file.

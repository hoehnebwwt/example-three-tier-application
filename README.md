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

## Environment Variables

The application uses environment variables for configuration. See [.env.example](.env.example) for a template.

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `DATABASE_URL` | api, migrate | `postgres://app:app@localhost:5432/app` | PostgreSQL connection string |
| `PORT` | api | `3001` | Port for the Express API server |
| `PORT` | web | `3000` | Port for the Next.js frontend server |
| `API_URL` | web | `http://api:3001` | URL for the API (used by frontend to make requests) |

When running locally with Docker Compose, these are set in `docker-compose.yml`. For local development outside Docker, copy `.env.example` to `.env` and adjust as needed.

## Development

### Running tests

The project includes test scripts in each service's `package.json`:

```bash
# API tests
cd src/api
npm test

# Web tests
cd src/web
npm test

# Database migration tests
cd src/db
npm test
```

Currently, test frameworks are not configured. To add testing:
- **API**: Consider Jest or Mocha for Express endpoint testing
- **Web**: Consider Jest or Vitest for React component testing
- **Database**: Consider pg-test or similar for migration validation

### Viewing logs from individual services

When running `docker compose up`, logs from all services are streamed to stdout. To view logs from a specific service:

```bash
# View logs from the API service
docker compose logs api

# View logs from the web service
docker compose logs web

# View logs from the database
docker compose logs postgres

# Follow logs in real-time
docker compose logs -f api

# View logs from the last 100 lines
docker compose logs --tail=100 api
```

### Accessing the database directly

To connect to the PostgreSQL database directly:

```bash
# Using psql inside the container
docker compose exec postgres psql -U app -d app

# Common queries
# List all tables
\dt

# View tasks table
SELECT * FROM tasks;

# View schema
\d tasks
```

Alternatively, use a database client like [pgAdmin](https://www.pgadmin.org/) or [DBeaver](https://dbeaver.io/):
- **Host**: `localhost`
- **Port**: `5432`
- **Username**: `app`
- **Password**: `app`
- **Database**: `app`

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

## Troubleshooting

### Port conflicts

If you see errors like `bind: address already in use`, another process is using one of the required ports:

- **Port 3000** (web frontend): Check `lsof -i :3000` and kill the process, or change `docker-compose.yml` to map to a different port (e.g., `3002:3000`)
- **Port 3001** (API): The API is internal to Docker by default, but if you expose it, check `lsof -i :3001`
- **Port 5432** (PostgreSQL): Check `lsof -i :5432` and kill the process, or stop other PostgreSQL instances

### Docker not running

If you see `Cannot connect to the Docker daemon`:

1. Ensure Docker Desktop is running (macOS/Windows) or Docker Engine is started (Linux)
2. On Linux, you may need to add your user to the docker group: `sudo usermod -aG docker $USER`
3. Verify Docker is working: `docker ps`

### Database connection errors

If the API or migrate service fails with connection errors:

1. **Check the postgres service is healthy**: `docker compose ps` should show `postgres` with status `healthy`
2. **Verify DATABASE_URL**: Ensure it matches the credentials in `docker-compose.yml` (default: `postgres://app:app@postgres:5432/app`)
3. **Check network connectivity**: Run `docker compose exec api ping postgres` to verify the API can reach the database
4. **View postgres logs**: `docker compose logs postgres` for detailed error messages

### Migration failures

If the `migrate` service fails:

1. **Check migration syntax**: Review the migration file in `src/db/migrations/` for SQL errors
2. **View migration logs**: `docker compose logs migrate` to see the exact error
3. **Verify database state**: Connect to the database and check if partial migrations were applied
4. **Rollback if needed**: `docker compose exec migrate npx node-pg-migrate down` to undo the last migration
5. **Rebuild and retry**: `docker compose down -v && docker compose up --build` to start fresh

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions! For AI-assisted development using Claude Code, see [agents.md](agents.md) for detailed guidance on working with this codebase.

To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes and test them locally with `docker compose up --build`
4. Commit your changes with clear messages
5. Push to your fork and open a pull request

## Additional Resources

- **[agents.md](agents.md)** — Guide for AI-assisted development with Claude Code, including suggested prompts and best practices
- **[Terraform documentation](src/infrastructure/)** — Infrastructure as code for GCP deployment
- **[node-pg-migrate docs](https://salsita.github.io/node-pg-migrate/)** — Database migration tool documentation
- **[Express documentation](https://expressjs.com/)** — API framework
- **[Next.js documentation](https://nextjs.org/docs)** — Frontend framework
- **[PostgreSQL documentation](https://www.postgresql.org/docs/)** — Database documentation

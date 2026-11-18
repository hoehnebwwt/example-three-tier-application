# Working with AI Agents on this repo

This guide covers how to use AI agents effectively with this codebase, and general patterns for AI-assisted development on three-tier applications.

## Getting started with Claude Code

Claude Code is a CLI tool that can read your codebase, run commands, edit files, and reason about multi-file changes. Install it and open this repo:

```bash
npm install -g @anthropic-ai/claude-code
cd example-three-tier-application
claude
```

Claude Code reads the project structure automatically. It works best when you give it specific, scoped tasks rather than broad ones.

## Working with Devin

Devin is an autonomous AI agent that can handle complex, multi-step tasks across the entire codebase. Here's how to work effectively with Devin on this three-tier application:

### Starting a Devin session

When you open this repository in Devin, it will automatically:
- Analyze the project structure (frontend, API, database, infrastructure)
- Understand the Docker Compose setup
- Identify the tech stack (Next.js, Express, PostgreSQL, Terraform)

### Effective prompts for Devin

Devin excels at end-to-end tasks that span multiple files and services. Give it clear acceptance criteria:

#### Full-stack feature development

```
Add a "priority" field to tasks:
1. Create a database migration that adds a priority column (integer, default 0) to the tasks table
2. Update the API to accept priority in POST /tasks and return it in GET /tasks and PATCH /tasks/:id
3. Update the frontend to show a priority selector when creating/editing tasks
4. Test the full flow end-to-end with docker compose up

Acceptance criteria:
- Migration applies cleanly
- API returns 422 if priority is not an integer
- Frontend displays priority in the task list
- Can create and update tasks with different priorities
```

#### Bug fixes across tiers

```
The task list doesn't update immediately after creating a new task. Debug and fix:
1. Check the frontend's POST /tasks call and response handling
2. Verify the API returns the created task with all fields
3. Check if there's a caching issue in the Next.js frontend
4. Test with docker compose up and verify the fix works

Acceptance criteria:
- New tasks appear in the list immediately after creation
- No console errors in the browser
- No errors in the API logs
```

#### Infrastructure and deployment

```
Set up a GitHub Actions workflow that:
1. Builds and pushes Docker images to GCP Container Registry
2. Runs the test suite
3. Deploys to Cloud Run using the Terraform configuration

Acceptance criteria:
- Workflow triggers on push to main
- Images are tagged with the git commit SHA
- Deployment only happens if tests pass
- The workflow file is in .github/workflows/
```

#### Database schema changes

```
Add user authentication to the app:
1. Create migrations for a users table and update tasks to have a user_id foreign key
2. Add login/signup endpoints to the API
3. Update the frontend to show a login page and store the auth token
4. Protect the /tasks endpoints to only return tasks for the logged-in user

Acceptance criteria:
- Migrations are append-only (no edits to existing files)
- API returns 401 for unauthenticated requests
- Frontend redirects to login if not authenticated
- Each user only sees their own tasks
- docker compose up works end-to-end
```

### Tips for working with Devin on this repo

#### 1. Provide the full context upfront
Instead of:
> "Add a delete button"

Try:
> "Add a DELETE /tasks/:id endpoint to the API that returns 404 if the task doesn't exist. Wire it up to a delete button in the frontend that shows a confirmation dialog. Test it with docker compose up."

Devin can explore the codebase, but explicit requirements prevent misunderstandings.

#### 2. Ask Devin to verify its work
After Devin makes changes, ask it to:
```
Run docker compose up and verify:
1. The app starts without errors
2. You can create a task
3. You can update a task
4. The new feature works as expected
```

#### 3. Use Devin for refactoring and cleanup
Devin can handle large refactors across multiple files:
```
Refactor the API to use async/await instead of .then() chains. 
Ensure all error handling still works and the app runs without errors.
```

#### 4. Let Devin write tests
```
Write integration tests for the POST /tasks endpoint that verify:
1. A valid task is created and returned with an id
2. Missing title returns 422
3. Title longer than 200 characters returns 422
4. The task appears in GET /tasks
```

#### 5. Ask for explanations before risky changes
```
Before making any changes, explain your plan for:
1. What files you'll modify
2. What migrations you'll create
3. How you'll test the changes
4. Any breaking changes or data loss risks
```

### Devin's strengths on this codebase

- **Multi-file coordination** — Devin can update the database schema, API, and frontend in one session
- **Docker debugging** — Devin can run `docker compose up`, read logs, and fix issues
- **Terraform changes** — Devin can modify infrastructure code and explain the impact
- **End-to-end testing** — Devin can verify changes work across all three tiers
- **Migration safety** — Devin understands the append-only migration pattern and won't break it

### Devin's limitations on this repo

- **No network access** — Devin can't deploy to GCP or push to registries (but can generate the commands)
- **No secrets** — Don't ask Devin to handle real API keys or database passwords
- **Local Docker only** — Devin can test locally but can't access remote environments
- **Manual deployment** — After Devin prepares changes, you'll need to manually deploy to production

## Suggested prompts for common tasks

### Understanding the codebase

```
Explain how a task flows from the browser through the web tier, to the API, and into the database.
```

```
What tables exist in the database and what are their schemas?
```

```
Walk me through what happens when docker compose up runs, in order.
```

### Adding features

```
Add a DELETE /tasks/:id endpoint to the API and wire it up to a delete button in the frontend.
```

```
Add a due_date column to the tasks table. Create the migration, update the API to accept and return it, and show it in the UI.
```

```
Add input validation to the POST /tasks endpoint so that titles longer than 200 characters are rejected with a 422 status.
```

### Database migrations

```
Create a node-pg-migrate migration that adds a priority column (integer, default 0) to the tasks table.
```

```
Show me all the migrations that have been applied and what schema they created.
```

### Docker and infrastructure

```
The migrate service keeps restarting. Read the Dockerfile and docker-compose.yml and tell me why.
```

```
Add a .env.example file documenting all environment variables used across the three services.
```

```
Explain the Terraform in src/infrastructure/ and what GCP resources it creates.
```

### Code review and cleanup

```
Review the API's error handling. Are there cases where the server could crash or return an unhelpful error?
```

```
Is there any N+1 query risk in the API? Check all database calls.
```

## General AI-assisted development tips

### Give context, not just a command

Instead of:
> "Fix the bug"

Try:
> "The PATCH /tasks/:id endpoint returns 200 even when the id doesn't exist. Fix it to return 404."

Claude Code can find the relevant file, but telling it which endpoint and what the expected behavior is saves a round-trip.

### Scope changes to one tier at a time

Three-tier apps have a natural seam at each layer boundary. When adding a feature, ask Claude to do one layer at a time and verify each before moving on:

1. Migration first — get the schema right
2. API next — add the endpoint and test it with curl
3. Frontend last — wire up the UI

### Let Claude run the app

Claude Code can execute `docker compose up` and observe logs. If something breaks at runtime, you can ask:

```
Run docker compose up and tell me what errors appear in the logs.
```

### Use it to write one-off scripts

For tasks like seeding data or inspecting the database:

```
Write a script that seeds the tasks table with 10 sample tasks using the API's POST /tasks endpoint.
```

### Ask for explanations before changes

Before a risky change (schema migration, refactor), ask Claude to explain what it plans to do:

```
Before you make any changes, explain your plan for adding user authentication to this app.
```

## Project-specific conventions

- **Migrations are append-only** — never edit an existing migration file; create a new one.
- **The API is internal** — it's not exposed outside the Docker network; all external traffic goes through the web tier.
- **Environment variables are the config boundary** — connection strings, ports, and URLs are all passed via env vars. No hardcoded values.
- **Node 22 / PostgreSQL 17** — match these versions in any new Dockerfiles or dependencies.

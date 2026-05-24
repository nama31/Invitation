.PHONY: up down migrate seed logs prod-up shell-backend shell-frontend

## ── Development ────────────────────────────────────────────────────────────

# Build images and start all services in detached mode
up:
	docker compose up -d --build

# Stop and remove containers (keeps volumes)
down:
	docker compose down

# Run Alembic migrations inside the running backend container
migrate:
	docker compose exec backend alembic upgrade head

# Run the database seed script
seed:
	docker compose exec backend python -m app.seed

# Tail logs from all services
logs:
	docker compose logs -f

## ── Production ─────────────────────────────────────────────────────────────

# Build and start production stack (compose override)
prod-up:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Stop production stack
prod-down:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Tail production logs
prod-logs:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Run migrations in production
prod-migrate:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend alembic upgrade head

## ── Utilities ───────────────────────────────────────────────────────────────

# Open a bash shell in the backend container
shell-backend:
	docker compose exec backend bash

# Open a shell in the frontend container
shell-frontend:
	docker compose exec frontend sh

# Generate a new Alembic migration (usage: make revision MSG="add foo table")
revision:
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

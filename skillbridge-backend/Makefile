.PHONY: dev db\:migrate db\:generate db\:revert infra\:up infra\:down

# Start Docker Compose services (Postgres, Redis, RabbitMQ) + NestJS dev server
dev:
	docker compose up -d
	npm run start:dev

# Run pending TypeORM migrations
db\:migrate:
	npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts

# Generate a new TypeORM migration (pass name= for the migration name)
db\:generate:
	npx typeorm-ts-node-commonjs migration:generate src/database/migrations/$(name) -d src/database/data-source.ts

# Revert last migration
db\:revert:
	npm run typeorm migration:revert -- -d dist/config/database.config.js

# Start only infrastructure services
infra\:up:
	docker compose up -d postgres redis rabbitmq

# Stop all infrastructure services
infra\:down:
	docker compose down

# Remove all volumes (DANGER: deletes all local data)
infra\:clean:
	docker compose down -v

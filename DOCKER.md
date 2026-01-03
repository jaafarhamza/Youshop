# Docker Setup Guide

## Quick Start

### Development Mode (with hot reload)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production Mode

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Services

### PostgreSQL
- **Port**: 5432
- **Database**: youshop
- **User**: postgres
- **Password**: postgres (dev) / from env (prod)

### Redis
- **Port**: 6379
- **Use**: Caching, session storage

### NestJS App
- **Port**: 3000
- **Hot Reload**: Enabled in dev mode
- **API Docs**: http://localhost:3000/api/docs

## Database Migrations

### Inside Docker Container

```bash
# Run migrations
docker-compose exec app npx prisma migrate dev

# Generate Prisma Client
docker-compose exec app npx prisma generate

# Seed database
docker-compose exec app npm run seed
```

### From Host Machine

```bash
# Set DATABASE_URL for Docker
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/youshop?schema=public"

# Run migrations
npx prisma migrate dev

# Generate client
npx prisma generate
```

## Volume Management

### Persistent Data
- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis persistence

### Development Volumes
- `.:/app`: Source code (hot reload)
- `/app/node_modules`: Isolated node_modules

## Environment Variables

### Development (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/youshop
JWT_SECRET=dev-secret
```

### Production (docker-compose.prod.yml)
All secrets must be provided via environment variables:
- `DATABASE_URL`
- `JWT_SECRET`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

## Dockerfile Stages

### 1. Builder
- Installs dependencies
- Generates Prisma Client
- Builds TypeScript

### 2. Production
- Minimal image (~150MB)
- Only production dependencies
- Optimized for deployment

### 3. Development
- Full dependencies
- Hot reload enabled
- Debugging tools available

## Health Checks

All services have health checks:
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`
- **App**: Waits for DB and Redis

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 5432
netstat -ano | findstr :5432

# Kill process or change port in docker-compose.yml
```

### Database Connection Failed
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify health
docker-compose ps
```

### Hot Reload Not Working
```bash
# Rebuild without cache
docker-compose build --no-cache app

# Restart service
docker-compose restart app
```

## Best Practices

1. **Never commit .env files**
2. **Use .env.example for documentation**
3. **Rotate JWT_SECRET in production**
4. **Use strong PostgreSQL passwords**
5. **Enable SSL for production databases**
6. **Regular backups of postgres_data volume**

## Production Deployment

```bash
# Build optimized image
docker build --target production -t youshop:latest .

# Tag for registry
docker tag youshop:latest registry.example.com/youshop:latest

# Push to registry
docker push registry.example.com/youshop:latest

# Deploy with secrets
docker-compose -f docker-compose.prod.yml up -d
```

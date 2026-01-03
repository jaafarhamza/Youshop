# Logging & Process Management

## Winston Logging

### Configuration
- **Development**: Pretty-printed colored logs to console
- **Production**: Structured JSON logs to console and files
- **Log Levels**: error, warn, info, debug, verbose
- **Log Files**:
  - `logs/error.log` - Error logs only
  - `logs/combined.log` - All logs
  - `logs/exceptions.log` - Uncaught exceptions
  - `logs/rejections.log` - Unhandled promise rejections
- **Rotation**: 5MB max file size, 5 files retained

### Usage in Services
```typescript
import { CustomLoggerService } from './common/logger/logger.service';

constructor(private readonly logger: CustomLoggerService) {}

// Basic logging
this.logger.log('User created', 'AuthService');
this.logger.error('Failed to create user', trace, 'AuthService');

// Structured event logging
this.logger.logEvent('user.created', { userId, email });

// Error logging with stack trace
this.logger.logError(error, 'AuthService');
```

## PM2 Process Management

### Production Deployment
```bash
# Build the application
npm run build

# Start with PM2
npm run start:pm2

# Monitor processes
npm run monit:pm2

# View logs
npm run logs:pm2

# Restart
npm run restart:pm2

# Stop
npm run stop:pm2
```

### PM2 Features Enabled
- **Cluster Mode**: Auto-scales to CPU cores (configurable via PM2_INSTANCES env)
- **Auto-restart**: Restarts on crashes (max 10 restarts)
- **Memory Limit**: 1GB per instance
- **Health Checks**: Ready signal sent to PM2
- **Log Management**: Separate error/out logs with rotation
- **Graceful Shutdown**: 5s kill timeout

### PM2 Commands
```bash
# Status
pm2 status

# Detailed info
pm2 show youshop-api

# Real-time monitoring
pm2 monit

# Logs
pm2 logs youshop-api --lines 100

# Reload (zero-downtime)
pm2 reload youshop-api

# Scale instances
pm2 scale youshop-api 4
```

### Log Rotation
PM2 log rotation is configured in `pm2-logrotate.json`:
- Max size: 10MB per file
- Retain: 10 files
- Compression: Enabled
- Daily rotation at midnight

Install PM2 log rotation module:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
```

## Health Check Endpoint
- **URL**: `GET /health`
- **Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "memory": {
    "rss": 123456789,
    "heapTotal": 123456789,
    "heapUsed": 123456789,
    "external": 123456789
  }
}
```

## Environment Variables
```env
NODE_ENV=production  # Switches to JSON logging
PORT=3000
PM2_INSTANCES=max    # Number of PM2 instances (max = CPU cores)
```

## Docker Integration
Winston logs are written to stdout/stderr and files. In Docker:
- Console logs captured by Docker
- File logs persisted in `logs/` directory
- Mount logs volume for persistence

## Best Practices
1. Use structured logging with context
2. Log errors with stack traces
3. Monitor PM2 metrics in production
4. Set up log aggregation (ELK, CloudWatch, etc.)
5. Configure alerts on error rates
6. Use health checks for load balancers
7. Enable PM2 monitoring dashboard for production

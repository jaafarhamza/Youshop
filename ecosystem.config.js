module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './dist/apps/api-gateway/main.js',
      env: { NODE_ENV: 'development', GATEWAY_PORT: 3000 },
    },
    {
      name: 'auth-service',
      script: './dist/apps/auth-service/main.js',
      env: { NODE_ENV: 'development', AUTH_PORT: 3001 },
    },
    {
      name: 'catalog-service',
      script: './dist/apps/catalog-service/main.js',
      env: { NODE_ENV: 'development', CATALOG_PORT: 3002 },
    },
    {
      name: 'inventory-service',
      script: './dist/apps/inventory-service/main.js',
      env: { NODE_ENV: 'development', INVENTORY_PORT: 3003 },
    },
    {
      name: 'orders-service',
      script: './dist/apps/orders-service/main.js',
      env: { NODE_ENV: 'development', ORDERS_PORT: 3004 },
    },
    {
      name: 'payment-service',
      script: './dist/apps/payment-service/main.js',
      env: { NODE_ENV: 'development', PAYMENT_PORT: 3005 },
    },
    {
      name: 'notification-service',
      script: './dist/apps/notification-service/main.js',
      env: { NODE_ENV: 'development', NOTIFICATION_PORT: 3006 },
    },
  ].map((app) => ({
    ...app,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: `./logs/${app.name}-error.log`,
    out_file: `./logs/${app.name}-out.log`,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  })),
};

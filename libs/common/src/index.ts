// ========================================
// DTOs - Auth
// ========================================
export * from './dtos/auth/register.dto';
export * from './dtos/auth/login.dto';
export * from './dtos/auth/auth-response.dto';

// ========================================
// DTOs - Catalog
// ========================================
export * from './dtos/catalog/create-product.dto';
export * from './dtos/catalog/update-product.dto';
export * from './dtos/catalog/product-response.dto';
export * from './dtos/catalog/pagination-query.dto';

// ========================================
// DTOs - Inventory
// ========================================
export * from './dtos/inventory/inventory-response.dto';
export * from './dtos/inventory/update-inventory.dto';

// ========================================
// DTOs - Orders
// ========================================
export * from './dtos/orders/create-order.dto';
export * from './dtos/orders/order-response.dto';
export * from './dtos/orders/order-preview-response.dto';

// ========================================
// DTOs - Payment
// ========================================
export * from './dtos/payment/create-checkout-session.dto';
export * from './dtos/payment/checkout-session-response.dto';
export * from './dtos/payment/payment-response.dto';
export * from './events/payment.events';

// ========================================
// Enums
// ========================================
export * from './enums/role.enum';
export * from './enums/order-status.enum';

// ========================================
// Decorators
// ========================================
export * from './decorators/current-user.decorator';
export * from './decorators/roles.decorator';

// ========================================
// Guards
// ========================================
export * from './guards/jwt-auth.guard';
export * from './guards/roles.guard';

// ========================================
// Filters
// ========================================
export * from './filters/all-exceptions.filter';

// ========================================
// Database (Prisma)
// ========================================
export * from './database/prisma.module';
export * from './database/prisma.service';

// ========================================
// Logger
// ========================================
export * from './logger/logger.module';
export * from './logger/logger.service';

// ========================================
// Cache
// ========================================
export * from './cache/cache.module';

// ========================================
// Health
// ========================================
export * from './health/health.controller';

// ========================================
// Notifications (WebSockets)
// ========================================
export * from './notifications/notifications.module';
export * from './notifications/notifications.gateway';

// ========================================
// Common Module & Service (keep existing)
// ========================================
export * from './common.module';
export * from './common.service';

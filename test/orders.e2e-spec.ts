import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as http from 'http';
import { AppModule } from '../src/app.module';
import { TestDataSeeder } from './test-data-seeder';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let seeder: TestDataSeeder;
  let prisma: PrismaService;

  const loginAndGetToken = async (email: string) => {
    const loginResponse = await request(app.getHttpServer() as http.Server)
      .post('/api/auth/login')
      .send({
        email,
        password: 'Test123!@#',
      });
    return (loginResponse.body as { accessToken: string }).accessToken;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');
    await app.init();

    seeder = new TestDataSeeder(app);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/orders (POST)', () => {
    it('should create order successfully with valid items', async () => {
      await seeder.cleanDatabase();
      const testData = await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');
      const userId = testData.user.id;

      const createOrderDto = {
        items: [
          { sku: 'TEST-SKU-001', quantity: 2 },
          { sku: 'TEST-SKU-002', quantity: 1 },
        ],
      };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(201);

      const body = response.body as {
        id: string;
        status: string;
        userId: string;
        items: unknown[];
        subtotal: number;
        tax: number;
        total: number;
      };
      // Verify response structure
      expect(body).toHaveProperty('id');
      expect(body.status).toBe('PENDING');
      expect(body.userId).toBe(userId);
      expect(body.items).toHaveLength(2);

      // Verify totals calculation
      expect(body.subtotal).toBe(190);
      expect(body.tax).toBe(38);
      expect(body.total).toBe(228);

      // Verify database state
      const order = await prisma.order.findUnique({
        where: { id: body.id },
        include: { items: true },
      });

      expect(order).toBeDefined();
      expect(order!.items).toHaveLength(2);
    });

    it('should reserve inventory when creating order', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const createOrderDto = {
        items: [{ sku: 'TEST-SKU-001', quantity: 5 }],
      };

      // Check inventory before
      const inventoryBefore = await prisma.inventoryItem.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(inventoryBefore!.reserved).toBe(0);

      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(201);

      // Check inventory after
      const inventoryAfter = await prisma.inventoryItem.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(inventoryAfter!.reserved).toBe(5);
    });

    it('should reject order with insufficient stock', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const createOrderDto = {
        items: [{ sku: 'TEST-SKU-001', quantity: 200 }], // More than available
      };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(400);

      expect((response.body as { message: string }).message).toContain(
        'Insufficient stock',
      );
    });

    it('should reject order with invalid SKU', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const createOrderDto = {
        items: [{ sku: 'INVALID-SKU', quantity: 1 }],
      };

      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrderDto)
        .expect(404);
    });

    it('should reject order without authentication', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();

      const createOrderDto = {
        items: [{ sku: 'TEST-SKU-001', quantity: 1 }],
      };

      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .send(createOrderDto)
        .expect(401);
    });
  });

  describe('/api/orders (GET)', () => {
    it('should retrieve user orders', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      // Create some orders
      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-001', quantity: 1 }] });

      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-002', quantity: 2 }] });

      const response = await request(app.getHttpServer() as http.Server)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = response.body as {
        id: string;
        items: unknown;
        total: number;
      }[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('items');
      expect(body[0]).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');
      // Create some orders
      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-001', quantity: 1 }] });

      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-002', quantity: 2 }] });

      const response = await request(app.getHttpServer() as http.Server)
        .get('/api/orders?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body as unknown[]).toHaveLength(1);
    });
  });

  describe('/api/orders/:id (GET)', () => {
    it('should retrieve specific order by ID', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const createResponse = await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-001', quantity: 1 }] });

      const orderId = (createResponse.body as { id: string }).id;

      const response = await request(app.getHttpServer() as http.Server)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = response.body as { id: string };
      expect(body.id).toBe(orderId);
      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('subtotal');
      expect(body).toHaveProperty('tax');
      expect(body).toHaveProperty('total');
    });

    it('should return 404 for non-existent order', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer() as http.Server)
        .get(`/api/orders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/api/orders/:id/cancel (PATCH)', () => {
    it('should cancel pending order successfully', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const createResponse = await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-001', quantity: 3 }] });

      const orderId = (createResponse.body as { id: string }).id;

      const response = await request(app.getHttpServer() as http.Server)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect((response.body as { status: string }).status).toBe('CANCELLED');
    });

    it('should release inventory when cancelling order', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const createResponse = await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-001', quantity: 3 }] });

      const orderId = (createResponse.body as { id: string }).id;

      // Check reserved stock before cancellation
      const inventoryBefore = await prisma.inventoryItem.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(inventoryBefore!.reserved).toBe(3);

      // Cancel order
      await request(app.getHttpServer() as http.Server)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check reserved stock after cancellation
      const inventoryAfter = await prisma.inventoryItem.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(inventoryAfter!.reserved).toBe(0);
    });

    it('should be idempotent (allow cancelling already cancelled order)', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const createResponse = await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-001', quantity: 3 }] });

      const orderId = (createResponse.body as { id: string }).id;

      // First cancellation
      await request(app.getHttpServer() as http.Server)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second cancellation (should succeed idempotently)
      await request(app.getHttpServer() as http.Server)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('/api/orders/:id/pay (PATCH)', () => {
    it('should mark order as paid successfully', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const createResponse = await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-001', quantity: 1 }] });

      const orderId = (createResponse.body as { id: string }).id;

      const response = await request(app.getHttpServer() as http.Server)
        .patch(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect((response.body as { status: string }).status).toBe('PAID');
    });

    it('should not allow paying cancelled order', async () => {
      await seeder.cleanDatabase();
      await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');

      const createResponse = await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ sku: 'TEST-SKU-001', quantity: 1 }] });

      const orderId = (createResponse.body as { id: string }).id;

      // Cancel order first
      await request(app.getHttpServer() as http.Server)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to pay cancelled order
      await request(app.getHttpServer() as http.Server)
        .patch(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('/api/orders/preview (POST)', () => {
    it('should preview order totals without creating order', async () => {
      await seeder.cleanDatabase();
      const testData = await seeder.seedCompleteTestData();
      const authToken = await loginAndGetToken('test@example.com');
      const userId = testData.user.id;

      const previewDto = {
        items: [
          { sku: 'TEST-SKU-001', quantity: 2 },
          { sku: 'TEST-SKU-002', quantity: 1 },
        ],
      };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/orders/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .send(previewDto)
        .expect(200);

      const body = response.body as {
        subtotal: number;
        tax: number;
        total: number;
        items: unknown;
      };
      expect(body).toHaveProperty('subtotal');
      expect(body).toHaveProperty('tax');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('items');
      expect(body.subtotal).toBe(190);
      expect(body.tax).toBe(38);
      expect(body.total).toBe(228);

      // Verify no order was created
      const orders = await prisma.order.findMany({ where: { userId } });
      expect(orders).toHaveLength(0);

      // Verify no inventory was reserved
      const inventory = await prisma.inventoryItem.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(inventory!.reserved).toBe(0);
    });
  });
});

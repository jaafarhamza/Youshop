import { config } from 'dotenv';
config();

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as http from 'http';
import { InventoryModule } from './../src/inventory.module';
import { AuthModule } from '../../auth-service/src/auth.module';
import { TestDataSeeder } from './test-data-seeder';
import { PrismaService } from 'y/common';

describe('Inventory (e2e)', () => {
  let app: INestApplication;
  let seeder: TestDataSeeder;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [InventoryModule, AuthModule],
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

  beforeEach(async () => {
    await seeder.cleanDatabase();
    await seeder.seedCompleteTestData();

    // Login as admin
    const adminLoginResponse = await request(app.getHttpServer() as http.Server)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Test123!@#',
      });
    adminToken = (adminLoginResponse.body as { accessToken: string })
      .accessToken;

    // Login as regular user
    const userLoginResponse = await request(app.getHttpServer() as http.Server)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
      });
    userToken = (userLoginResponse.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/inventory/sku/:sku (GET) - Admin Only', () => {
    it('should retrieve inventory by SKU (admin)', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/api/inventory/sku/TEST-SKU-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as {
        sku: string;
        quantity: number;
        reserved: number;
      };
      expect(body.sku).toBe('TEST-SKU-001');
      expect(body.quantity).toBe(100);
      expect(body.reserved).toBe(0);
    });

    it('should reject access for non-admin users', async () => {
      await request(app.getHttpServer() as http.Server)
        .get('/api/inventory/sku/TEST-SKU-001')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent SKU', async () => {
      await request(app.getHttpServer() as http.Server)
        .get('/api/inventory/sku/INVALID-SKU')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/api/inventory/:sku/availability (GET) - Public', () => {
    it('should check stock availability without authentication', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/api/inventory/TEST-SKU-001/availability?quantity=10')
        .expect(200);

      const body = response.body as { available: boolean; current: number };
      expect(body.available).toBe(true);
      expect(body.current).toBe(100);
    });

    it('should return false when insufficient stock', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/api/inventory/TEST-SKU-001/availability?quantity=200')
        .expect(200);

      const body = response.body as { available: boolean; current: number };
      expect(body.available).toBe(false);
      expect(body.current).toBe(100);
    });
  });

  describe('/api/inventory/:sku/add (POST) - Admin Only', () => {
    it('should add stock successfully (admin)', async () => {
      const addStockDto = { amount: 50 };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(addStockDto)
        .expect(200);

      expect((response.body as { quantity: number }).quantity).toBe(150); // 100 + 50

      // Verify database state
      const inventory = await prisma.inventoryItem.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(inventory!.quantity).toBe(150);
    });

    it('should reject negative amount', async () => {
      const addStockDto = { amount: -10 };

      await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(addStockDto)
        .expect(400);
    });

    it('should reject access for non-admin users', async () => {
      const addStockDto = { amount: 50 };

      await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send(addStockDto)
        .expect(403);
    });
  });

  describe('/api/inventory/:sku/remove (POST) - Admin Only', () => {
    it('should remove stock successfully (admin)', async () => {
      const removeStockDto = { amount: 30 };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(removeStockDto)
        .expect(200);

      expect((response.body as { quantity: number }).quantity).toBe(70); // 100 - 30

      // Verify database state
      const inventory = await prisma.inventoryItem.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(inventory!.quantity).toBe(70);
    });

    it('should reject removal exceeding available stock', async () => {
      const removeStockDto = { amount: 200 };

      await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(removeStockDto)
        .expect(400);
    });

    it('should consider reserved stock when removing', async () => {
      // Reserve some stock first
      await prisma.inventoryItem.update({
        where: { sku: 'TEST-SKU-001' },
        data: { reserved: 50 },
      });

      // Try to remove more than available (100 - 50 = 50 available)
      const removeStockDto = { amount: 60 };

      await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(removeStockDto)
        .expect(400);
    });
  });

  describe('/api/inventory/:sku/reserve (POST) - Authenticated', () => {
    it('should reserve stock successfully', async () => {
      const reserveDto = { quantity: 10 };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reserveDto)
        .expect(200);

      expect((response.body as { reserved: number }).reserved).toBe(10);

      // Verify database state
      const inventory = await prisma.inventoryItem.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(inventory!.reserved).toBe(10);
    });

    it('should reject reservation exceeding available stock', async () => {
      const reserveDto = { quantity: 200 };

      await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reserveDto)
        .expect(400);
    });
  });

  describe('/api/inventory/:sku/release (POST) - Authenticated', () => {
    beforeEach(async () => {
      // Reserve stock before each release test
      await prisma.inventoryItem.update({
        where: { sku: 'TEST-SKU-001' },
        data: { reserved: 20 },
      });
    });

    it('should release reserved stock successfully', async () => {
      const releaseDto = { quantity: 10 };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/release')
        .set('Authorization', `Bearer ${userToken}`)
        .send(releaseDto)
        .expect(200);

      expect((response.body as { reserved: number }).reserved).toBe(10); // 20 - 10

      // Verify database state
      const inventory = await prisma.inventoryItem.findUnique({
        where: { sku: 'TEST-SKU-001' },
      });
      expect(inventory!.reserved).toBe(10);
    });

    it('should reject releasing more than reserved', async () => {
      const releaseDto = { quantity: 30 };

      await request(app.getHttpServer() as http.Server)
        .post('/api/inventory/TEST-SKU-001/release')
        .set('Authorization', `Bearer ${userToken}`)
        .send(releaseDto)
        .expect(400);
    });
  });

  describe('/api/inventory/low-stock (GET) - Admin Only', () => {
    beforeEach(async () => {
      // Set different inventory levels
      await prisma.inventoryItem.update({
        where: { sku: 'TEST-SKU-001' },
        data: { quantity: 5, reserved: 0 }, // Low stock
      });
      await prisma.inventoryItem.update({
        where: { sku: 'TEST-SKU-002' },
        data: { quantity: 8, reserved: 0 }, // Low stock
      });
    });

    it('should retrieve low stock items (admin)', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/api/inventory/low-stock?threshold=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect((response.body as unknown[]).length).toBeGreaterThanOrEqual(2);
    });

    it('should reject access for non-admin users', async () => {
      await request(app.getHttpServer() as http.Server)
        .get('/api/inventory/low-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/api/inventory/out-of-stock (GET) - Admin Only', () => {
    beforeEach(async () => {
      // Set item as out of stock
      await prisma.inventoryItem.update({
        where: { sku: 'TEST-SKU-001' },
        data: { quantity: 0, reserved: 0 },
      });
    });

    it('should retrieve out of stock items (admin)', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/api/inventory/out-of-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as { sku: string }[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0].sku).toBe('TEST-SKU-001');
    });

    it('should reject access for non-admin users', async () => {
      await request(app.getHttpServer() as http.Server)
        .get('/api/inventory/out-of-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});

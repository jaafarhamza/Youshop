import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as http from 'http';
import { AuthModule } from './../src/auth.module';
import { TestDataSeeder } from './test-data-seeder';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let seeder: TestDataSeeder;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same pipes as main app
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
  });

  beforeEach(async () => {
    await seeder.cleanDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
      };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/auth/register')
        .send(registerDto)
        .expect(201);

      const body = response.body as {
        user: { email: string; roles: string[] };
        message: string;
      };

      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('message');
      expect(body.user.email).toBe(registerDto.email);
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(body.user.roles).toContain('CLIENT');
      expect(typeof body.message).toBe('string');
    });

    it('should reject registration with duplicate email', async () => {
      // Seed existing user
      await seeder.seedTestUser('existing@example.com');

      const registerDto = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
      };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/auth/register')
        .send(registerDto)
        .expect(409);

      expect((response.body as { message: string }).message).toContain(
        'Email already registered',
      );
    });

    it('should reject registration with weak password', async () => {
      const registerDto = {
        email: 'weakpass@example.com',
        password: 'weak',
      };

      await request(app.getHttpServer() as http.Server)
        .post('/api/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should reject registration with invalid email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'SecurePass123!',
      };

      await request(app.getHttpServer() as http.Server)
        .post('/api/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should reject registration with missing fields', async () => {
      await request(app.getHttpServer() as http.Server)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      await request(app.getHttpServer() as http.Server)
        .post('/api/auth/register')
        .send({ password: 'SecurePass123!' })
        .expect(400);
    });
  });

  describe('/api/auth/login (POST)', () => {
    beforeEach(async () => {
      // Seed test user before each login test
      await seeder.seedTestUser('test@example.com');
    });

    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/auth/login')
        .send(loginDto)
        .expect(200);

      const body = response.body as {
        user: { email: string };
        accessToken: string;
      };

      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('accessToken');
      expect(body.user.email).toBe(loginDto.email);
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(typeof body.accessToken).toBe('string');
      expect(body.accessToken.length).toBeGreaterThan(0);
    });

    it('should reject login with wrong password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/auth/login')
        .send(loginDto)
        .expect(401);

      expect((response.body as { message: string }).message).toContain(
        'Invalid credentials',
      );
    });

    it('should reject login with non-existent email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/auth/login')
        .send(loginDto)
        .expect(401);

      expect((response.body as { message: string }).message).toContain(
        'Invalid credentials',
      );
    });

    it('should reject login with missing fields', async () => {
      await request(app.getHttpServer() as http.Server)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      await request(app.getHttpServer() as http.Server)
        .post('/api/auth/login')
        .send({ password: 'Test123!@#' })
        .expect(400);
    });
  });

  describe('JWT Token Validation', () => {
    it('should access protected route with valid token', async () => {
      const { products } = await seeder.seedCompleteTestData();
      const response = await request(app.getHttpServer() as http.Server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });
      const authToken = (response.body as { accessToken: string }).accessToken;

      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{ sku: products[0].sku, quantity: 1 }],
        })
        .expect(201);
    });

    it('should reject protected route without token', async () => {
      const { products } = await seeder.seedCompleteTestData();
      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .send({
          items: [{ sku: products[0].sku, quantity: 1 }],
        })
        .expect(401);
    });

    it('should reject protected route with invalid token', async () => {
      const { products } = await seeder.seedCompleteTestData();
      await request(app.getHttpServer() as http.Server)
        .post('/api/orders')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          items: [{ sku: products[0].sku, quantity: 1 }],
        })
        .expect(401);
    });
  });
});

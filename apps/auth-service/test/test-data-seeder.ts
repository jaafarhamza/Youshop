import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'y/common';
import { RoleEnum } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export class TestDataSeeder {
  private prisma: PrismaService;

  constructor(app: INestApplication) {
    this.prisma = app.get(PrismaService);
  }

  async cleanDatabase() {
    // Delete in correct order due to foreign key constraints
    await this.prisma.orderItem.deleteMany();
    await this.prisma.order.deleteMany();
    await this.prisma.inventoryItem.deleteMany();
    await this.prisma.product.deleteMany();
    await this.prisma.category.deleteMany();
    await this.prisma.user.deleteMany();
  }

  async seedTestUser(
    email = 'test@example.com',
    role: RoleEnum = RoleEnum.CLIENT,
  ) {
    const passwordHash = await bcrypt.hash('Test123!@#', 10);

    return this.prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        roles: [role],
      },
    });
  }

  async seedAdminUser() {
    return this.seedTestUser('admin@example.com', RoleEnum.ADMIN);
  }

  async seedCategory() {
    return this.prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
      },
    });
  }

  async seedProduct(categoryId: string, sku = 'TEST-SKU-001', price = 99.99) {
    const slug = `test-product-${sku.toLowerCase()}`;

    const product = await this.prisma.product.upsert({
      where: { sku },
      update: { price, isActive: true, categoryId },
      create: {
        name: 'Test Product',
        slug,
        description: 'A test product for E2E testing',
        price,
        currency: 'USD',
        sku,
        categoryId,
        isActive: true,
      },
    });

    // Upsert inventory for product
    await this.prisma.inventoryItem.upsert({
      where: { sku },
      update: { quantity: 100, reserved: 0 },
      create: {
        sku,
        productId: product.id,
        quantity: 100,
        reserved: 0,
      },
    });

    return product;
  }

  async seedProducts(categoryId: string, count = 3) {
    const products = [];
    for (let i = 1; i <= count; i++) {
      const product = await this.seedProduct(
        categoryId,
        `TEST-SKU-00${i}`,
        50 + i * 10,
      );
      products.push(product);
    }
    return products;
  }

  async seedCompleteTestData() {
    const user = await this.seedTestUser();
    const admin = await this.seedAdminUser();
    const category = await this.seedCategory();
    const products = await this.seedProducts(category.id);

    return { user, admin, category, products };
  }
}

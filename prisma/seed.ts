import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
    },
  });

  const clothing = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel',
    },
  });

  // Create products
  const products = [
    {
      name: 'Laptop Pro 15',
      slug: 'laptop-pro-15',
      description: 'High-performance laptop with 16GB RAM',
      price: 1299.99,
      sku: 'ELEC-LAP-001',
      categoryId: electronics.id,
    },
    {
      name: 'Wireless Mouse',
      slug: 'wireless-mouse',
      description: 'Ergonomic wireless mouse',
      price: 29.99,
      sku: 'ELEC-MOU-001',
      categoryId: electronics.id,
    },
    {
      name: 'USB-C Cable',
      slug: 'usb-c-cable',
      description: 'Fast charging USB-C cable',
      price: 12.99,
      sku: 'ELEC-CAB-001',
      categoryId: electronics.id,
    },
    {
      name: 'T-Shirt Blue',
      slug: 't-shirt-blue',
      description: 'Cotton blue t-shirt',
      price: 19.99,
      sku: 'CLO-TSH-001',
      categoryId: clothing.id,
    },
    {
      name: 'Jeans Classic',
      slug: 'jeans-classic',
      description: 'Classic fit denim jeans',
      price: 49.99,
      sku: 'CLO-JEA-001',
      categoryId: clothing.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

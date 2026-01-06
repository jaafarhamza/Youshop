import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
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
      name: 'Gaming Keyboard RGB',
      slug: 'gaming-keyboard-rgb',
      description:
        'Mechanical gaming keyboard with RGB lighting and programmable keys',
      price: 149.99,
      sku: 'ELEC-KEY-001',
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
    try {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {},
        create: product,
      });
    } catch (error) {
      // Product already exists, skip
      console.log(`Product ${product.sku} already exists, skipping...`, error);
    }
  }

  console.log('Products seeded. Creating inventory...');

  // Create inventory items for all products
  const inventoryData = [
    {
      sku: 'ELEC-LAP-001',
      quantity: 25,
      reserved: 3,
    },
    {
      sku: 'ELEC-MOU-001',
      quantity: 150,
      reserved: 10,
    },
    {
      sku: 'ELEC-CAB-001',
      quantity: 500,
      reserved: 25,
    },
    {
      sku: 'ELEC-KEY-001',
      quantity: 45,
      reserved: 8,
    },
    {
      sku: 'CLO-TSH-001',
      quantity: 200,
      reserved: 15,
    },
    {
      sku: 'CLO-JEA-001',
      quantity: 75,
      reserved: 5,
    },
  ];

  for (const inventory of inventoryData) {
    // Find product by SKU
    const product = await prisma.product.findUnique({
      where: { sku: inventory.sku },
    });

    if (product) {
      await prisma.inventoryItem.upsert({
        where: { sku: inventory.sku },
        update: {
          quantity: inventory.quantity,
          reserved: inventory.reserved,
        },
        create: {
          sku: inventory.sku,
          productId: product.id,
          quantity: inventory.quantity,
          reserved: inventory.reserved,
        },
      });
      console.log(
        `Inventory created for ${inventory.sku}: ${inventory.quantity - inventory.reserved} available`,
      );
    }
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

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDetailResponseDto } from './dto/product-response.dto';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { CustomLoggerService } from '../common/logger/logger.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
  ) {}

  async getProducts(query: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      category,
      categoryId,
      minPrice,
      maxPrice,
      search,
    } = query;

    // Validate price range
    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    const skip = (page - 1) * limit;

    // Build where clause dynamically
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    // Filter by category (slug or ID)
    if (category || categoryId) {
      where.category = {};

      if (categoryId) {
        where.category.id = categoryId;
      } else if (category) {
        where.category.slug = category;
      }
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};

      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }

      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Search by product name (case-insensitive)
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        category: category || null,
        categoryId: categoryId || null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        search: search || null,
      },
    };
  }

  async getProductById(id: string): Promise<ProductDetailResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        inventory: {
          select: {
            quantity: true,
            reserved: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Calculate inventory availability
    const inventory = product.inventory
      ? {
          quantity: product.inventory.quantity,
          reserved: product.inventory.reserved,
          available: product.inventory.quantity - product.inventory.reserved,
          inStock: product.inventory.quantity - product.inventory.reserved > 0,
        }
      : null;

    // Transform to DTO - only exposes fields marked with @Expose()
    return plainToInstance(
      ProductDetailResponseDto,
      {
        ...product,
        inventory,
      },
      { excludeExtraneousValues: true },
    );
  }

  async createProduct(
    createProductDto: CreateProductDto,
  ): Promise<ProductDetailResponseDto> {
    const { slug, sku, categoryId, ...productData } = createProductDto;

    this.logger.log(
      `Creating product with slug: ${slug}, SKU: ${sku}`,
      'CatalogService',
    );

    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    // Check for duplicate slug
    const existingSlug = await this.prisma.product.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Product with slug "${slug}" already exists`);
    }

    // Check for duplicate SKU
    const existingSku = await this.prisma.product.findUnique({
      where: { sku },
    });

    if (existingSku) {
      throw new ConflictException(`Product with SKU "${sku}" already exists`);
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          ...productData,
          slug,
          sku,
          categoryId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
        },
      });

      this.logger.log(
        `Product created successfully: ${product.id}`,
        'CatalogService',
      );

      return plainToInstance(
        ProductDetailResponseDto,
        {
          ...product,
          inventory: null,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create product`,
        error instanceof Error ? error.stack : undefined,
        'CatalogService',
      );
      throw new BadRequestException('Failed to create product');
    }
  }

  async updateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDetailResponseDto> {
    this.logger.log(`Updating product: ${id}`, 'CatalogService');

    // Check if product exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const { slug, categoryId, ...updateData } = updateProductDto;

    // Check if category exists (if being updated)
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID "${categoryId}" not found`,
        );
      }
    }

    // Check for duplicate slug (if being updated)
    if (slug && slug !== existingProduct.slug) {
      const existingSlug = await this.prisma.product.findUnique({
        where: { slug },
      });

      if (existingSlug) {
        throw new ConflictException(
          `Product with slug "${slug}" already exists`,
        );
      }
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...updateData,
          ...(slug && { slug }),
          ...(categoryId && { categoryId }),
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
          inventory: {
            select: {
              quantity: true,
              reserved: true,
            },
          },
        },
      });

      this.logger.log(
        `Product updated successfully: ${product.id}`,
        'CatalogService',
      );

      const inventory = product.inventory
        ? {
            quantity: product.inventory.quantity,
            reserved: product.inventory.reserved,
            available: product.inventory.quantity - product.inventory.reserved,
            inStock:
              product.inventory.quantity - product.inventory.reserved > 0,
          }
        : null;

      return plainToInstance(
        ProductDetailResponseDto,
        {
          ...product,
          inventory,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update product`,
        error instanceof Error ? error.stack : undefined,
        'CatalogService',
      );
      throw new BadRequestException('Failed to update product');
    }
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting product: ${id}`, 'CatalogService');

    // Check if product exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Check if product has order items
    if (existingProduct.orderItems.length > 0) {
      throw new BadRequestException(
        'Cannot delete product with existing orders. Consider deactivating it instead.',
      );
    }

    try {
      await this.prisma.product.delete({
        where: { id },
      });

      this.logger.log(`Product deleted successfully: ${id}`, 'CatalogService');

      return {
        message: `Product "${existingProduct.name}" deleted successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete product`,
        error instanceof Error ? error.stack : undefined,
        'CatalogService',
      );
      throw new BadRequestException('Failed to delete product');
    }
  }

  async toggleProductStatus(
    id: string,
    isActive: boolean,
  ): Promise<ProductDetailResponseDto> {
    this.logger.log(
      `Toggling product status: ${id} to ${isActive}`,
      'CatalogService',
    );

    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        inventory: {
          select: {
            quantity: true,
            reserved: true,
          },
        },
      },
    });

    this.logger.log(
      `Product status updated: ${id} - isActive: ${isActive}`,
      'CatalogService',
    );

    const inventory = product.inventory
      ? {
          quantity: product.inventory.quantity,
          reserved: product.inventory.reserved,
          available: product.inventory.quantity - product.inventory.reserved,
          inStock: product.inventory.quantity - product.inventory.reserved > 0,
        }
      : null;

    return plainToInstance(
      ProductDetailResponseDto,
      {
        ...product,
        inventory,
      },
      { excludeExtraneousValues: true },
    );
  }
}

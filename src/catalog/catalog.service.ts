import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

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
}

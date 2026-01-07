import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CatalogService } from './catalog.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDetailResponseDto } from './dto/product-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Retrieve paginated list of products with optional filtering by category, price range, and search',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: [ProductDetailResponseDto],
  })
  async getProducts(@Query() query: PaginationQueryDto) {
    return this.catalogService.getProducts(query);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieve detailed information about a specific product',
  })
  @ApiParam({
    name: 'id',
    description: 'Product UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Product details retrieved successfully',
    type: ProductDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getProductById(
    @Param('id') id: string,
  ): Promise<ProductDetailResponseDto> {
    return this.catalogService.getProductById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create new product (Admin only)',
    description: 'Create a new product in the catalog. Requires ADMIN role.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMIN role',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Product slug or SKU already exists',
  })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductDetailResponseDto> {
    return this.catalogService.createProduct(createProductDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update product (Admin only)',
    description: 'Update an existing product. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Slug or SKU already exists',
  })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductDetailResponseDto> {
    return this.catalogService.updateProduct(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete product (Admin only)',
    description:
      'Permanently delete a product and its inventory. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Product deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async deleteProduct(@Param('id') id: string): Promise<{ message: string }> {
    return this.catalogService.deleteProduct(id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Toggle product active status (Admin only)',
    description: 'Activate or deactivate a product. Requires ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiBody({
    schema: {
      properties: {
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Product status updated successfully',
    type: ProductDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async toggleProductStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<ProductDetailResponseDto> {
    return this.catalogService.toggleProductStatus(id, isActive);
  }
}

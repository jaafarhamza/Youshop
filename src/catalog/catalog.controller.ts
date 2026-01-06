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

@Controller('products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  async getProducts(@Query() query: PaginationQueryDto) {
    return this.catalogService.getProducts(query);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  async getProductById(
    @Param('id') id: string,
  ): Promise<ProductDetailResponseDto> {
    return this.catalogService.getProductById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductDetailResponseDto> {
    return this.catalogService.createProduct(createProductDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
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
  async deleteProduct(@Param('id') id: string): Promise<{ message: string }> {
    return this.catalogService.deleteProduct(id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async toggleProductStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<ProductDetailResponseDto> {
    return this.catalogService.toggleProductStatus(id, isActive);
  }
}

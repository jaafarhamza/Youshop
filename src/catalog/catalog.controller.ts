import { Controller, Get, Query, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { ProductDetailResponseDto } from './dto/product-response.dto';

@Controller('products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async getProducts(@Query() query: PaginationQueryDto) {
    return this.catalogService.getProducts(query);
  }

  @Get(':id')
  async getProductById(
    @Param('id') id: string,
  ): Promise<ProductDetailResponseDto> {
    return this.catalogService.getProductById(id);
  }
}

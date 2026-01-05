import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async getProducts(@Query() query: PaginationQueryDto) {
    return this.catalogService.getProducts(query);
  }
}

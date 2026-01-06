import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  ReserveStockDto,
  ReleaseStockDto,
  AdjustStockDto,
} from './dto/update-inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

class LowStockQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  threshold?: number = 10;
}

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Get inventory by SKU (Admin only)

  @Get('sku/:sku')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async getInventoryBySku(@Param('sku') sku: string) {
    return this.inventoryService.getInventoryBySku(sku);
  }

  // Get inventory by product ID (Admin only)

  @Get('product/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async getInventoryByProductId(@Param('productId') productId: string) {
    return this.inventoryService.getInventoryByProductId(productId);
  }

  // Get low stock items (Admin only)

  @Get('low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async getLowStockItems(@Query() query: LowStockQueryDto) {
    return this.inventoryService.getLowStockItems(query.threshold);
  }

  // Check stock availability (Public)

  @Get(':sku/availability')
  async checkAvailability(
    @Param('sku') sku: string,
    @Query('quantity') quantity: number = 1,
  ) {
    return this.inventoryService.checkAvailability(sku, quantity);
  }

  // Add stock (Admin only)

  @Post(':sku/add')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async addStock(
    @Param('sku') sku: string,
    @Body() adjustStockDto: AdjustStockDto,
  ) {
    return this.inventoryService.addStock(sku, adjustStockDto.amount);
  }

  // Remove stock (Admin only)

  @Post(':sku/remove')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeStock(
    @Param('sku') sku: string,
    @Body() adjustStockDto: AdjustStockDto,
  ) {
    return this.inventoryService.removeStock(sku, adjustStockDto.amount);
  }

  /**
   * Reserve stock - Used internally by Orders module
   * (Protected by JWT, but any authenticated user can use it)
   */
  @Post(':sku/reserve')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reserveStock(
    @Param('sku') sku: string,
    @Body() reserveStockDto: ReserveStockDto,
  ) {
    return this.inventoryService.reserveStock(sku, reserveStockDto.quantity);
  }

  // Release reserved stock - Used internally by Orders module

  @Post(':sku/release')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async releaseStock(
    @Param('sku') sku: string,
    @Body() releaseStockDto: ReleaseStockDto,
  ) {
    return this.inventoryService.releaseStock(sku, releaseStockDto.quantity);
  }
}

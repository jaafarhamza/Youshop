import {
  Controller,
  Get,
  Post,
  Put,
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
  UpdateInventoryStockDto,
} from './dto/update-inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { InventoryResponseDto } from './dto/inventory-response.dto';

class LowStockQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  threshold?: number = 10;
}

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('sku/:sku')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get inventory by SKU (Admin only)' })
  @ApiParam({ name: 'sku', description: 'Product SKU', example: 'WBH-BLK-001' })
  @ApiResponse({
    status: 200,
    description: 'Inventory retrieved',
    type: InventoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  async getInventoryBySku(@Param('sku') sku: string) {
    return this.inventoryService.getInventoryBySku(sku);
  }

  @Get('product/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get inventory by product ID (Admin only)' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({
    status: 200,
    description: 'Inventory retrieved',
    type: InventoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  async getInventoryByProductId(@Param('productId') productId: string) {
    return this.inventoryService.getInventoryByProductId(productId);
  }

  @Get('low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get low stock items (Admin only)',
    description: 'Get items with available quantity below threshold',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    type: Number,
    description: 'Low stock threshold (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Low stock items retrieved',
    type: [InventoryResponseDto],
  })
  async getLowStockItems(@Query() query: LowStockQueryDto) {
    return this.inventoryService.getLowStockItems(query.threshold);
  }

  @Get('out-of-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get out-of-stock items (Admin only)',
    description: 'Get items with zero available quantity',
  })
  @ApiResponse({
    status: 200,
    description: 'Out-of-stock items retrieved',
    type: [InventoryResponseDto],
  })
  async getOutOfStockItems() {
    return this.inventoryService.getOutOfStockItems();
  }

  @Get(':sku/availability')
  @ApiOperation({
    summary: 'Check stock availability (Public)',
    description: 'Check if requested quantity is available',
  })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiQuery({
    name: 'quantity',
    required: false,
    type: Number,
    description: 'Quantity to check (default: 1)',
  })
  @ApiResponse({
    status: 200,
    description: 'Availability checked',
    schema: {
      properties: {
        available: { type: 'boolean' },
        current: { type: 'number' },
      },
    },
  })
  async checkAvailability(
    @Param('sku') sku: string,
    @Query('quantity') quantity: number = 1,
  ) {
    return this.inventoryService.checkAvailability(sku, quantity);
  }

  @Put(':sku')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update inventory stock (Admin only)',
    description: 'Update quantity and/or reserved stock',
  })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiBody({ type: UpdateInventoryStockDto })
  @ApiResponse({
    status: 200,
    description: 'Inventory updated',
    type: InventoryResponseDto,
  })
  async updateInventoryStock(
    @Param('sku') sku: string,
    @Body() updateDto: UpdateInventoryStockDto,
  ) {
    return this.inventoryService.updateInventoryStock(sku, updateDto);
  }

  @Post(':sku/add')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add stock (Admin only)',
    description: 'Increase inventory quantity',
  })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiBody({ type: AdjustStockDto })
  @ApiResponse({
    status: 200,
    description: 'Stock added',
    type: InventoryResponseDto,
  })
  async addStock(
    @Param('sku') sku: string,
    @Body() adjustStockDto: AdjustStockDto,
  ) {
    return this.inventoryService.addStock(sku, adjustStockDto.amount);
  }

  @Post(':sku/remove')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove stock (Admin only)',
    description: 'Decrease inventory quantity',
  })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiBody({ type: AdjustStockDto })
  @ApiResponse({
    status: 200,
    description: 'Stock removed',
    type: InventoryResponseDto,
  })
  async removeStock(
    @Param('sku') sku: string,
    @Body() adjustStockDto: AdjustStockDto,
  ) {
    return this.inventoryService.removeStock(sku, adjustStockDto.amount);
  }

  @Post(':sku/reserve')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reserve stock (Internal)',
    description: 'Reserve stock for an order - used by Orders module',
  })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiBody({ type: ReserveStockDto })
  @ApiResponse({
    status: 200,
    description: 'Stock reserved',
    type: InventoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  async reserveStock(
    @Param('sku') sku: string,
    @Body() reserveStockDto: ReserveStockDto,
  ) {
    return this.inventoryService.reserveStock(sku, reserveStockDto.quantity);
  }

  @Post(':sku/release')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Release reserved stock (Internal)',
    description: 'Release stock reservation - used by Orders module',
  })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiBody({ type: ReleaseStockDto })
  @ApiResponse({
    status: 200,
    description: 'Stock released',
    type: InventoryResponseDto,
  })
  async releaseStock(
    @Param('sku') sku: string,
    @Body() releaseStockDto: ReleaseStockDto,
  ) {
    return this.inventoryService.releaseStock(sku, releaseStockDto.quantity);
  }
}

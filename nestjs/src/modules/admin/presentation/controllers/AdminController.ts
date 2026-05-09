import { Controller, Get, Post, Put, Patch, Body, Param } from '@nestjs/common';
import { AdminUseCase } from '../../application/use-cases/AdminUseCase';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminUseCase: AdminUseCase) {}

  // Tổng quan
  @Get('overview')
  getOverview() { return this.adminUseCase.getOverview(); }

  // Người dùng
  @Get('users')
  getUsers() { return this.adminUseCase.getUsers(); }

  @Post('users')
  createUser(@Body() dto: {
    fullName: string; email: string; password: string;
    role: string; phoneNumber?: string;
  }) { return this.adminUseCase.createUser(dto); }

  @Patch('users/:id')
  toggleUser(@Param('id') id: number, @Body('isActive') isActive: boolean) {
    return this.adminUseCase.toggleUserActive(id, isActive);
  }

  // Nông sản
  @Get('products')
  getProducts() { return this.adminUseCase.getProducts(); }

  @Post('products')
  createProduct(@Body() dto: { name: string; description?: string; category?: string }) {
    return this.adminUseCase.createProduct(dto);
  }

  @Put('products/:id')
  updateProduct(@Param('id') id: number, @Body() dto: { name?: string; description?: string; category?: string }) {
    return this.adminUseCase.updateProduct(id, dto);
  }

  // Nông trại
  @Get('farms')
  getFarms() { return this.adminUseCase.getFarms(); }

  @Post('farms')
  createFarm(@Body() dto: {
    farmerId: number; name: string; address: string;
    coordinates?: string; areaSize?: number;
  }) { return this.adminUseCase.createFarm(dto); }
}
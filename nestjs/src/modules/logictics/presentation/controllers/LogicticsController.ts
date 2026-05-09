import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { LogisticsUseCase } from '../../application/use-cases/LogicticsUseCase';

@Controller('api/logistics')
export class LogisticsController {
  constructor(private readonly logisticsUseCase: LogisticsUseCase) {}

  @Get('shipments/:driverId')
  getShipments(@Param('driverId') driverId: number) {
    return this.logisticsUseCase.getShipmentsByDriver(driverId);
  }

  @Post('update')
  updateShipment(@Body() dto: any) {
    return this.logisticsUseCase.updateShipment(dto);
  }

  @Patch('shipments/:id/status')
  changeStatus(@Param('id') id: number, @Body() body: { status: 'IN_TRANSIT' | 'DELIVERED'; actorId: number }) {
    return this.logisticsUseCase.changeStatus(id, body.status, body.actorId);
  }
}
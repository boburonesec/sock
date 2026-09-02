import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { CreateCorrectionRequestDto, ResolveCorrectionRequestDto } from './production.dto';
import { ProductionService } from './production.service';

@Controller('recovery')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RecoveryController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('correction-requests')
  getCorrectionRequests(@CurrentContext() context: RequestContext) {
    return this.productionService.getCorrectionRequests(context);
  }

  @Post('correction-requests')
  createCorrectionRequest(@CurrentContext() context: RequestContext, @Body() dto: CreateCorrectionRequestDto) {
    return this.productionService.createCorrectionRequest(context, dto);
  }

  @Post('correction-requests/:id/resolve')
  resolveCorrectionRequest(@CurrentContext() context: RequestContext, @Param('id') id: string, @Body() dto: ResolveCorrectionRequestDto) {
    return this.productionService.resolveCorrectionRequest(context, id, dto);
  }
}

import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  CreateSupplierPaymentDto,
  CreateSupplierPurchaseDto,
  SupplierDto,
} from './supplier.dto';
import { SupplierService } from './supplier.service';
import {
  CollectionResponse,
  SupplierDebtResponse,
  SupplierPaymentResponse,
  SupplierPurchaseResponse,
  SupplierResponse,
} from './supplier.types';

@Controller('supplier')
@RequirePermissions('finance.view')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get('suppliers')
  getSuppliers(@CurrentContext() context: RequestContext): Promise<CollectionResponse<SupplierResponse>> {
    return this.supplierService.getSuppliers(context);
  }

  @Post('suppliers')
  @RequirePermissions('finance.write')
  createSupplier(
    @CurrentContext() context: RequestContext,
    @Body() dto: SupplierDto,
  ): Promise<{ data: SupplierResponse }> {
    return this.supplierService.createSupplier(context, dto);
  }

  @Patch('suppliers/:id')
  @RequirePermissions('finance.write')
  updateSupplier(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: SupplierDto,
  ): Promise<{ data: SupplierResponse }> {
    return this.supplierService.updateSupplier(context, id, dto);
  }

  @Post('suppliers/:id/archive')
  @RequirePermissions('finance.write')
  archiveSupplier(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<{ data: SupplierResponse }> {
    return this.supplierService.archiveSupplier(context, id);
  }

  @Get('purchases')
  getPurchases(@CurrentContext() context: RequestContext): Promise<CollectionResponse<SupplierPurchaseResponse>> {
    return this.supplierService.getPurchases(context);
  }

  @Post('purchases')
  @RequirePermissions('finance.write')
  createPurchase(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateSupplierPurchaseDto,
  ): Promise<{ data: SupplierPurchaseResponse }> {
    return this.supplierService.createPurchase(context, dto);
  }

  @Get('payments')
  getPayments(@CurrentContext() context: RequestContext): Promise<CollectionResponse<SupplierPaymentResponse>> {
    return this.supplierService.getPayments(context);
  }

  @Post('payments')
  @RequirePermissions('finance.write')
  createPayment(
    @CurrentContext() context: RequestContext,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateSupplierPaymentDto,
  ): Promise<{ data: SupplierPaymentResponse }> {
    if (!idempotencyKey || !isUUID(idempotencyKey, '4')) {
      throw new BadRequestException('Idempotency-Key header must be a UUID v4.');
    }

    return this.supplierService.createPayment(context, dto, idempotencyKey);
  }

  @Get('debts')
  getDebts(@CurrentContext() context: RequestContext): Promise<CollectionResponse<SupplierDebtResponse>> {
    return this.supplierService.getDebts(context);
  }
}

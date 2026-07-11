import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import {
  ClientDto,
  CreateClientPaymentDto,
  CreateSalesOrderDto,
  DeliverSalesOrderDto,
  ReverseClientPaymentDto,
  UpdateSalesOrderDto,
} from './sales.dto';
import { SalesService } from './sales.service';
import {
  ClientDebtResponse,
  ClientPaymentResponse,
  ClientResponse,
  CollectionResponse,
  SalesOrderResponse,
  SalesSummaryResponse,
} from './sales.types';

@Controller('sales')
@RequirePermissions('sales.view')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('clients')
  getClients(@CurrentContext() context: RequestContext): Promise<CollectionResponse<ClientResponse>> {
    return this.salesService.getClients(context);
  }

  @Post('clients')
  @RequirePermissions('sales.write')
  createClient(
    @CurrentContext() context: RequestContext,
    @Body() dto: ClientDto,
  ): Promise<{ data: ClientResponse }> {
    return this.salesService.createClient(context, dto);
  }

  @Patch('clients/:id')
  @RequirePermissions('sales.write')
  updateClient(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: ClientDto,
  ): Promise<{ data: ClientResponse }> {
    return this.salesService.updateClient(context, id, dto);
  }

  @Post('clients/:id/archive')
  @RequirePermissions('sales.write')
  archiveClient(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<{ data: ClientResponse }> {
    return this.salesService.archiveClient(context, id);
  }

  @Get('summary')
  getSummary(@CurrentContext() context: RequestContext): Promise<SalesSummaryResponse> {
    return this.salesService.getSummary(context);
  }

  @Get('orders')
  getOrders(@CurrentContext() context: RequestContext): Promise<CollectionResponse<SalesOrderResponse>> {
    return this.salesService.getOrders(context);
  }

  @Post('orders')
  @RequirePermissions('sales.write')
  createOrder(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateSalesOrderDto,
  ): Promise<{ data: SalesOrderResponse }> {
    return this.salesService.createOrder(context, dto);
  }

  @Patch('orders/:id')
  @RequirePermissions('sales.write')
  updateOrder(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
  ): Promise<{ data: SalesOrderResponse }> {
    return this.salesService.updateOrder(context, id, dto);
  }

  @Post('orders/:id/cancel')
  @RequirePermissions('sales.write')
  cancelOrder(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<{ data: SalesOrderResponse }> {
    return this.salesService.cancelOrder(context, id);
  }

  @Post('orders/:id/deliver')
  @RequirePermissions('sales.write')
  deliverOrder(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: DeliverSalesOrderDto,
  ): Promise<{ data: SalesOrderResponse }> {
    return this.salesService.deliverOrder(context, id, dto ?? {});
  }

  @Post('orders/:id/return-delivery')
  @RequirePermissions('sales.write')
  returnDelivery(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<{ data: SalesOrderResponse }> {
    return this.salesService.returnDelivery(context, id);
  }

  @Get('payments')
  getPayments(@CurrentContext() context: RequestContext): Promise<CollectionResponse<ClientPaymentResponse>> {
    return this.salesService.getPayments(context);
  }

  @Post('payments')
  @RequirePermissions('sales.write')
  createPayment(
    @CurrentContext() context: RequestContext,
    @Body() dto: CreateClientPaymentDto,
  ): Promise<{ data: ClientPaymentResponse }> {
    return this.salesService.createPayment(context, dto);
  }

  @Post('payments/:id/reverse')
  @RequirePermissions('sales.write')
  reversePayment(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
    @Body() dto: ReverseClientPaymentDto,
  ): Promise<{ data: ClientPaymentResponse }> {
    return this.salesService.reversePayment(context, id, dto);
  }

  @Get('debts')
  getDebts(@CurrentContext() context: RequestContext): Promise<CollectionResponse<ClientDebtResponse>> {
    return this.salesService.getDebts(context);
  }
}

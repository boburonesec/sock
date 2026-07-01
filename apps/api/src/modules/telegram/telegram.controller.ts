import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/jwt-auth.guard';
import { PermissionGuard } from '../identity/authorization/permission.guard';
import { RequirePermissions } from '../identity/authorization/require-permissions.decorator';
import { CurrentContext } from '../identity/request-context/current-context.decorator';
import { RequestContext } from '../identity/request-context/request-context.types';
import { BotInternalApiKeyGuard } from './bot-internal-api-key.guard';
import { TelegramBotLinkDto, TelegramBotUnlinkDto } from './telegram.dto';
import { TelegramService } from './telegram.service';
import {
  CollectionResponse,
  SingleResponse,
  TelegramAccountListItem,
  TelegramAccountStatusChangeResponse,
  TelegramHealthResponse,
  TelegramBotClientDebtResponse,
  TelegramBotClientOrderResponse,
  TelegramBotClientPaymentResponse,
  TelegramBotAdvanceResponse,
  TelegramBotLinkedAccountResponse,
  TelegramBotPayrollItemResponse,
  TelegramBotSalaryRateResponse,
  TelegramBotWorkerActivityResponse,
  TelegramLinkTokenCreatedResponse,
  TelegramLinkTokenListItem,
} from './telegram.types';

@Controller('telegram/link-tokens')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('employees/:employeeId')
  @RequirePermissions('employees.write')
  createEmployeeLinkToken(
    @CurrentContext() context: RequestContext,
    @Param('employeeId') employeeId: string,
  ): Promise<SingleResponse<TelegramLinkTokenCreatedResponse>> {
    return this.telegramService.createEmployeeLinkToken(context, employeeId);
  }

  @Post('clients/:clientId')
  @RequirePermissions('sales.write')
  createClientLinkToken(
    @CurrentContext() context: RequestContext,
    @Param('clientId') clientId: string,
  ): Promise<SingleResponse<TelegramLinkTokenCreatedResponse>> {
    return this.telegramService.createClientLinkToken(context, clientId);
  }

  @Get()
  @RequirePermissions('settings.view')
  getLinkTokens(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<TelegramLinkTokenListItem>> {
    return this.telegramService.getLinkTokens(context);
  }
}

@Controller('telegram/accounts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TelegramAccountController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get()
  @RequirePermissions('settings.view')
  getAccounts(
    @CurrentContext() context: RequestContext,
  ): Promise<CollectionResponse<TelegramAccountListItem>> {
    return this.telegramService.getAccounts(context);
  }

  @Post(':id/block')
  @RequirePermissions('settings.write')
  blockTelegramAccount(
    @CurrentContext() context: RequestContext,
    @Param('id') id: string,
  ): Promise<SingleResponse<TelegramAccountStatusChangeResponse>> {
    return this.telegramService.blockTelegramAccount(context, id);
  }
}

@Controller('telegram/health')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TelegramHealthController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get()
  @RequirePermissions('settings.view')
  getHealth(
    @CurrentContext() context: RequestContext,
  ): Promise<SingleResponse<TelegramHealthResponse>> {
    return this.telegramService.getHealth(context);
  }
}

@Controller('telegram/bot')
@UseGuards(BotInternalApiKeyGuard)
export class TelegramBotController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('link')
  linkEmployeeAccount(
    @Body() dto: TelegramBotLinkDto,
  ): Promise<SingleResponse<TelegramBotLinkedAccountResponse>> {
    return this.telegramService.linkEmployeeAccount(dto);
  }

  @Post('unlink')
  unlinkEmployeeAccount(
    @Body() dto: TelegramBotUnlinkDto,
  ): Promise<SingleResponse<TelegramAccountStatusChangeResponse>> {
    return this.telegramService.unlinkEmployeeAccount(dto);
  }

  @Get('me')
  getMe(
    @Query('telegramUserId') telegramUserId: string,
  ): Promise<SingleResponse<TelegramBotLinkedAccountResponse>> {
    return this.telegramService.getBotMe(telegramUserId);
  }

  @Get('employee/salary')
  getEmployeeSalary(
    @Query('telegramUserId') telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotSalaryRateResponse>> {
    return this.telegramService.getEmployeeSalary(telegramUserId);
  }

  @Get('employee/activities')
  getEmployeeActivities(
    @Query('telegramUserId') telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotWorkerActivityResponse>> {
    return this.telegramService.getEmployeeActivities(telegramUserId);
  }

  @Get('employee/advances')
  getEmployeeAdvances(
    @Query('telegramUserId') telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotAdvanceResponse>> {
    return this.telegramService.getEmployeeAdvances(telegramUserId);
  }

  @Get('employee/payroll')
  getEmployeePayroll(
    @Query('telegramUserId') telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotPayrollItemResponse>> {
    return this.telegramService.getEmployeePayroll(telegramUserId);
  }

  @Get('client/orders')
  getClientOrders(
    @Query('telegramUserId') telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotClientOrderResponse>> {
    return this.telegramService.getClientOrders(telegramUserId);
  }

  @Get('client/debt')
  getClientDebt(
    @Query('telegramUserId') telegramUserId: string,
  ): Promise<SingleResponse<TelegramBotClientDebtResponse>> {
    return this.telegramService.getClientDebt(telegramUserId);
  }

  @Get('client/payments')
  getClientPayments(
    @Query('telegramUserId') telegramUserId: string,
  ): Promise<CollectionResponse<TelegramBotClientPaymentResponse>> {
    return this.telegramService.getClientPayments(telegramUserId);
  }
}

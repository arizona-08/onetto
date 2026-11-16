import { Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { AuthGuard } from 'src/auth/auth.guard';
import type { ExtendedRequest } from 'src/types/extended-request.types';
import { ContractPaymentService } from './contract-payment.service';
import { GoCardlessReconciliationService } from 'src/Adapters/PaymentAdapters/gocardless/gocardless-reconciliation.service';

class TriggerStagePaymentDto {
  @IsBoolean()
  acknowledgeUnpaidPrevious: boolean;
}

@UseGuards(AuthGuard)
@Controller('api/contracts')
export class ContractPaymentController {
  constructor(
    private readonly contracts: ContractPaymentService,
    private readonly reconciliation: GoCardlessReconciliationService,
  ) {}

  @Post('stages/:stageId/invoice')
  prepareInvoice(@Param('stageId') stageId: string, @Req() request: ExtendedRequest) {
    if (!request.user) throw new UnauthorizedException('Non authentifié');
    return this.contracts.prepareStageInvoice(stageId, request.user);
  }

  @Get('stages/:stageId/payment-preview')
  paymentPreview(@Param('stageId') stageId: string, @Req() request: ExtendedRequest) {
    if (!request.user) throw new UnauthorizedException('Non authentifié');
    return this.contracts.getStagePaymentPreview(stageId, request.user);
  }

  @Post('stages/:stageId/payment')
  triggerPayment(
    @Param('stageId') stageId: string,
    @Body() body: TriggerStagePaymentDto,
    @Req() request: ExtendedRequest,
  ) {
    if (!request.user) throw new UnauthorizedException('Non authentifié');
    return this.contracts.triggerStagePayment(stageId, request.user, body.acknowledgeUnpaidPrevious);
  }

  @Post('stages/:stageId/reconcile')
  reconcilePayment(@Param('stageId') stageId: string, @Req() request: ExtendedRequest) {
    if (!request.user) throw new UnauthorizedException('Non authentifié');
    return this.reconciliation.reconcileContractStage(stageId, request.user);
  }

  @Post(':planId/cancel')
  cancelPlan(@Param('planId') planId: string, @Req() request: ExtendedRequest) {
    if (!request.user) throw new UnauthorizedException('Non authentifié');
    return this.contracts.cancelContractPlan(planId, request.user);
  }

  @Post(':planId/mandate/reconcile')
  reconcileMandate(@Param('planId') planId: string, @Req() request: ExtendedRequest) {
    if (!request.user) throw new UnauthorizedException('Non authentifié');
    return this.contracts.reconcileMandateForPlan(planId, request.user);
  }

  @Post('stages/:stageId/retry')
  retryPayment(@Param('stageId') stageId: string, @Req() request: ExtendedRequest) {
    if (!request.user) throw new UnauthorizedException('Non authentifié');
    return this.contracts.retryStagePayment(stageId, request.user);
  }

  @Post('stages/:stageId/manual-settlement')
  markPaidManually(@Param('stageId') stageId: string, @Req() request: ExtendedRequest) {
    if (!request.user) throw new UnauthorizedException('Non authentifié');
    return this.contracts.markStagePaidManually(stageId, request.user);
  }
}

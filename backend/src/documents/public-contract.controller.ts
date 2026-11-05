import { Controller, Get, Param } from '@nestjs/common';
import { ContractPaymentService } from './contract-payment.service';

@Controller('api/public/contracts')
export class PublicContractController {
  constructor(private readonly contracts: ContractPaymentService) {}

  @Get(':token/mandate')
  getMandateLink(@Param('token') token: string) {
    return this.contracts.getMandateAuthorisation(token);
  }
}

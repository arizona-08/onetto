import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DocumentService } from './document.service';

@Controller('api/public/payments')
export class PublicPaymentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  async getPayment(@Query('token') token?: string) {
    if (!token) {
      throw new BadRequestException('Token de paiement requis.');
    }

    return this.documentService.getPublicPaymentByToken(token);
  }
}

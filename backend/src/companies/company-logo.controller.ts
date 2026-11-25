import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CompaniesService } from './companies.service';

@Controller('api/company-logos')
export class CompanyLogoController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get(':companyId')
  async getLogo(
    @Param('companyId') companyId: string,
    @Res() response: Response,
  ) {
    const { content, contentType } =
      await this.companiesService.getLogo(companyId);
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(content);
  }
}

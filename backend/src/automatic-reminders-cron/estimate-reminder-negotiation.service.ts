import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

type EstimateReminderDocument = {
  id: string;
  totalPrice: number;
};

@Injectable()
export class EstimateReminderNegotiationService {
  constructor(private readonly prismaService: PrismaService) {}

  async createNegotiationUrl(
    document: EstimateReminderDocument,
  ): Promise<string> {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new InternalServerErrorException(
        "L'URL de l'application cliente n'est pas configurée.",
      );
    }

    const negotiation = await this.prismaService.estimateNegociation.create({
      data: {
        documentId: document.id,
        message: '',
        proposedTotalPrice: document.totalPrice,
        negociationToken: randomBytes(16).toString('hex'),
      },
      select: { negociationToken: true },
    });

    const negotiationUrl = new URL('/negociations', frontendUrl);
    negotiationUrl.searchParams.set('token', negotiation.negociationToken);
    return negotiationUrl.toString();
  }
}

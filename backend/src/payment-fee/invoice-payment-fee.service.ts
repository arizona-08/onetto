import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';

const DEFAULT_FEE_IN_CENTS = 100;
const MONTHLY_FEE_LIMIT_IN_CENTS = 5000;

@Injectable()
export class InvoicePaymentFeeService {
  async createForPaidInvoice(
    documentId: string,
    companyId: string,
    prisma: Prisma.TransactionClient,
    paymentMethod?: $Enums.PaymentMethod,
  ) {
    const existingFee = await prisma.invoicePaymentFee.findUnique({
      where: { documentId },
      select: { amountInCents: true },
    });

    if (existingFee && existingFee.amountInCents > 0) {
      if (paymentMethod) {
        return prisma.invoicePaymentFee.update({
          where: { documentId },
          data: { paymentMethod },
        });
      }

      return existingFee;
    }

    const startOfMonth = this.getStartOfMonth();
    const monthlyFees = await prisma.invoicePaymentFee.aggregate({
      where: {
        companyId,
        documentId: { not: documentId },
        createdAt: { gte: startOfMonth },
      },
      _sum: { amountInCents: true },
    });
    const accumulatedAmount = monthlyFees._sum.amountInCents ?? 0;
    const remainingAmount = Math.max(
      0,
      MONTHLY_FEE_LIMIT_IN_CENTS - accumulatedAmount,
    );
    const amountInCents = Math.min(DEFAULT_FEE_IN_CENTS, remainingAmount);
    const paymentMethodData = paymentMethod ? { paymentMethod } : {};

    return prisma.invoicePaymentFee.upsert({
      where: { documentId },
      create: {
        documentId,
        companyId,
        amountInCents,
        ...paymentMethodData,
      },
      update: {
        amountInCents,
        ...paymentMethodData,
      },
    });
  }

  async resetForPendingInvoice(
    documentId: string,
    prisma: Prisma.TransactionClient,
  ) {
    return prisma.invoicePaymentFee.updateMany({
      where: { documentId },
      data: { amountInCents: 0 },
    });
  }

  private getStartOfMonth() {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

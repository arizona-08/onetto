import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildContractStages, ContractStageInput } from './contract-payment-plan';

type SourceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number | null;
  itemType: 'GOODS' | 'SERVICES';
};

function cents(value: Prisma.Decimal.Value): number {
  return new Prisma.Decimal(value).times(100).toDecimalPlaces(0).toNumber();
}

function netFromGross(gross: number, taxRate: number): number {
  const estimate = Math.round((gross * 100) / (100 + taxRate));
  for (let delta = -3; delta <= 3; delta += 1) {
    const net = estimate + delta;
    if (net >= 0 && net + Math.round((net * taxRate) / 100) === gross) return net;
  }
  throw new BadRequestException('Ce montant d’acompte ne peut pas être ventilé exactement avec le taux de TVA indiqué. Ajustez le devis.');
}

/** Each stage is billed once; the final stage receives every cent of rounding residue. */
export function buildContractInvoiceLines(
  sourceLines: SourceLine[],
  contractTotalInCents: number,
  deposits: ContractStageInput[],
  stageIndex: number,
) {
  if (!sourceLines.length) throw new BadRequestException('Le devis ne contient aucune prestation.');
  const stages = buildContractStages(contractTotalInCents, deposits);
  if (!stages[stageIndex]) throw new BadRequestException('Jalon introuvable.');
  const lineGrosses = sourceLines.map((line) => cents(
    new Prisma.Decimal(line.unitPrice).times(line.quantity).times(
      new Prisma.Decimal(1).plus(new Prisma.Decimal(line.taxRate ?? 0).div(100)),
    ),
  ));
  const sourceDelta = contractTotalInCents - lineGrosses.reduce((sum, amount) => sum + amount, 0);
  if (Math.abs(sourceDelta) > sourceLines.length) {
    throw new BadRequestException('Les montants du devis ne sont pas cohérents au centime.');
  }
  const largest = lineGrosses.indexOf(Math.max(...lineGrosses));
  lineGrosses[largest] += sourceDelta;
  const allGrosses = lineGrosses.map((gross) => buildContractStages(gross, deposits).map((stage) => stage.amountInCents));
  // Keep each column equal to the agreed stage amount while preserving every line's total.
  for (let index = 0; index < stages.length - 1; index += 1) {
    const current = allGrosses.reduce((sum, amounts) => sum + amounts[index], 0);
    const delta = stages[index].amountInCents - current;
    allGrosses[largest][index] += delta;
    allGrosses[largest][stages.length - 1] -= delta;
  }
  const grossTotal = allGrosses.reduce((sum, amounts) => sum + amounts[stageIndex], 0);
  if (grossTotal !== stages[stageIndex].amountInCents) {
    throw new BadRequestException('La ventilation de la facture est incohérente.');
  }
  const lines = sourceLines.map((line, index) => {
    const gross = allGrosses[index][stageIndex];
    if (gross <= 0) throw new BadRequestException('Une ligne du devis produit un montant de jalon nul.');
    const net = netFromGross(gross, line.taxRate ?? 0);
    return {
      description: line.description,
      quantity: 1,
      unit: 'forfait',
      itemType: line.itemType,
      taxRate: line.taxRate,
      unitPrice: net / 100,
      wtPrice: net / 100,
      totalPrice: gross / 100,
    };
  });
  return {
    lines,
    totalPrice: grossTotal / 100,
    totalPriceExcludingTax: lines.reduce((sum, line) => sum + cents(line.wtPrice), 0) / 100,
  };
}

import { BadRequestException } from '@nestjs/common';

export type ContractStageInput = {
  percentage: number;
  triggerCondition: string;
};

export function buildContractStages(
  totalAmountInCents: number,
  deposits: ContractStageInput[],
  balanceCondition = 'À la livraison',
) {
  if (
    !Number.isSafeInteger(totalAmountInCents) ||
    totalAmountInCents <= 0 ||
    !Array.isArray(deposits) ||
    ![1, 2].includes(deposits.length)
  ) {
    throw new BadRequestException('Le plan d’acomptes est invalide.');
  }

  let depositSum = 0;
  for (const deposit of deposits) {
    if (
      !Number.isInteger(deposit.percentage) ||
      deposit.percentage < 20 ||
      deposit.percentage % 5 !== 0 ||
      typeof deposit.triggerCondition !== 'string' ||
      !deposit.triggerCondition.trim() ||
      deposit.triggerCondition.trim().length > 500
    ) {
      throw new BadRequestException(
        'Chaque acompte doit représenter au moins 20 %, par pas de 5 %, et posséder une condition de déclenchement.',
      );
    }
    depositSum += deposit.percentage;
  }
  const balancePercentage = 100 - depositSum;
  if (balancePercentage < 5 || balancePercentage % 5 !== 0) {
    throw new BadRequestException('Le solde doit représenter au moins 5 %.');
  }
  if (!balanceCondition.trim() || balanceCondition.trim().length > 500) {
    throw new BadRequestException('La condition du solde est obligatoire.');
  }
  if (!Number.isSafeInteger(totalAmountInCents * 100)) {
    throw new BadRequestException('Le montant du plan est trop élevé.');
  }

  const stages = deposits.map((deposit, index) => ({
    sequence: index + 1,
    kind: 'DEPOSIT' as const,
    percentage: deposit.percentage,
    amountInCents: Math.floor(
      (totalAmountInCents * deposit.percentage + 50) / 100,
    ),
    triggerCondition: deposit.triggerCondition.trim(),
  }));
  const depositAmount = stages.reduce(
    (sum, stage) => sum + stage.amountInCents,
    0,
  );
  const balanceAmount = totalAmountInCents - depositAmount;
  if (balanceAmount <= 0) {
    throw new BadRequestException('Le montant du solde doit être positif.');
  }
  return [
    ...stages,
    {
      sequence: stages.length + 1,
      kind: 'BALANCE' as const,
      percentage: balancePercentage,
      amountInCents: balanceAmount,
      triggerCondition: balanceCondition.trim(),
    },
  ];
}

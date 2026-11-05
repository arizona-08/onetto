import { buildContractStages } from './contract-payment-plan';

describe('buildContractStages', () => {
  it('répartit un acompte et le solde en centimes exacts', () => {
    const stages = buildContractStages(10001, [
      { percentage: 30, triggerCondition: 'À l’acceptation' },
    ]);
    expect(stages.map((stage) => stage.amountInCents)).toEqual([3000, 7001]);
    expect(stages.reduce((sum, stage) => sum + stage.amountInCents, 0)).toBe(10001);
  });

  it('répartit deux acomptes et un solde', () => {
    const stages = buildContractStages(300000, [
      { percentage: 25, triggerCondition: 'À l’acceptation' },
      { percentage: 25, triggerCondition: 'Après approvisionnement' },
    ]);
    expect(stages.map((stage) => stage.amountInCents)).toEqual([75000, 75000, 150000]);
  });

  it.each([
    [{ percentage: 23, triggerCondition: 'Jalon' }],
    [{ percentage: 15, triggerCondition: 'Jalon' }],
    [{ percentage: 100, triggerCondition: 'Jalon' }],
    [{ percentage: 50, triggerCondition: '' }],
  ])('refuse une répartition invalide', (deposits) => {
    expect(() => buildContractStages(10000, deposits)).toThrow();
  });
});

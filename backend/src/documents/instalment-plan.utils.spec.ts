import {
  addCalendarMonths,
  buildInstalmentSchedule,
  parseDateOnly,
} from './instalment-plan.utils';

describe('instalment plan utilities', () => {
  it('splits remaining cents into the first instalments', () => {
    expect(
      buildInstalmentSchedule(100_000, 3, parseDateOnly('2026-09-21')).map(
        (instalment) => instalment.amountInCents,
      ),
    ).toEqual([33_334, 33_333, 33_333]);
  });

  it('uses calendar months and clamps end-of-month dates', () => {
    expect(addCalendarMonths(parseDateOnly('2026-01-31'), 1).toISOString())
      .toBe('2026-02-28T12:00:00.000Z');
    expect(addCalendarMonths(parseDateOnly('2028-01-31'), 1).toISOString())
      .toBe('2028-02-29T12:00:00.000Z');
  });

  it('creates monthly dates from the selected first due date', () => {
    expect(
      buildInstalmentSchedule(1_000, 3, parseDateOnly('2026-09-21')).map(
        (instalment) => instalment.dueDate.toISOString().slice(0, 10),
      ),
    ).toEqual(['2026-09-21', '2026-10-21', '2026-11-21']);
  });
});

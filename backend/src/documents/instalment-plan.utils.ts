export type InstalmentScheduleEntry = {
  sequence: number;
  amountInCents: number;
  dueDate: Date;
};

/** Parses a date-only form value without shifting it across time zones. */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

export function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(date.getUTCDate(), lastDayOfTargetMonth),
      12,
    ),
  );
}

export function buildInstalmentSchedule(
  totalAmountInCents: number,
  numberOfInstalments: 2 | 3,
  firstDueDate: Date,
): InstalmentScheduleEntry[] {
  const amountPerInstalmentInCents = Math.floor(
    totalAmountInCents / numberOfInstalments,
  );
  const remainder = totalAmountInCents % numberOfInstalments;

  return Array.from({ length: numberOfInstalments }, (_, index) => ({
    sequence: index + 1,
    // The first instalments receive the remaining cents.
    amountInCents:
      amountPerInstalmentInCents + (index < remainder ? 1 : 0),
    dueDate: addCalendarMonths(firstDueDate, index),
  }));
}

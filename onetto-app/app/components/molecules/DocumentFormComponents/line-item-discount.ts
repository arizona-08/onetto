export function calculateDiscountedUnitPrice(
  unitPrice: number,
  discountType: "PERCENT" | "AMOUNT",
  discountValue: number,
) {
  const unitDiscount = discountType === "PERCENT"
    ? unitPrice * discountValue / 100
    : discountValue;
  const valid = Number.isFinite(unitPrice) && unitPrice >= 0 &&
    Number.isFinite(discountValue) && discountValue >= 0 &&
    (discountType !== "PERCENT" || discountValue <= 100) &&
    unitDiscount <= unitPrice;

  return valid ? Math.round((unitPrice - unitDiscount) * 100) / 100 : null;
}

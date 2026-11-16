import assert from "node:assert/strict";
import test from "node:test";
import { calculateDiscountedUnitPrice } from "./line-item-discount.ts";

test("percentage discount updates the price used for document totals", () => {
  assert.equal(calculateDiscountedUnitPrice(250, "PERCENT", 20), 200);
  assert.equal(calculateDiscountedUnitPrice(19.99, "PERCENT", 10), 17.99);
});

test("fixed discount is applied per unit and cannot exceed the unit price", () => {
  assert.equal(calculateDiscountedUnitPrice(250, "AMOUNT", 30), 220);
  assert.equal(calculateDiscountedUnitPrice(250, "AMOUNT", 300), null);
});

test("rejects invalid percentages and amounts", () => {
  assert.equal(calculateDiscountedUnitPrice(250, "PERCENT", 101), null);
  assert.equal(calculateDiscountedUnitPrice(250, "AMOUNT", -1), null);
});

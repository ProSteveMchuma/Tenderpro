import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = string | number | Decimal;

export function toMoney(value: MoneyInput | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  try {
    return new Decimal(value);
  } catch {
    throw new Error("Invalid monetary amount");
  }
}

export function moneyString(value: MoneyInput | null | undefined): string {
  return toMoney(value).toFixed(2);
}

export function addMoney(...values: Array<MoneyInput | null | undefined>): string {
  let sum = new Decimal(0);
  for (const value of values) {
    sum = sum.plus(toMoney(value));
  }
  return sum.toFixed(2);
}

export function subtractMoney(left: MoneyInput, right: MoneyInput): string {
  return toMoney(left).minus(toMoney(right)).toFixed(2);
}

export function multiplyMoney(amount: MoneyInput, factor: MoneyInput): string {
  return toMoney(amount).times(toMoney(factor)).toFixed(2);
}

export function percentOf(amount: MoneyInput, percent: MoneyInput): string {
  return toMoney(amount).times(toMoney(percent)).dividedBy(100).toFixed(2);
}

export function compareMoney(left: MoneyInput, right: MoneyInput): number {
  return toMoney(left).comparedTo(toMoney(right));
}

export function isZeroMoney(value: MoneyInput): boolean {
  return toMoney(value).isZero();
}

export function isPositiveMoney(value: MoneyInput): boolean {
  return toMoney(value).greaterThan(0);
}

export function maxMoney(left: MoneyInput, right: MoneyInput): string {
  const a = toMoney(left);
  const b = toMoney(right);
  return (a.greaterThan(b) ? a : b).toFixed(2);
}

export function minMoney(left: MoneyInput, right: MoneyInput): string {
  const a = toMoney(left);
  const b = toMoney(right);
  return (a.lessThan(b) ? a : b).toFixed(2);
}

export function applyVat(subtotal: MoneyInput, vatRate: MoneyInput): {
  subtotal: string;
  vat: string;
  total: string;
} {
  const sub = toMoney(subtotal);
  const vat = sub.times(toMoney(vatRate)).dividedBy(100);
  return {
    subtotal: sub.toFixed(2),
    vat: vat.toFixed(2),
    total: sub.plus(vat).toFixed(2),
  };
}

function groupThousands(integerPart: string): string {
  const sign = integerPart.startsWith("-") ? "-" : "";
  const digits = sign ? integerPart.slice(1) : integerPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}`;
}

export function formatMoney(
  amount: MoneyInput | null | undefined,
  currency = "KES",
): string {
  const fixed = moneyString(amount);
  const [integerPart, fractionPart = "00"] = fixed.split(".");
  return `${currency} ${groupThousands(integerPart)}.${fractionPart}`;
}

export function formatMoneyCompact(
  amount: MoneyInput | null | undefined,
  currency = "KES",
): string {
  const value = toMoney(amount);
  const abs = value.abs();
  if (abs.greaterThanOrEqualTo("1000000")) {
    const millions = value.dividedBy("1000000");
    return `${currency} ${millions.toFixed(abs.greaterThanOrEqualTo("10000000") ? 1 : 2)}M`;
  }
  if (abs.greaterThanOrEqualTo("100000")) {
    const thousands = value.dividedBy("1000");
    return `${currency} ${thousands.toFixed(0)}K`;
  }
  return formatMoney(amount, currency);
}

export function allocatePayment(
  outstanding: MoneyInput,
  paymentAmount: MoneyInput,
): { applied: string; remainingPayment: string; remainingOutstanding: string } {
  const due = toMoney(outstanding);
  const pay = toMoney(paymentAmount);
  if (pay.lessThanOrEqualTo(0)) {
    return {
      applied: "0.00",
      remainingPayment: pay.toFixed(2),
      remainingOutstanding: due.toFixed(2),
    };
  }
  if (pay.greaterThanOrEqualTo(due)) {
    return {
      applied: due.toFixed(2),
      remainingPayment: pay.minus(due).toFixed(2),
      remainingOutstanding: "0.00",
    };
  }
  return {
    applied: pay.toFixed(2),
    remainingPayment: "0.00",
    remainingOutstanding: due.minus(pay).toFixed(2),
  };
}

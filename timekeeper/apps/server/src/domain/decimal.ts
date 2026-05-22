import { Prisma } from '@prisma/client';

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

export function toHours(d: Decimal): number {
  return parseFloat(d.toFixed(2));
}

export function fromHours(n: number): Decimal {
  return new Decimal(n.toFixed(2));
}

export function addDecimal(a: Decimal, b: Decimal): Decimal {
  return a.add(b);
}

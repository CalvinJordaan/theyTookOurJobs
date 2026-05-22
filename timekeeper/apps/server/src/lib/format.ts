export function formatHours(hours: number): string {
  return hours.toFixed(2);
}

export function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

export function dateToIso(d: Date | string | null): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  return formatDate(d);
}

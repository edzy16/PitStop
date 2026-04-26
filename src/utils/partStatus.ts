import { Part, PartStatus } from '@/types';

export function getPartStatus(part: Part, currentKm: number): PartStatus {
  if (part.interval_km == null) return 'tracked';
  const dueAt = part.replaced_at_km + part.interval_km;
  if (currentKm >= dueAt) return 'overdue';
  if (currentKm >= dueAt - 500) return 'due-soon';
  return 'ok';
}

export function getKmRemaining(
  part: Part,
  currentKm: number
): number | null {
  if (part.interval_km == null) return null;
  return part.replaced_at_km + part.interval_km - currentKm;
}

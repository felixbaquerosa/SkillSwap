/** Minimum age to register for SkillSwap. */
export const MIN_AGE_YEARS = 18;

/** Latest birthdate allowed — user must be at least MIN_AGE_YEARS old as of today. */
export function maxBirthdateForMinAge(minAge = MIN_AGE_YEARS): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setFullYear(d.getFullYear() - minAge);
  return d;
}

export function isAtLeastMinAge(birthdate: Date, minAge = MIN_AGE_YEARS): boolean {
  const maxAllowed = maxBirthdateForMinAge(minAge);
  const b = new Date(birthdate);
  b.setHours(12, 0, 0, 0);
  return b.getTime() <= maxAllowed.getTime();
}

/** API format YYYY-MM-DD */
export function formatBirthdateApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Display e.g. June 29, 2008 */
export function formatBirthdateDisplay(date: Date): string {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

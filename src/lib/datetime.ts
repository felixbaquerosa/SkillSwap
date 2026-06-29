/** API format: YYYY-MM-DD HH:mm:ss (local wall time). */
export function formatSessionApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:00`;
}

/** Parse a MySQL datetime string as local time. */
export function parseSessionDatetime(value: string): Date | null {
  if (!value || value.startsWith('0000')) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, 0);
}

export function isValidSessionDatetime(value: string): boolean {
  return parseSessionDatetime(value) !== null;
}

/** Human-readable session time for profile and reminders. */
export function formatSessionDisplay(value: string): string {
  const parsed = parseSessionDatetime(value);
  if (!parsed) return 'Time not set';
  return parsed.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Default: tomorrow at 2:00 PM local time. */
export function defaultSessionDatetime(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setSeconds(0, 0);
  d.setMinutes(0);
  d.setHours(14);
  return d;
}

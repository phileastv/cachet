// Les dates sont manipulées en « numéros de jour » (jours depuis le 1/1/1970, UTC)
// pour éviter tout décalage de fuseau horaire.

export const DAY_MS = 86_400_000;

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function toDay(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1;
  const d = Number(iso.slice(8, 10));
  return Math.round(Date.UTC(y, m, d) / DAY_MS);
}

export function fromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function parts(day: number): { y: number; m: number; d: number } {
  const dt = new Date(day * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

export function monthStart(y: number, m: number): number {
  return Math.round(Date.UTC(y, m, 1) / DAY_MS);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** 0 = lundi … 6 = dimanche */
export function weekday(day: number): number {
  return (new Date(day * DAY_MS).getUTCDay() + 6) % 7;
}

export function addMonthsDay(day: number, k: number): number {
  const { y, m, d } = parts(day);
  const target = new Date(Date.UTC(y, m + k, 1));
  const n = daysInMonth(target.getUTCFullYear(), target.getUTCMonth());
  return Math.round(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, n)) / DAY_MS);
}

export function localTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function fmtDay(day: number): string {
  const { y, m, d } = parts(day);
  return `${d} ${MONTHS[m]} ${y}`;
}

export function fmtDayShort(day: number): string {
  const { y, m, d } = parts(day);
  return `${d} ${MONTHS_SHORT[m]} ${String(y).slice(2)}`;
}

export function fmtMonth(y: number, m: number): string {
  return `${MONTHS[m].charAt(0).toUpperCase()}${MONTHS[m].slice(1)} ${y}`;
}

export function monthKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

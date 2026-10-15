import { addMonthsDay, fromDay, monthStart, parts } from './dates';
import { DEFAULT_RULES } from './rules';
import type { AppData, Contract } from './types';

export function emptyData(): AppData {
  return {
    version: 1,
    onboarded: false,
    profile: { releves: [], monthlyRefSalary: null, annexe: '8', over50: false },
    contracts: [],
    settings: { rules: { ...DEFAULT_RULES }, todayOverride: null, fallbackHourlyGross: 23, theme: 'auto' },
    releveReminderDismissed: null,
    toursSeen: [],
  };
}

/** Données d'exemple, calées sur la date du jour (5 mois passés, 4 mois simulés). */
export function demoData(today: number): AppData {
  const { y, m } = parts(today);
  const mk = (k: number, s: number, n: number, hours: number, gross: number, title: string, simulated = false): Contract => {
    const first = monthStart(y, m + k) + s - 1;
    return {
      id: `demo-${k}-${s}`, title, hours, gross, annexe: '8', simulated,
      days: Array.from({ length: n }, (_, i) => fromDay(first + i)),
    };
  };
  const data = emptyData();
  data.onboarded = true;
  data.contracts = [
    mk(-13, 15, 5, 40, 900, 'Festival d’automne'),
    mk(-5, 8, 6, 48, 1104, 'Cie Hors-Champ · création lumière'),
    mk(-4, 3, 4, 40, 880, 'Scène des Halles · montage'),
    mk(-4, 20, 2, 24, 700, 'Concert · 2 cachets'),
    mk(-3, 10, 7, 56, 1288, 'Festival Ondes Courtes'),
    mk(-2, 22, 3, 28, 644, 'Captation live'),
    mk(-1, 1, 6, 48, 1056, 'Cie Hors-Champ · tournée'),
    mk(-1, 14, 5, 40, 1150, 'Scène des Halles · festival'),
    mk(0, 6, 5, 40, 920, 'Scène des Halles · montage'),
    mk(0, 25, 3, 28, 756, 'Captation · 3 jours'),
    mk(1, 2, 6, 48, 1104, 'Tournée d’hiver', true),
    mk(1, 23, 3, 31, 930, 'Salon · régie', true),
    mk(2, 1, 5, 45, 1035, 'Spectacle de fin d’année', true),
    mk(2, 15, 3, 36, 1050, 'Réveillon · 3 cachets', true),
    mk(3, 12, 6, 48, 1200, 'Reprise de tournée', true),
    mk(4, 5, 5, 50, 1150, 'Résidence', true),
  ];
  const lastMonth = addMonthsDay(today, -1);
  data.profile.releves = [
    { id: 'r1', date: fromDay(monthStart(y, m - 5) + 3), daysLeft: 341, dailyAllowance: 48.7 },
    { id: 'r2', date: fromDay(lastMonth), daysLeft: 286, dailyAllowance: 48.7 },
  ];
  data.profile.monthlyRefSalary = 2599;
  return data;
}

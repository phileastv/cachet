/**
 * Contrats à venir, pour simuler la suite quand le droit d'option ne passe pas encore
 * avec les contrats connus. Ils sont marqués « simulés » et restent modifiables.
 */
import { daysInMonth, fromDay, monthStart, parts, toDay, weekday } from './dates';
import { contractEnd, sortContracts } from './engine';
import type { Annexe, Contract } from './types';

/** Dernier jour de contrat réel (non simulé, hors cours et formation). */
export function lastRealEnd(contracts: Contract[]): number | null {
  const real = sortContracts(contracts).filter((c) => !c.simulated && !c.teaching && !c.training);
  return real.length ? Math.max(...real.map(contractEnd)) : null;
}

/** Les N mois qui suivent le jour donné (le mois suivant celui de ce jour en premier). */
export function monthsAfter(day: number, n: number): { y: number; m: number; key: string }[] {
  const p = parts(day);
  return Array.from({ length: n }, (_, k) => {
    const s = monthStart(p.y, p.m + 1 + k);
    const q = parts(s);
    return { y: q.y, m: q.m, key: fromDay(s).slice(0, 7) };
  });
}

/** Les N mois à partir de celui qui contient le jour donné. */
export function monthsFrom(day: number, n: number): { y: number; m: number; key: string }[] {
  const p = parts(day);
  return monthsAfter(monthStart(p.y, p.m) - 1, n);
}

/**
 * Jour équivalent dans un autre mois : même jour de la semaine, même rang (le 2e mardi reste un 2e mardi),
 * pour que les jours travaillés restent des jours de semaine. Rang absent ce mois-là (5e lundi) : le dernier.
 */
export function sameWeekdayIn(day: number, y: number, m: number): number {
  const rank = Math.floor((parts(day).d - 1) / 7);
  const first = monthStart(y, m);
  let target = first + ((weekday(day) - weekday(first) + 7) % 7) + rank * 7;
  // Pas de 5e lundi ce mois-là : on prend le dernier
  while (target >= first + daysInMonth(y, m)) target -= 7;
  return target;
}

/** Recopie les contrats d'un mois passé sur les mois donnés (décalés pour garder leurs jours de la semaine), sans aucun jour avant « after ». */
export function copyMonthTo(contracts: Contract[], refKey: string, targets: { y: number; m: number }[], uid: () => string, after = -Infinity): Contract[] {
  const ref = contracts.filter((c) => !c.teaching && !c.training && c.days.some((d) => d.startsWith(refKey)));
  const out: Contract[] = [];
  for (const t of targets) {
    for (const c of ref) {
      const inRef = c.days.filter((d) => d.startsWith(refKey));
      // Le contrat est décalé d'un bloc : son premier jour garde son jour de la semaine et son rang, les autres suivent
      const firstRef = toDay([...inRef].sort()[0]);
      const anchor = sameWeekdayIn(firstRef, t.y, t.m);
      const monthEnd = monthStart(t.y, t.m) + daysInMonth(t.y, t.m) - 1;
      const days = inRef.map((d) => anchor + (toDay(d) - firstRef)).filter((d) => d > after && d <= monthEnd).sort((a, b) => a - b).map(fromDay);
      if (!days.length) continue;
      const share = (inRef.length / c.days.length) * (days.length / inRef.length);
      out.push({
        id: uid(), title: `${c.title.replace(/ \(AEM .*\)$/, '')} · prévu (comme ${refKey.slice(5)}/${refKey.slice(0, 4)})`, days,
        hours: Math.round(c.hours * share * 10) / 10, gross: Math.round(c.gross * share), annexe: c.annexe, simulated: true,
      });
    }
  }
  return out;
}

/** Un contrat prévu par mois : N jours de semaine au début du mois, au rythme moyen indiqué. */
export function roughMonths(plan: { y: number; m: number; days: number }[], perDay: { gross: number; hours: number }, annexe: Annexe, uid: () => string, after = -Infinity): Contract[] {
  return plan.filter((p) => p.days > 0).flatMap((p) => {
    const s = monthStart(p.y, p.m);
    const week: string[] = [];
    for (let d = Math.max(s, after + 1); d < s + daysInMonth(p.y, p.m) && week.length < p.days; d++) if (weekday(d) < 5) week.push(fromDay(d));
    if (!week.length) return [];
    return [{
      id: uid(), title: `Contrats prévus (${week.length} j)`, days: week,
      hours: Math.round(week.length * perDay.hours * 10) / 10, gross: Math.round(week.length * perDay.gross), annexe, simulated: true,
    }];
  });
}

/** Rythme moyen des contrats réels : salaire brut et heures par jour travaillé. */
export function averageRate(contracts: Contract[]): { gross: number; hours: number } | null {
  const real = contracts.filter((c) => !c.simulated && !c.teaching && !c.training && c.gross > 0);
  const days = real.reduce((a, c) => a + c.days.length, 0);
  if (!days) return null;
  return { gross: real.reduce((a, c) => a + c.gross, 0) / days, hours: real.reduce((a, c) => a + c.hours, 0) / days };
}

/** Mois passés (AAAA-MM) où il y a eu des contrats réels, du plus récent au plus ancien. */
export function workedMonths(contracts: Contract[]): string[] {
  const set = new Set<string>();
  for (const c of contracts) if (!c.simulated && !c.teaching && !c.training) for (const d of c.days) set.add(d.slice(0, 7));
  return [...set].sort().reverse();
}


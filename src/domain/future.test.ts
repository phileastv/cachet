import { describe, expect, it } from 'vitest';
import { averageRate, copyMonthTo, lastRealEnd, monthsAfter, monthsFrom, roughMonths, workedMonths } from './future';
import { toDay, weekday } from './dates';
import type { Contract } from './types';

const uid = (() => { let n = 0; return () => `f${n++}`; })();
const c = (days: string[], hours: number, gross: number, simulated = false): Contract => ({ id: uid(), title: 'Tournage', days, hours, gross, annexe: '8', simulated });
const real = [c(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13'], 32, 800), c(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'], 32, 800)];

describe('contrats à venir', () => {
  it('trouve la dernière fin de contrat réelle et les mois suivants', () => {
    expect(lastRealEnd([...real, c(['2026-12-01'], 8, 200, true)])).toBe(toDay('2026-10-01'));
    expect(monthsAfter(toDay('2026-10-01'), 3).map((x) => x.key)).toEqual(['2026-11', '2026-12', '2027-01']);
  });
  it('recopie un mois passé sur les mois suivants, en contrats simulés', () => {
    const out = copyMonthTo(real, '2026-08', monthsAfter(toDay('2026-10-01'), 2), uid);
    expect(out.map((x) => x.days)).toEqual([['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'], ['2026-12-10', '2026-12-11', '2026-12-12', '2026-12-13']]);
    expect(out.every((x) => x.simulated && x.hours === 32 && x.gross === 800)).toBe(true);
  });
  it('commence au mois en cours, sans jour avant la date donnée', () => {
    expect(monthsFrom(toDay('2026-10-15'), 2).map((x) => x.key)).toEqual(['2026-10', '2026-11']);
    const out = copyMonthTo(real, '2026-08', monthsFrom(toDay('2026-10-12'), 1), uid, toDay('2026-10-11'));
    expect(out[0].days).toEqual(['2026-10-12', '2026-10-13']);
    expect(out[0].hours).toBe(16);
  });
  it('ne recopie que la part du mois d’un contrat à cheval', () => {
    const out = copyMonthTo(real, '2026-09', monthsAfter(toDay('2026-10-01'), 1), uid);
    expect(out[0].days).toEqual(['2026-11-28', '2026-11-29', '2026-11-30']);
    expect(out[0].hours).toBe(24);
  });
  it('« environ N jours » : jours de semaine au rythme moyen', () => {
    const rate = averageRate(real)!;
    expect(rate).toEqual({ gross: 200, hours: 8 });
    const out = roughMonths([{ y: 2026, m: 10, days: 5 }, { y: 2026, m: 11, days: 0 }], rate, '8', uid);
    expect(out).toHaveLength(1);
    expect(out[0].days.every((d) => weekday(toDay(d)) < 5)).toBe(true);
    expect([out[0].days.length, out[0].hours, out[0].gross]).toEqual([5, 40, 1000]);
    expect(workedMonths(real)).toEqual(['2026-10', '2026-09', '2026-08']);
  });
});

import { describe, expect, it } from 'vitest';
import { aemContracts, openContracts, parseAem, pendingContract } from './aem';
import type { Row } from './releve';

// AEM fictives au gabarit XOTIS (libellés en image de fond : seules les valeurs sont du texte).
const row = (...cells: string[]): Row => ({ text: cells.join(' '), cells: cells.map((s, i) => ({ x: i * 50, s })) });
const xotis = (month: [string, string], ref: string, initial: string | null, start: string, end: string | null, hours: string, days: string, gross: string, contrib: string): Row[] => [
  row('241500001', 'XOTIS'),
  row('0', month[0], '2', month[1], ref, '12'),
  initial ? row('X', initial) : row('X'),
  row('12345678900011', '5911A', '80000000000'),
  row('2642'),
  row('PRODUCTION FICTIVE'),
  row('DUPONT', 'CAMILLE'),
  row('ASSISTANTE DECORATRICE', '251Z00000001'),
  row(start, end ?? 'X'),
  row(hours, days),
  row(gross, gross, '12,15', contrib),
  ...(end ? [row('fin de contrat à durée déterminée')] : []),
];
const uid = (() => { let n = 0; return () => `c${n++}`; })();

describe('lecture d’une AEM (gabarit XOTIS)', () => {
  const march = parseAem(xotis(['3', '6'], 'ABC1000001', null, '09 03 2026', null, '133', '17', '2 244,00', '273,00'))!;
  const april = parseAem(xotis(['4', '6'], 'ABC1000002', 'ABC1000001', '09 03 2026', '10 04 2026', '55', '8', '1 067,40', '130,00'))!;
  it('lit mois, dates, heures, jours et salaire, sans garder l’identité', () => {
    expect(march).toMatchObject({ ref: 'ABC1000001', month: '2026-03', start: '2026-03-09', end: null, hours: 133, workedDays: 17, gross: 2244, employer: 'PRODUCTION FICTIVE', job: 'ASSISTANTE DECORATRICE', annexe: '8', doubts: [] });
    expect(april).toMatchObject({ initialRef: 'ABC1000001', end: '2026-04-10', hours: 55, workedDays: 8, gross: 1067.4 });
    expect(JSON.stringify(march)).not.toContain('DUPONT');
  });
  it('un contrat par AEM, avec le nombre exact de jours travaillés du mois', () => {
    const cs = aemContracts([march, april], uid, '8');
    expect(cs.map((c) => [c.days.length, c.days[0], c.hours, c.gross])).toEqual([[17, '2026-03-09', 133, 2244], [8, '2026-04-01', 55, 1067.4]]);
    expect(openContracts([march, april])).toEqual([]);
  });
  it('deux AEM du même mois ne sont jamais posées sur le même jour', () => {
    const long = parseAem(xotis(['9', '5'], 'ABC1000010', null, '01 09 2025', '26 09 2025', '70', '9', '2 100,00', '255,15'))!;
    const one = parseAem(xotis(['9', '5'], 'ABC1000011', null, '05 09 2025', '05 09 2025', '5', '1', '150,00', '18,23'))!;
    const cs = aemContracts([long, one], uid, '8');
    const all = cs.flatMap((c) => c.days);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(10);
    expect(cs.find((c) => c.hours === 5)!.days).toEqual(['2025-09-05']);
  });
  it('contrat encore en cours : signalé, et sa suite peut être ajoutée jusqu’à la vraie date de fin', () => {
    const aug = parseAem(xotis(['8', '6'], 'ABC1000003', null, '31 08 2026', null, '8', '1', '120,00', '15,00'))!;
    expect(openContracts([aug]).map((a) => a.ref)).toEqual(['ABC1000003']);
    const p = pendingContract(aug, '2026-09-04', uid, '8')!;
    expect(p.days).toEqual(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']);
    expect(p.simulated).toBe(true);
  });
  it('refuse une ligne de salaire incohérente (contributions ≠ brut × taux)', () => {
    const bad = parseAem(xotis(['3', '6'], 'ABC1000004', null, '09 03 2026', null, '10', '2', '500,00', '999,00'));
    expect(bad).toBeNull();
  });
});

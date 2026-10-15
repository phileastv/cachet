import { describe, expect, it } from 'vitest';
import { latestInfo, parseReleve, suggestedUnpaid, waitingSeen, type Row } from './releve';

// Relevé fictif reproduisant la mise en page France Travail (positions x des colonnes comprises).
const row = (...cells: [number, string][]): Row => ({ text: cells.map((c) => c[1]).join(' '), cells: cells.map(([x, s]) => ({ x, s })) });
const ROWS: Row[] = [
  row([200, 'RELEVE DE SITUATION DU 02/03/2026 AU 16/03/2026']),
  row([30, 'FT16'], [60, 'PERIODE DU 05/01/2026 AU 31/01/2026 (27 jours)']),
  row([180, 'Allocations déjà versées'], [400, 'Allocations dues']),
  row([30, 'Janvier 2026'], [120, "Nb d'alloc."], [160, 'Montant'], [330, "Nb d'alloc."], [370, 'Montant']),
  row([30, 'Carence'], [120, '19']),
  row([30, "Différé d'Indemnisation"], [120, '7']),
  row([60, 'PERIODE DU 01/02/2026 AU 28/02/2026 (28 jours)'], [300, 'Paiement provisoire régularisé']),
  row([180, 'Pmt provisoire à déduire'], [400, 'Allocations dues']),
  row([30, 'Février 2026'], [120, "Nb d'alloc."], [160, 'Montant'], [330, "Nb d'alloc."], [370, 'Montant']),
  row([30, 'Jours non indemnisés :']),
  row([120, '15'], [330, '12']),
  row([30, 'travail']),
  row([30, "Allocation d'Aide au"]),
  row([330, '18'], [370, '720,00'], [420, '36,00'], [470, '684,00']),
  row([30, "Allocation d'Aide au"]),
  row([120, '15'], [160, '600,00']),
  row([30, 'DECOMPTE GENERAL']),
  row([30, 'INFORMATIONS SUR VOS DROITS AU 28/02/2026']),
  row([30, "Indemnisation à l' Allocation d'Aide au Retour à l'Emploi depuis le 31/01/2026 : 18 allocations journalières."]),
  row([30, "Durée d'indemnisation restante (en jours) : 412"]),
  row([30, "Allocation brute d'un montant journalier de 40,00 Euro tenant compte d'un Salaire Journalier de Référence de 66,00 Euro."]),
];

describe('lecture d’un relevé de situation', () => {
  const r = parseReleve(ROWS);
  it('reconnaît le document et lit le bloc « Informations sur vos droits »', () => {
    expect(r.isReleve).toBe(true);
    expect(latestInfo(r)).toEqual({ date: '2026-02-28', daysLeft: 412, dailyAllowance: 40, sjr: 66, since: '2026-01-31', paidSince: 18, intermittent: false });
  });
  it('lit la colonne des allocations dues, pas le provisoire à déduire', () => {
    const feb = r.months.find((m) => m.from === '2026-02-01')!;
    expect(feb.paidDays).toBe(18);
    expect(feb.unpaid).toEqual([{ label: 'travail', days: 12 }]);
    expect(feb.provisional).toBe(false);
  });
  it('signale carence et différé, et propose la période sans indemnisation', () => {
    expect(r.notes[0]).toContain('carence 19 j');
    expect(suggestedUnpaid(r)).toEqual([
      { from: '2026-01-01', to: '2026-01-04', reason: 'pas encore inscrit·e' },
      { from: '2026-01-05', to: '2026-01-30', reason: "carence + différé d'indemnisation" },
    ]);
    expect(waitingSeen(r)).toBe('2026-01-05');
  });
  it('rejette un document qui n’est pas un relevé', () => {
    expect(parseReleve([row([0, 'ATTESTATION EMPLOYEUR MENSUELLE'])]).isReleve).toBe(false);
  });
});

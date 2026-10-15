import { describe, expect, it } from 'vitest';
import { fmtDay, fromDay, toDay } from './dates';
import { demoData } from './demo';
import { simulate } from './engine';
import { intermittentDailyAllowance, DEFAULT_RULES } from './rules';
import type { Contract, Releve } from './types';
import { DEFAULT_PARAMS, horizon, runScenarios } from './scenarios';

const today = toDay('2026-10-06');

describe('règle des 70 %', () => {
  it('retire 70 % du salaire brut de l’allocation du mois', () => {
    const data = demoData(today);
    const hz = horizon(today, data.contracts);
    const sim = simulate({ contracts: data.contracts, profile: data.profile, rules: data.settings.rules, today, start: hz.start, end: hz.end });
    const oct = sim.months.find((m) => m.key === '2026-10')!;
    // 30 j × 48,70 = 1 461 ; brut 1 676 → 1 461 − 1 173,20 = 287,80 € = 5,91 j → arrondi au plus proche : 6 jours
    expect(oct.gross).toBeCloseTo(1676, 0);
    expect(oct.paidDays).toBe(6);
    const sept = sim.months.find((m) => m.key === '2026-09')!;
    expect(sept.paidDays).toBe(0); // salaire trop élevé : rien n'est versé
  });
});

// Cas inspiré d'un dossier réel (chiffres modifiés) : AJ brute 41,20 €, février payé 30 − 12 jours.
const contract = (id: string, from: string, to: string, hours: number, gross: number): Contract => {
  const days: string[] = [];
  for (let d = toDay(from); d <= toDay(to); d++) days.push(fromDay(d));
  return { id, title: id, days, hours, gross, annexe: '8', simulated: false };
};
const realContracts = [
  contract('a', '2026-02-23', '2026-02-28', 40, 700),
  contract('b', '2026-03-01', '2026-03-06', 40, 700),
  contract('c', '2026-03-09', '2026-04-10', 190, 3400),
  contract('d', '2026-05-25', '2026-06-19', 160, 3250),
  contract('e', '2026-06-22', '2026-07-31', 240, 4100),
  contract('f', '2026-08-10', '2026-08-28', 120, 2150),
  contract('g', '2026-08-31', '2026-08-31', 8, 130),
];
const realSim = (releve: Releve) =>
  simulate({
    contracts: realContracts,
    profile: { releves: [releve], monthlyRefSalary: null, annexe: '8', over50: false },
    rules: DEFAULT_RULES,
    today: toDay('2026-09-09'),
    start: toDay('2026-01-01'),
    end: toDay('2027-03-31'),
  });

describe('mensualisation (cas inspiré d’un dossier réel)', () => {
  it('février : 30 − 12 jours non indemnisés = 18 jours, comme le relevé', () => {
    const sim = realSim({ id: 'r', date: '2026-02-28', daysLeft: 450, dailyAllowance: 41.2 });
    const feb = sim.months.find((m) => m.key === '2026-02')!;
    expect(feb.paidDays).toBe(18);
    expect(feb.paid).toBeCloseTo(18 * 41.2, 2); // 0,7 × 700 € ÷ 41,20 € = 11,9 → 12 jours non indemnisés
    expect(sim.months.find((m) => m.key === '2026-03')!.paidDays).toBe(0);
  });
  it('un mois de 31 jours sans contrat verse 30 jours', () => {
    const sim = realSim({ id: 'r', date: '2026-08-31', daysLeft: 430, dailyAllowance: 41.2 });
    const dec = sim.months.find((m) => m.key === '2026-12')!;
    expect(dec.paidDays).toBe(30);
  });
  it('demande du 09/09 (fin de contrat le 31/08) : écart ≈ +29 % selon la formule France Travail, refus de justesse', () => {
    // Relevé : 432 j, AJ brute 41,20 €, SJR 68,40 € → AJ retenue 41,20 − 2,05 = 39,15 € ; délai d'attente déjà appliqué
    const sim = simulate({
      contracts: realContracts,
      profile: { releves: [{ id: 'r', date: '2026-08-31', daysLeft: 432, dailyAllowance: 41.2, sjr: 68.4 }], monthlyRefSalary: null, annexe: '8', over50: false, waitingApplied: true },
      rules: DEFAULT_RULES, today: toDay('2026-09-09'), start: toDay('2026-01-01'), end: toDay('2027-03-31'),
    });
    const s = sim.requestInfo(toDay('2026-09-09'));
    expect(s.hours).toBe(798);
    expect(s.presumed!.aj).toBe(63.64);
    expect(s.presumed!.elapsed).toBe(9);
    expect(s.presumed!.franchiseCP).toBe(13); // 131 jours de contrat × 2,5 / 24
    expect(s.presumed!.globalDays).toBe(343);
    expect(s.capital).toBeCloseTo(432 * 39.15, 2);
    expect(s.ecart!).toBeCloseTo((343 * 63.64) / (432 * 39.15) - 1, 6);
    expect(s.ecart!).toBeLessThan(0.3);
    expect(s.status).toBe('gap');
  });
});

describe('droit d’option : cas réels de France Travail', () => {
  it('AJ intermittente tronquée au centime : 60,48 € (notification 2026) et 57,71 € (simulateur 2023)', () => {
    expect(intermittentDailyAllowance(15_825, 524, '8', DEFAULT_RULES)).toBe(60.48);
    expect(intermittentDailyAllowance(12_320.65, 731, '8', DEFAULT_RULES)).toBe(57.71);
  });
  it('le montant global retire les jours écoulés depuis la fin de contrat, le délai d’attente et les franchises', () => {
    // 61 jours travaillés → franchise CP 6 j ; demande 2 jours après la fin de contrat ; délai de 7 j à appliquer
    const days: string[] = [];
    for (let d = toDay('2025-07-01'); days.length < 61; d += 5) days.push(fromDay(d));
    days.push('2026-06-30');
    const c: Contract = { id: 'x', title: 'x', days, hours: 524, gross: 15_825, annexe: '8', simulated: false };
    const sim = simulate({
      contracts: [c], profile: { releves: [{ id: 'r', date: '2026-06-30', daysLeft: 12, dailyAllowance: 43.71 }], monthlyRefSalary: null, annexe: '8', over50: false },
      rules: DEFAULT_RULES, today: toDay('2026-07-02'), start: toDay('2026-06-01'), end: toDay('2026-12-31'),
    });
    const p = sim.requestInfo(toDay('2026-07-02')).presumed!;
    expect(p.aj).toBe(60.48);
    expect(p.workedDays).toBe(62);
    expect([p.elapsed, p.waiting, p.franchiseCP, p.franchiseSalary]).toEqual([2, 7, 6, 0]);
    expect(p.globalDays).toBe(365 - 2 - 7 - 6);
  });
});

describe('période de référence et demandes', () => {
  const rel: Releve = { id: 'r', date: '2026-09-30', daysLeft: 300, dailyAllowance: 40 };
  const run = (contracts: Contract[], extra: Partial<Parameters<typeof simulate>[0]['profile']> = {}) => simulate({
    contracts, profile: { releves: [rel], monthlyRefSalary: null, annexe: '8', over50: false, ...extra },
    rules: DEFAULT_RULES, today: toDay('2026-10-01'), start: toDay('2026-01-01'), end: toDay('2027-06-30'),
  });
  it('fenêtre de 365 jours au jour près : un contrat à cheval ne compte que pour ses jours dedans', () => {
    // FCT le 30/06/2026 → période du 01/07/2025 au 30/06/2026 ; le premier contrat a 5 jours sur 10 dedans
    const sim = run([contract('a', '2025-06-26', '2025-07-05', 100, 3000), contract('b', '2026-06-21', '2026-06-30', 500, 15_000)]);
    expect(sim.requestInfo(toDay('2026-07-01')).hours).toBe(550);
    // Un contrat fini 365 jours avant la FCT ne compte plus
    const sim2 = run([contract('a', '2025-06-21', '2025-06-30', 100, 3000), contract('b', '2026-06-21', '2026-06-30', 500, 15_000)]);
    expect(sim2.requestInfo(toDay('2026-07-01')).hours).toBe(500);
  });
  it('les heures d’enseignement comptent pour les 507 h, pas dans la partie B de l’AJ', () => {
    const teach: Contract = { ...contract('t', '2026-05-01', '2026-05-10', 70, 0), teaching: true };
    const sim = run([contract('a', '2026-03-01', '2026-06-30', 450, 13_000), teach]);
    const p = sim.requestInfo(toDay('2026-07-01')).presumed!;
    expect(p.hours).toBe(520);
    expect(p.nht).toBe(450);
  });
  it('une fin de contrat déjà examinée ne peut pas resservir', () => {
    const cs = [contract('a', '2025-12-01', '2026-03-31', 600, 18_000)];
    expect(run(cs).requestInfo(toDay('2026-10-02')).status).not.toBe('used');
    const sim = run(cs, { priorRequests: [{ id: 'p', date: '2026-04-15' }] });
    expect(sim.requestInfo(toDay('2026-10-02')).status).toBe('used');
  });
});

describe('reliquat en jours', () => {
  it('relevé du 31/10/2025 (12 j) et rien de versé jusqu’au 08/07/2026 : 12 j au début de juillet 2026', () => {
    const sim = simulate({
      contracts: [], profile: {
        releves: [{ id: 'r', date: '2025-10-31', daysLeft: 12, dailyAllowance: 43.71 }], monthlyRefSalary: null, annexe: '8', over50: false,
        unpaidPeriods: [{ id: 'u', from: '2025-11-01', to: '2026-07-08' }],
      },
      rules: DEFAULT_RULES, today: toDay('2026-07-02'), start: toDay('2025-10-01'), end: toDay('2026-08-31'),
    });
    expect(sim.months.find((m) => m.key === '2025-11')!.capStartDays).toBe(12);
    const jul = sim.months.find((m) => m.key === '2026-07')!;
    expect(jul.capStartDays).toBe(12);
    expect(jul.paidDays).toBe(12); // 30 − 8 jours sans indemnisation = 22, limité au reliquat
  });
  it('l’historique estimé se recale sur chaque relevé daté d’une fin de mois', () => {
    // Relevés au 31/03 (300 j) et au 30/06 (280 j) : entre les deux, 20 j payés selon France Travail,
    // alors que le moteur, sans les salaires de la période, en reconstruirait 90.
    const sim = simulate({
      contracts: [], profile: {
        releves: [{ id: 'a', date: '2024-03-31', daysLeft: 300, dailyAllowance: 40 }, { id: 'b', date: '2024-06-30', daysLeft: 280, dailyAllowance: 40 }],
        monthlyRefSalary: null, annexe: '8', over50: false,
      },
      rules: DEFAULT_RULES, today: toDay('2024-07-15'), start: toDay('2024-01-01'), end: toDay('2024-12-31'),
    });
    expect(sim.months.find((m) => m.key === '2024-03')!.capEndDays).toBe(300);
    expect(sim.months.find((m) => m.key === '2024-06')!.capEndDays).toBe(280);
    expect(sim.months.find((m) => m.key === '2024-07')!.capStartDays).toBe(280);
  });
  it('mensualisation datée : un mois de 31 jours sans contrat verse 31 jours en 2024, 30 en 2026', () => {
    const sim = simulate({
      contracts: [], profile: { releves: [{ id: 'r', date: '2024-01-01', daysLeft: 900, dailyAllowance: 40 }], monthlyRefSalary: null, annexe: '8', over50: false },
      rules: DEFAULT_RULES, today: toDay('2024-01-02'), start: toDay('2024-01-01'), end: toDay('2026-01-31'),
    });
    expect(sim.months.find((m) => m.key === '2024-03')!.paidDays).toBe(31);
    expect(sim.months.find((m) => m.key === '2024-02')!.paidDays).toBe(29);
    expect(sim.months.find((m) => m.key === '2025-12')!.paidDays).toBe(30);
  });
});

describe('allocation intermittente', () => {
  it('applique le plancher de l’annexe 8', () => {
    expect(intermittentDailyAllowance(5000, 507, '8', DEFAULT_RULES)).toBe(38);
  });
  it('grandit avec le salaire et les heures', () => {
    const a = intermittentDailyAllowance(14_000, 600, '8', DEFAULT_RULES);
    const b = intermittentDailyAllowance(20_000, 800, '8', DEFAULT_RULES);
    expect(b).toBeGreaterThan(a);
  });
});

describe('scénarios', () => {
  it('trouve un jour de demande sans contrat', () => {
    const data = demoData(today);
    const res = runScenarios(data, today, DEFAULT_PARAMS);
    for (const r of res) {
      const d = r.sim.requestDay;
      console.log(r.id.padEnd(7), d ? fmtDay(d.day) + ' · ' + Math.round(d.hours) + ' h · écart ' + (d.ecart === null ? '-' : Math.round(d.ecart * 100) + ' %') : 'impossible');
      if (d) expect(d.hours).toBeGreaterThanOrEqual(507);
    }
    expect(res[0].sim.requestDay).not.toBeNull();
  });
});

describe('contrats à cheval sur deux mois', () => {
  it('le contrat apparaît dans les deux mois, heures et salaire répartis par jour', () => {
    const c = contract('x', '2026-09-28', '2026-10-03', 48, 1200);
    const sim = simulate({
      contracts: [c],
      profile: { releves: [{ id: 'r', date: '2026-09-01', daysLeft: 300, dailyAllowance: 40 }], monthlyRefSalary: null, annexe: '8', over50: false },
      rules: DEFAULT_RULES, today: toDay('2026-10-07'), start: toDay('2026-09-01'), end: toDay('2026-10-31'),
    });
    const sep = sim.months.find((m) => m.key === '2026-09')!;
    const oct = sim.months.find((m) => m.key === '2026-10')!;
    expect(sep.contracts.map((x) => x.id)).toEqual(['x']);
    expect(oct.contracts.map((x) => x.id)).toEqual(['x']);
    expect(sep.hours).toBeCloseTo(24, 5);
    expect(oct.gross).toBeCloseTo(600, 5);
  });
});

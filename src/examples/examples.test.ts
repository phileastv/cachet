import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { fmtDay, fromDay, toDay } from '../domain/dates';
import { emptyData } from '../domain/demo';
import { DEFAULT_PARAMS, runScenarios } from '../domain/scenarios';
import { diagnose } from '../domain/situation';
import type { SituationKind } from '../domain/situation';
import type { AppData, Contract } from '../domain/types';

const TODAY = '2026-10-07';
let n = 0;
const c = (from: string, to: string, hours: number, gross: number, title: string, simulated = false, weekdaysOnly = false): Contract => {
  const days: string[] = [];
  for (let d = toDay(from); d <= toDay(to); d++) {
    const wd = (new Date(d * 86_400_000).getUTCDay() + 6) % 7;
    if (weekdaysOnly && wd >= 5) continue;
    days.push(fromDay(d));
  }
  return { id: `ex${++n}`, title, days, hours, gross, annexe: '8', simulated };
};
const make = (name: string, releve: [string, number, number], contracts: Contract[], extra: Partial<AppData['profile']> = {}): [string, AppData] => {
  const d = emptyData();
  d.onboarded = true;
  d.toursSeen = ['contrats', 'tableau'];
  d.settings.todayOverride = TODAY;
  d.profile = { ...d.profile, ...extra, releves: [{ id: 'r1', date: releve[0], daysLeft: releve[1], dailyAllowance: releve[2] }] };
  d.contracts = contracts;
  return [name, d];
};

const EX: [string, AppData][] = [
  make('1-a-l-aise-quand-demander', ['2026-09-30', 340, 38.5], [
    c('2026-01-12', '2026-02-06', 160, 2900, 'Tournage série · régie', false, true),
    c('2026-03-02', '2026-04-03', 200, 3600, 'Long-métrage · machiniste', false, true),
    c('2026-05-04', '2026-06-12', 240, 4300, 'Série TV · régie', false, true),
    c('2026-07-06', '2026-07-31', 160, 2800, 'Festival · montage', false, true),
    c('2026-09-07', '2026-09-25', 120, 2100, 'Pub · machiniste', false, true),
    c('2026-10-12', '2026-10-23', 80, 1400, 'Clip · régie', true, true),
    c('2026-11-02', '2026-11-27', 160, 2800, 'Téléfilm · régie', true, true),
  ]),
  make('2-de-justesse', ['2026-09-30', 300, 46], [
    c('2026-01-19', '2026-01-30', 70, 1450, 'Théâtre · montage', false, true),
    c('2026-03-09', '2026-03-20', 80, 1700, 'Tournée · lumière', false, true),
    c('2026-05-11', '2026-05-22', 80, 1700, 'Festival · lumière', false, true),
    c('2026-06-15', '2026-06-26', 80, 1700, 'Opéra · plateau', false, true),
    c('2026-08-17', '2026-08-28', 80, 1650, 'Festival d’été · lumière', false, true),
    c('2026-09-14', '2026-09-25', 80, 1700, 'Création · lumière', false, true),
    c('2026-10-12', '2026-10-16', 40, 850, 'Concert · lumière', true, true),
  ]),
  make('3-il-manque-des-heures', ['2026-09-30', 300, 44], [
    c('2026-04-13', '2026-04-17', 40, 900, 'Concert · son', false, true),
    c('2026-06-08', '2026-06-12', 40, 900, 'Festival · son', false, true),
    c('2026-07-06', '2026-07-17', 80, 1800, 'Festival · son', false, true),
    c('2026-09-07', '2026-09-18', 80, 1800, 'Tournée · son', false, true),
    c('2026-10-12', '2026-10-23', 80, 1800, 'Tournée · son', true, true),
    c('2026-11-09', '2026-11-20', 80, 1800, 'Salon · son', true, true),
    c('2026-12-07', '2026-12-18', 80, 1800, 'Gala · son', true, true),
    c('2027-01-11', '2027-01-22', 80, 1800, 'Tournée · son', true, true),
  ]),
  make('4-ecart-trop-faible', ['2026-09-30', 640, 62], [
    c('2026-01-05', '2026-01-30', 140, 2200, 'Série · déco', false, true),
    c('2026-03-02', '2026-03-27', 140, 2200, 'Série · déco', false, true),
    c('2026-05-04', '2026-05-29', 140, 2200, 'Film · déco', false, true),
    c('2026-07-06', '2026-07-31', 140, 2200, 'Film · déco', false, true),
    c('2026-09-07', '2026-10-02', 140, 2200, 'Série · déco', false, true),
    c('2026-11-02', '2026-11-27', 140, 2200, 'Série · déco', true, true),
    c('2027-01-04', '2027-01-29', 140, 2200, 'Film · déco', true, true),
  ]),
  make('5-ecart-dans-quelques-mois', ['2026-09-30', 300, 50], [
    c('2026-01-05', '2026-01-30', 140, 2300, 'Série · déco', false, true),
    c('2026-03-02', '2026-03-27', 140, 2300, 'Série · déco', false, true),
    c('2026-05-04', '2026-05-29', 140, 2300, 'Film · déco', false, true),
    c('2026-07-06', '2026-07-31', 140, 2300, 'Film · déco', false, true),
    c('2026-09-07', '2026-09-25', 100, 1700, 'Série · déco', false, true),
  ]),
  make('6-chomage-bientot-epuise', ['2026-09-30', 75, 41], [
    c('2026-02-09', '2026-02-20', 80, 1500, 'Théâtre · plateau', false, true),
    c('2027-01-04', '2027-01-29', 160, 3000, 'Création · plateau', true, true),
    c('2027-02-01', '2027-02-26', 160, 3000, 'Tournée · plateau', true, true),
    c('2027-03-01', '2027-03-26', 160, 3000, 'Tournée · plateau', true, true),
    c('2027-04-05', '2027-04-30', 160, 3000, 'Festival · plateau', true, true),
  ]),
  make('7-jamais-507-heures', ['2026-09-30', 400, 40], [
    c('2026-03-09', '2026-03-13', 40, 800, 'Concert · accueil', false, true),
    c('2026-06-15', '2026-06-19', 40, 800, 'Festival · accueil', false, true),
    c('2026-09-14', '2026-09-18', 40, 800, 'Salon · accueil', false, true),
    c('2026-11-16', '2026-11-20', 40, 800, 'Gala · accueil', true, true),
  ]),
  make('8-petite-allocation', ['2026-09-30', 250, 18.5], [
    c('2026-01-12', '2026-02-06', 160, 2400, 'Théâtre · régie', false, true),
    c('2026-03-02', '2026-03-27', 160, 2400, 'Tournée · régie', false, true),
    c('2026-05-04', '2026-05-29', 160, 2400, 'Festival · régie', false, true),
    c('2026-09-07', '2026-09-18', 80, 1200, 'Création · régie', false, true),
  ]),
];

/** Situation attendue pour chaque exemple. */
const EXPECTED: Record<string, SituationKind> = {
  '1-a-l-aise-quand-demander': 'comfortable',
  '2-de-justesse': 'tight',
  '3-il-manque-des-heures': 'later-hours',
  '4-ecart-trop-faible': 'never-gap',
  '5-ecart-dans-quelques-mois': 'later-gap',
  '6-chomage-bientot-epuise': 'exhausted',
  '7-jamais-507-heures': 'never-hours',
  '8-petite-allocation': 'low-allowance',
};

// `npm run examples` réécrit les fichiers JSON de src/examples/ ; sinon le test vérifie seulement.
it('chaque exemple correspond à sa situation', () => {
  const today = toDay(TODAY);
  for (const [name, data] of EX) {
    const res = runScenarios(data, today, DEFAULT_PARAMS);
    const s = diagnose(res, data.contracts, today, data.settings.rules);
    expect(s.kind, name).toBe(EXPECTED[name]);
    if (process.env.WRITE_EXAMPLES) {
      const r = res[0].sim.requestDay;
      console.log(name.padEnd(28), s.kind.padEnd(14), r ? fmtDay(r.day) : '-');
      writeFileSync(`src/examples/${name}.json`, JSON.stringify(data, null, 2) + '\n');
    }
  }
});

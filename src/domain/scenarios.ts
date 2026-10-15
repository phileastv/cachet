import { addMonthsDay, daysInMonth, fromDay, MONTHS, monthStart, parts, toDay } from './dates';
import { contractEnd, contractStart, simulate, type Simulation } from './engine';
import type { AppData, Contract } from './types';

export type ScenarioId = 'plan' | 'habit' | 'stop' | 'plus' | 'minus' | 'sprint' | 'fond' | 'alt' | 'cours' | 'formation' | 'arce';

export interface ScenarioParams {
  stopMonth: number | null; // index de mois futur (0 = mois prochain)
  plusPct: number;
  plusRef: string | null; // AAAA-MM
  minusPct: number;
  minusRef: string | null;
  arceMonth: number;
  intenseHours: number;
  /** Mois témoin (AAAA-MM) recopié indéfiniment, ou null = rythme moyen. */
  habitRef: string | null;
  trainingHours: number;
}

export const DEFAULT_PARAMS: ScenarioParams = {
  stopMonth: null, plusPct: 50, plusRef: null, minusPct: 50, minusRef: null, arceMonth: 0, intenseHours: 80, habitRef: null, trainingHours: 150,
};

export interface Pattern {
  hoursPerDay: number;
  grossPerDay: number;
  avgLength: number;
  monthlyHours: number;
  perMonth: { key: string; label: string; hours: number }[];
  titles: string[];
}

export interface ScenarioResult {
  id: ScenarioId;
  title: string;
  description: string;
  warning?: string;
  note?: string;
  sim: Simulation;
  contracts: Contract[];
  arceDay: number | null;
  /** Mois choisi par défaut automatiquement (scénario « arrêter »). */
  autoStop?: boolean;
  stopMonth?: number;
  /** « main » = stratégies de rythme de travail ; « other » = autres solutions. */
  group: 'main' | 'other';
}

export interface Horizon { today: number; start: number; end: number; firstFuture: number }

export function horizon(today: number, contracts: Contract[]): Horizon {
  const { y, m } = parts(today);
  // Début : 1 mois avant le premier contrat (au plus 3 ans en arrière), sinon 3 mois avant aujourd'hui.
  let start = monthStart(y, m - 3);
  if (contracts.length) {
    const first = parts(Math.min(...contracts.map(contractStart)));
    start = Math.max(monthStart(first.y, first.m - 1), monthStart(y, m - 36));
  }
  // Fin : au moins 12 mois après aujourd'hui, et 1 mois après le dernier contrat.
  let endMonth = monthStart(y, m + 13);
  if (contracts.length) {
    const last = parts(Math.max(...contracts.map(contractEnd)));
    endMonth = Math.max(endMonth, monthStart(last.y, last.m + 2));
  }
  const sp = parts(start);
  endMonth = Math.max(endMonth, monthStart(sp.y, sp.m + 12));
  return { today, start, end: endMonth - 1, firstFuture: monthStart(y, m + 1) };
}

export function pattern(contracts: Contract[], today: number, fallbackHourly: number): Pattern {
  const past = contracts.filter((c) => !c.simulated && !c.generated && !c.teaching && contractEnd(c) <= today && contractEnd(c) > today - 365);
  const days = past.reduce((a, c) => a + c.days.length, 0);
  const hours = past.reduce((a, c) => a + c.hours, 0);
  const gross = past.reduce((a, c) => a + c.gross, 0);
  const firstDay = past.length ? Math.min(...past.map(contractStart)) : today;
  const monthsCovered = Math.max(1, Math.min(12, Math.round((today - firstDay) / 30.4)));
  const { y, m } = parts(today);
  const perMonth: Pattern['perMonth'] = [];
  for (let k = 6; k >= 0; k--) {
    const s = monthStart(y, m - k);
    const pm = parts(s);
    const n = daysInMonth(pm.y, pm.m);
    const h = past.filter((c) => contractStart(c) >= s && contractStart(c) < s + n).reduce((a, c) => a + c.hours, 0);
    perMonth.push({ key: fromDay(s).slice(0, 7), label: `${MONTHS[pm.m]} ${pm.y}`, hours: h });
  }
  return {
    hoursPerDay: days ? hours / days : 8,
    grossPerDay: days ? gross / days : 8 * fallbackHourly,
    avgLength: past.length ? Math.max(1, Math.min(7, Math.round(days / past.length))) : 5,
    monthlyHours: hours / monthsCovered,
    perMonth,
    titles: [...new Set(past.map((c) => c.title.split(' · ')[0]))].slice(0, 5),
  };
}

/** Fabrique des contrats fictifs qui ressemblent à ceux de l'utilisateur. */
export function generate(p: Pattern, hz: Horizon, hoursFor: (k: number, acc: number) => number, startHours: number): Contract[] {
  const out: Contract[] = [];
  const titles = p.titles.length ? p.titles : ['Contrat'];
  let acc = startHours;
  for (let k = 0; ; k++) {
    const s = addMonthsDay(hz.firstFuture, k);
    if (s > hz.end) break;
    const { y, m } = parts(s);
    const n = daysInMonth(y, m);
    const H = Math.max(0, Math.round(hoursFor(k, acc)));
    acc += H;
    if (!H) continue;
    const total = Math.max(1, Math.round(H / p.hoursPerDay));
    const starts = [3, 15, 9, 22, 27, 6];
    let left = total;
    let b = 0;
    while (left > 0 && b < starts.length) {
      const len = Math.min(p.avgLength, left, n - starts[b] + 1);
      const days: string[] = [];
      for (let i = 0; i < len; i++) days.push(fromDay(s + starts[b] - 1 + i));
      out.push({
        id: `gen-${k}-${b}`,
        title: `${titles[(k + b) % titles.length]} · fictif`,
        days,
        hours: Math.round((H * len) / total),
        gross: Math.round(len * p.grossPerDay),
        annexe: '8',
        simulated: true,
        generated: true,
      });
      left -= len;
      b++;
    }
  }
  return out;
}

/** Mois de référence par défaut : le dernier mois passé où l'on a travaillé. */
export function defaultRef(p: Pattern): Pattern['perMonth'][number] {
  for (let i = p.perMonth.length - 2; i >= 0; i--) if (p.perMonth[i].hours > 0) return p.perMonth[i];
  return p.perMonth[p.perMonth.length - 1];
}

export function runScenarios(data: AppData, today: number, params: ScenarioParams): ScenarioResult[] {
  const rules = data.settings.rules;
  const all = data.contracts;
  const hz = horizon(today, all);
  const p = pattern(all, today, data.settings.fallbackHourlyGross);
  const signed = all.filter((c) => !c.simulated);
  const run = (contracts: Contract[], arceDay: number | null = null, requestOverride: number | null = null) =>
    simulate({ contracts, profile: data.profile, rules, today, start: hz.start, end: hz.end, arceDay, requestOverride });
  const override = data.requestDayOverride ? toDay(data.requestDayOverride) : null;
  const plan = run(all, null, override);
  const nowHours = plan.at(today).hours;
  const base = Math.round(p.monthlyHours);
  const gen = (f: (k: number, acc: number) => number) => signed.concat(generate(p, hz, f, nowHours));
  const futureLabel = (k: number) => {
    const { y, m } = parts(addMonthsDay(hz.firstFuture, k));
    return `${MONTHS[m]} ${y}`;
  };
  const refOf = (key: string | null) => p.perMonth.find((x) => x.key === key) ?? defaultRef(p);
  const refHours = (key: string | null) => refOf(key).hours;
  const refLabel = (key: string | null) => refOf(key).label;

  const results: ScenarioResult[] = [];
  const health = 'Techniquement possible. Mais est-ce réaliste avec vos employeurs… et tenable pour votre santé ?';
  results.push({ id: 'plan', group: 'main', title: 'Votre plan actuel', description: 'Vos contrats signés et vos contrats simulés, tels que saisis.', sim: plan, contracts: all, arceDay: null });

  // Comme d'habitude : un mois témoin recopié chaque mois, ou le rythme moyen
  const refContracts = params.habitRef ? signed.filter((c) => c.days[0].slice(0, 7) === params.habitRef && !c.teaching && !c.training) : [];
  const habitC = refContracts.length ? signed.concat(copyMonth(refContracts, hz)) : gen(() => base);
  results.push({
    id: 'habit', group: 'main', title: 'Travailler comme d’habitude',
    description: refContracts.length
      ? `Les contrats de ${refLabel(params.habitRef)} recopiés chaque mois (${refContracts.reduce((a, c) => a + c.hours, 0)} h).`
      : `Votre rythme moyen des 12 derniers mois : ${base} h par mois, avec vos salaires habituels.`,
    sim: run(habitC), contracts: habitC, arceDay: null,
  });

  // Arrêter : premier mois qui marche, ou celui choisi
  const stopFor = (S: number) => gen((k) => (k <= S ? base : 0));
  let stopMonth = params.stopMonth;
  let autoStop = false;
  if (stopMonth === null) {
    autoStop = true;
    stopMonth = 11;
    for (let S = -1; S < 12; S++) {
      if (run(stopFor(S)).requestDay) { stopMonth = S; break; }
    }
  }
  const stopC = stopFor(stopMonth);
  results.push({
    id: 'stop', group: 'main', title: 'Arrêter de travailler pour écouler le chômage',
    description: stopMonth < 0
      ? 'Plus aucun nouveau contrat dès maintenant : le chômage est versé en entier chaque mois et fond vite.'
      : `Rythme habituel (${base} h/mois) jusqu’à fin ${futureLabel(stopMonth)}, puis plus de contrat : le chômage est versé en entier et fond vite.`,
    sim: run(stopC), contracts: stopC, arceDay: null, autoStop, stopMonth,
  });

  const plusH = Math.round(refHours(params.plusRef) * (1 + params.plusPct / 100));
  const plusC = gen(() => plusH);
  results.push({ id: 'plus', group: 'main', title: 'Travailler plus que d’habitude', description: `+${params.plusPct} % par rapport à ${refLabel(params.plusRef)} : ${plusH} h chaque mois.`, warning: health, sim: run(plusC), contracts: plusC, arceDay: null });

  const minusH = Math.round(refHours(params.minusRef) * (1 - params.minusPct / 100));
  const minusC = gen(() => minusH);
  results.push({ id: 'minus', group: 'main', title: 'Travailler moins que d’habitude', description: `−${params.minusPct} % par rapport à ${refLabel(params.minusRef)} : ${minusH} h chaque mois.`, sim: run(minusC), contracts: minusC, arceDay: null });

  const sprintC = gen((_k, acc) => (acc < rules.hoursRequired ? params.intenseHours : 0));
  results.push({ id: 'sprint', group: 'main', title: 'Sprint jusqu’à 507 h, puis lever le pied', description: `${params.intenseHours} h/mois jusqu’à passer les 507 h, puis plus de contrat.`, warning: health, sim: run(sprintC), contracts: sprintC, arceDay: null });

  const fondC = gen(() => params.intenseHours);
  results.push({ id: 'fond', group: 'main', title: 'Travailler à fond', description: `${params.intenseHours} h/mois en continu : les heures montent, mais le chômage ne s’écoule presque plus.`, warning: health, sim: run(fondC), contracts: fondC, arceDay: null });

  const altC = gen((k) => (k % 2 === 0 ? params.intenseHours : 0));
  results.push({ id: 'alt', group: 'main', title: 'Travailler un mois sur deux', description: `≈ ${params.intenseHours} h un mois, rien le suivant : le chômage s’écoule pendant les mois creux.`, sim: run(altC), contracts: altC, arceDay: null });

  // --- Autres solutions
  const cap = data.profile.over50 ? rules.teachingCap50 : rules.teachingCap;
  const teach: Contract = {
    id: 'gen-cours', title: 'Cours dans un établissement agréé · fictif', annexe: '8', simulated: true, generated: true, teaching: true,
    hours: cap, gross: 0, days: Array.from({ length: 10 }, (_, i) => fromDay(hz.firstFuture + 7 + i * 7)),
  };
  const coursC = all.concat([teach]);
  results.push({
    id: 'cours', group: 'other', title: 'Donner des cours (heures d’enseignement)',
    description: `Votre plan + ${cap} h de cours artistiques ou techniques dans un établissement agréé : elles comptent pour les 507 h.`,
    note: `Plafond : ${rules.teachingCap} h (${rules.teachingCap50} h à 50 ans et plus). Elles ne comptent pas dans le montant de l’allocation.`,
    sim: run(coursC), contracts: coursC, arceDay: null,
  });

  const trainH = Math.max(0, Math.min(params.trainingHours, rules.assimilatedCap));
  const training: Contract = {
    id: 'gen-formation', title: 'Formation professionnelle · fictif', annexe: '8', simulated: true, generated: true, training: true,
    hours: trainH, gross: 0, days: Array.from({ length: Math.max(1, Math.round(trainH / 7)) }, (_, i) => fromDay(hz.firstFuture + i + Math.floor(i / 5) * 2)),
  };
  const formC = all.concat([training]);
  results.push({
    id: 'formation', group: 'other', title: 'Suivre une formation',
    description: `Votre plan + ${trainH} h de formation professionnelle. Certaines formations comptent comme des heures de travail pour les 507 h.`,
    note: `Jusqu’à ${rules.assimilatedCap} h (2/3 de 507), cours compris, pour des formations non rémunérées par le chômage (ex. financées par l’AFDAS). Une période de travail après la formation est en principe nécessaire (sauf parcours de transition professionnelle). À faire confirmer par France Travail avant de compter dessus.`,
    sim: run(formC), contracts: formC, arceDay: null,
  });

  const arceDay = addMonthsDay(hz.firstFuture, params.arceMonth);
  results.push({
    id: 'arce', group: 'other', title: 'Créer une entreprise et demander l’ARCE',
    description: `Votre plan, avec l’ARCE demandée en ${futureLabel(params.arceMonth)} : 60 % de votre chômage restant vous est versé en capital (en 2 fois). Ce qui reste ne vaut plus que 40 %, et l’écart de 30 % est vite atteint.`,
    note: 'Solution radicale si vous êtes vraiment bloqué·e. Mais elle demande des démarches (créer ou reprendre une entreprise, micro-entreprise comprise), le chômage mensuel s’arrête, et si vous n’avez pas réellement de projet d’entreprise, cela revient à mentir sur vos intentions. Juridiquement, on ne peut pas exercer le même poste en intermittence et en auto-entreprise. Ne pas confondre avec l’ACRE (exonération de cotisations), qui ne réduit pas le chômage. À valider avec un conseiller.',
    sim: run(all, arceDay), contracts: all, arceDay,
  });

  return results;
}

/** Recopie les contrats d'un mois témoin sur chaque mois à venir (mêmes jours du mois). */
export function copyMonth(ref: Contract[], hz: Horizon): Contract[] {
  const out: Contract[] = [];
  for (let k = 0; ; k++) {
    const s = addMonthsDay(hz.firstFuture, k);
    if (s > hz.end) break;
    const { y, m } = parts(s);
    const n = daysInMonth(y, m);
    ref.forEach((c, j) => {
      const days = [...new Set(c.days.map((d) => Math.min(Number(d.slice(8, 10)), n)))].map((d) => fromDay(monthStart(y, m) + d - 1));
      out.push({ ...c, id: `habit-${k}-${j}`, title: `${c.title} · fictif`, days, simulated: true, generated: true });
    });
  }
  return out;
}

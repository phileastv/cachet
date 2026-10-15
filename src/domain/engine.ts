import { daysInMonth, monthKey, monthStart, parts, toDay } from './dates';
import { indemnifiableDays, intermittentBreakdown, paidLeaveFranchise, reliquatAllowance, salaryFranchise, type AJBreakdown } from './rules';
import type { Contract, Profile, Releve, Rules } from './types';

export interface DayCell {
  day: number;
  contract: Contract | null;
  /** Salaire brut du jour. */
  rate: number;
  hours: number;
}

export interface Presumed {
  /** Allocation journalière intermittente estimée. */
  aj: number;
  /**
   * Montant global du droit intermittent comparé au reliquat :
   * AJ × (365 − jours depuis la fin de contrat − délai d'attente − franchises).
   */
  global: number;
  /** Nombre de jours retenus dans le montant global, et ce qui a été retiré des 365 jours. */
  globalDays: number;
  elapsed: number;
  waiting: number;
  franchiseCP: number;
  franchiseSalary: number;
  /** Fin de contrat de référence. */
  fct: number;
  sr: number;
  /** Heures de travail (sans enseignement ni formation) : elles seules entrent dans la partie B de l'AJ. */
  nht: number;
  /** Heures qui comptent pour les 507 h (travail + enseignement et formation plafonnés). */
  hours: number;
  workedDays: number;
  /** Équivalent mensuel (AJ × 365 / 12 : les intermittents sont payés en jours calendaires). */
  monthly: number;
  detail: AJBreakdown;
}

/** Ce que donnerait une demande envoyée un jour donné. */
export interface RequestInfo {
  day: number;
  /** Dernière fin de contrat avant ce jour : elle fixe la période de référence. */
  lastEnd: number | null;
  /** Période de référence de 365 jours qui se termine à cette fin de contrat. */
  from: number | null;
  to: number | null;
  hours: number;
  sr: number;
  presumed: Presumed | null;
  capital: number;
  ecart: number | null;
  status: OptionStatus;
  tight: boolean;
  /** Le jour choisi tombe pendant un contrat (la demande n'est pas possible ce jour-là). */
  onContract: boolean;
}

/** used : la dernière fin de contrat a déjà servi à une demande ; il en faut une nouvelle. */
export type OptionStatus = 'hours' | 'gap' | 'possible' | 'used';

export interface MonthRow {
  key: string;
  y: number;
  m: number;
  start: number;
  n: number;
  cells: DayCell[];
  contracts: Contract[];
  gross: number;
  hours: number;
  workedDays: number;
  aj: number;
  /** Jours indemnisables du mois (mensualisation datée), moins les jours sans indemnisation saisis. */
  indemDays: number;
  /** Jours du mois dans une période sans indemnisation. */
  unpaidDays: number;
  /** Allocation pleine du mois (jours indemnisables × AJ). */
  full: number;
  /** Après déduction de 70 % du salaire brut. */
  raw: number;
  plafondHit: boolean;
  paidDays: number;
  paid: number;
  /** Reliquat en euros (jours × AJ retenue pour le droit d'option) au début et à la fin du mois. */
  capStart: number;
  capEnd: number;
  /** Reliquat en jours (compteur France Travail) au début et à la fin du mois. */
  capStartDays: number;
  capEndDays: number;
  hoursEnd: number;
  /** Salaire brut des 12 derniers mois, à la fin du mois. */
  grossEnd: number;
  presumedEnd: Presumed | null;
  ecartEnd: number | null;
  status: OptionStatus;
  /** Option possible, mais l'écart dépasse à peine le seuil. */
  tight: boolean;
  hasSimulated: boolean;
  hasGenerated: boolean;
  arce: number;
}

export interface DayState {
  day: number;
  /** Reliquat comparé (euros) : jours restants au début du mois × AJ retenue. */
  capital: number;
  capitalDays: number;
  /** Heures sur les 12 mois glissants qui finissent ce jour-là (compteur affiché). */
  hours: number;
  /** Heures à la dernière fin de contrat (celles qui comptent pour une demande ce jour-là). */
  refHours: number;
  presumed: Presumed | null;
  ecart: number | null;
  aj: number;
  status: OptionStatus;
  tight: boolean;
}

export interface Simulation {
  start: number;
  end: number;
  today: number;
  months: MonthRow[];
  at: (day: number) => DayState;
  /** Premier jour (à partir d'aujourd'hui) où l'on peut envoyer la demande. */
  requestDay: DayState | null;
  /** Le jour de la demande a été choisi à la main. */
  requestManual: boolean;
  requestInfo: (day: number) => RequestInfo;
  /** Jour sans contrat (on peut y envoyer une demande). */
  isFree: (day: number) => boolean;
  /** Dernière fin de contrat avant le jour de la demande. */
  lastContractEnd: number | null;
  expiredAt: (day: number) => Contract[];
  maxHours: number;
  hasReleve: boolean;
}

export interface SimInput {
  contracts: Contract[];
  profile: Profile;
  rules: Rules;
  today: number;
  start: number;
  end: number;
  /** ARCE : à ce jour, une part du reliquat (rules.arceRate) est versée et l'allocation mensuelle s'arrête. */
  arceDay?: number | null;
  /** Jour de la demande imposé par l'utilisateur. */
  requestOverride?: number | null;
}

export function contractEnd(c: Contract): number {
  return toDay(c.days[c.days.length - 1]);
}

export function contractStart(c: Contract): number {
  return toDay(c.days[0]);
}

export function sortContracts(list: Contract[]): Contract[] {
  return list
    .filter((c) => c.days.length > 0)
    .map((c) => ({ ...c, days: [...c.days].sort() }))
    .sort((a, b) => (a.days[0] < b.days[0] ? -1 : a.days[0] > b.days[0] ? 1 : 0));
}

function latestReleve(releves: Releve[], day: number): Releve | null {
  const sorted = [...releves].sort((a, b) => (a.date < b.date ? -1 : 1));
  let found: Releve | null = null;
  for (const r of sorted) if (toDay(r.date) <= day) found = r;
  return found ?? sorted[0] ?? null;
}


export function simulate(input: SimInput): Simulation {
  const { profile, rules, today } = input;
  const contracts = sortContracts(input.contracts);
  const firstMonth = parts(input.start);
  const lastMonth = parts(input.end);
  const start = monthStart(firstMonth.y, firstMonth.m);
  const end = monthStart(lastMonth.y, lastMonth.m) + daysInMonth(lastMonth.y, lastMonth.m) - 1;
  const W = rules.windowDays;

  // --- Tableaux journaliers (avec une marge avant le début pour la fenêtre de 12 mois)
  const base = start - W - 2;
  const L = end - base + 1;
  const h8 = new Float64Array(L);
  const h10 = new Float64Array(L);
  const teach = new Float64Array(L);
  const train = new Float64Array(L);
  const gross = new Float64Array(L);
  const worked = new Uint8Array(L);
  const who: (Contract | null)[] = new Array(L).fill(null);
  /** Jour compris entre le début et la fin d'un contrat (week-ends inclus) : pas de demande possible. */
  const inSpan = new Uint8Array(L);
  /** Jour où se termine un contrat de travail (fin de contrat de travail, FCT). */
  const isEnd = new Uint8Array(L);

  for (const c of contracts) {
    const n = c.days.length;
    for (const iso of c.days) {
      const i = toDay(iso) - base;
      if (i < 0 || i >= L) continue;
      if (c.teaching) teach[i] += c.hours / n;
      else if (c.training) train[i] += c.hours / n;
      else {
        (c.annexe === '10' ? h10 : h8)[i] += c.hours / n;
        gross[i] += c.gross / n;
        worked[i] = 1;
      }
      who[i] = c;
    }
    if (!c.teaching && !c.training) {
      for (let d = contractStart(c); d <= contractEnd(c); d++) if (d - base >= 0 && d - base < L) inSpan[d - base] = 1;
      const e = contractEnd(c) - base;
      if (e >= 0 && e < L) isEnd[e] = 1;
    }
  }

  // Sommes sur les 365 jours qui finissent au jour i (au jour près : un contrat à cheval ne compte que pour ses jours dans la fenêtre)
  const rolling = (a: ArrayLike<number>) => {
    const out = new Float64Array(L);
    let acc = 0;
    for (let i = 0; i < L; i++) {
      acc += a[i];
      if (i >= W) acc -= a[i - W];
      out[i] = acc;
    }
    return out;
  };
  const w8 = rolling(h8);
  const w10 = rolling(h10);
  const wT = rolling(teach);
  const wF = rolling(train);
  const winG = rolling(gross);
  const winDays = rolling(worked);
  const winWork = new Float64Array(L);
  const winH = new Float64Array(L);
  {
    const cap = profile.over50 ? rules.teachingCap50 : rules.teachingCap;
    for (let i = 0; i < L; i++) {
      winWork[i] = Math.max(0, Math.round((w8[i] + w10[i]) * 100) / 100);
      // Enseignement plafonné, et enseignement + formation ≤ 338 h (2/3 de 507 h)
      const tc = Math.min(Math.max(0, wT[i]), cap);
      const fc = Math.min(Math.max(0, wF[i]), Math.max(0, rules.assimilatedCap - tc));
      winH[i] = Math.round((winWork[i] + tc + fc) * 100) / 100;
      winG[i] = Math.max(0, Math.round(winG[i] * 100) / 100);
    }
  }
  // Dernière fin de contrat ≤ jour i
  const lastEndIdx = new Int32Array(L);
  {
    let e = -1;
    for (let i = 0; i < L; i++) {
      if (isEnd[i]) e = i;
      lastEndIdx[i] = e;
    }
  }
  const lastEndOn = (t: number): number | null => {
    const i = Math.min(Math.max(t - base, 0), L - 1);
    return lastEndIdx[i] >= 0 ? lastEndIdx[i] + base : null;
  };

  // Fins de contrat déjà examinées lors d'une demande précédente
  const examined = (profile.priorRequests ?? []).map((r) => {
    const d = toDay(r.date);
    return { day: d, fct: r.fct ? toDay(r.fct) : lastEndOn(d - 1) };
  });
  const usedFct = (t: number, fct: number) => examined.some((x) => x.day <= t && x.fct !== null && fct <= x.fct);

  /** Droit intermittent présumé pour une demande envoyée le jour t (évalué à la dernière fin de contrat). */
  const presumedFor = (t: number): Presumed | null => {
    const fct = lastEndOn(t);
    if (fct === null) return null;
    const i = fct - base;
    const hours = winH[i];
    if (hours < rules.hoursRequired - 1e-6) return null;
    const nht = winWork[i];
    const sr = winG[i];
    const annexe = w10[i] > w8[i] + 1e-9 ? '10' : w8[i] > w10[i] + 1e-9 ? '8' : profile.annexe;
    const detail = intermittentBreakdown(sr, nht, annexe, rules);
    const elapsed = Math.max(0, t - fct);
    const waiting = profile.waitingApplied ? 0 : rules.waitingDays;
    const franchiseCP = paidLeaveFranchise(winDays[i]);
    const franchiseSalary = salaryFranchise(sr, nht, annexe, rules);
    const globalDays = Math.max(0, rules.intermittentPeriodDays - elapsed - waiting - franchiseCP - franchiseSalary);
    return {
      aj: detail.aj, global: detail.aj * globalDays, globalDays, elapsed, waiting, franchiseCP, franchiseSalary, fct,
      sr, nht, hours, workedDays: winDays[i], monthly: (detail.aj * 365) / 12, detail,
    };
  };

  // --- Mois : chômage versé selon la règle des 70 %
  const unpaid = (profile.unpaidPeriods ?? []).map((u) => [toDay(u.from), toDay(u.to)] as const);
  const months: MonthRow[] = [];
  for (let d = start; d <= end; ) {
    const { y, m } = parts(d);
    const n = daysInMonth(y, m);
    const cells: DayCell[] = [];
    let g = 0;
    let h = 0;
    let wd = 0;
    let off = 0;
    for (let k = 0; k < n; k++) {
      const i = d + k - base;
      cells.push({ day: d + k, contract: who[i], rate: gross[i], hours: h8[i] + h10[i] + teach[i] + train[i] });
      g += gross[i];
      h += h8[i] + h10[i] + teach[i] + train[i];
      if (who[i]) wd++;
      if (unpaid.some(([a, b]) => d + k >= a && d + k <= b)) off++;
    }
    const rel = latestReleve(profile.releves, d + n - 1);
    const aj = rel ? rel.dailyAllowance : 0;
    const monthDays = indemnifiableDays(d, n, cells.some((c) => c.contract && !c.contract.teaching && !c.contract.training), rules);
    const indemDays = off >= n ? 0 : Math.max(0, monthDays - off);
    const full = aj * indemDays;
    const raw = Math.max(0, full - rules.deductionRate * g);
    // Plafond du cumul : saisi, sinon salaire journalier de référence du relevé × 30,42 (circulaire Unédic 2025-03, fiche 7)
    const ceiling = profile.monthlyRefSalary ?? (rel?.sjr ? Math.round(rel.sjr * 30.42 * 100) / 100 : null);
    const plafond = ceiling ? Math.max(0, ceiling - g) : Infinity;
    const capped = Math.min(raw, plafond);
    // Un contrat compte dans chaque mois où il a au moins un jour
    const inMonth = contracts.filter((c) => contractStart(c) < d + n && contractEnd(c) >= d && c.days.some((iso) => {
      const x = toDay(iso);
      return x >= d && x < d + n;
    }));
    months.push({
      key: monthKey(y, m), y, m, start: d, n, cells, contracts: inMonth,
      gross: g, hours: h, workedDays: wd, aj, indemDays, unpaidDays: off, full, raw, plafondHit: capped < raw,
      // Jours payés arrondis à l'entier le plus proche (Unédic, fiche « Cumul »)
      paidDays: aj ? Math.min(indemDays, Math.round(capped / aj + 1e-9)) : 0, paid: 0,
      capStart: 0, capEnd: 0, capStartDays: 0, capEndDays: 0,
      hoursEnd: winH[d + n - 1 - base], grossEnd: winG[d + n - 1 - base], presumedEnd: null, ecartEnd: null, status: 'hours', tight: false,
      hasSimulated: inMonth.some((c) => c.simulated && !c.generated),
      hasGenerated: inMonth.some((c) => c.generated), arce: 0,
    });
    d += n;
  }

  // --- Reliquat en jours entiers, ancré sur le relevé le plus récent (≤ aujourd'hui).
  // Un relevé daté du dernier jour d'un mois décrit la situation après le paiement de ce mois :
  // il s'applique au début du mois suivant. Sinon, au début du mois de sa date.
  const anchorRel = latestReleve(profile.releves, today);
  const hasReleve = !!anchorRel;
  let anchorDay = anchorRel ? toDay(anchorRel.date) : start;
  if (anchorRel) {
    const p = parts(anchorDay);
    if (p.d === daysInMonth(p.y, p.m)) anchorDay += 1;
  }
  const anchorDays = anchorRel ? anchorRel.daysLeft : 0;
  let a = months.findIndex((M) => anchorDay >= M.start && anchorDay < M.start + M.n);
  if (a < 0) a = anchorDay < start ? 0 : months.length;
  const arceIdx = input.arceDay != null ? months.findIndex((M) => input.arceDay! >= M.start && input.arceDay! < M.start + M.n) : -1;

  /** AJ retenue pour valoriser le reliquat dans la comparaison des 30 %. */
  const ajCompareAt = (day: number, aj: number) => reliquatAllowance(aj, latestReleve(profile.releves, day)?.sjr ?? null, rules);
  let capDays = anchorDays;
  let stopped = false;
  for (let k = Math.max(a, 0); k < months.length; k++) {
    const M = months[k];
    if (k === arceIdx) {
      M.arce = capDays * rules.arceRate * M.aj;
      capDays = capDays - Math.round(capDays * rules.arceRate);
      stopped = true;
    }
    if (stopped) M.paidDays = 0;
    M.paidDays = Math.min(M.paidDays, Math.floor(capDays + 1e-9));
    M.paid = M.paidDays * M.aj;
    M.capStartDays = capDays;
    capDays = Math.max(0, capDays - M.paidDays);
    M.capEndDays = capDays;
  }
  // Mois passés (avant l'ancre) : on remonte le temps (historique estimé)
  capDays = anchorDays;
  for (let k = Math.min(a, months.length) - 1; k >= 0; k--) {
    const M = months[k];
    M.paid = M.paidDays * M.aj;
    M.capEndDays = capDays;
    capDays = capDays + M.paidDays;
    M.capStartDays = capDays;
  }
  for (const M of months) {
    const ajc = ajCompareAt(M.start + M.n - 1, M.aj);
    M.capStart = M.capStartDays * ajc;
    M.capEnd = M.capEndDays * ajc;
  }

  const lowAllowance = (aj: number) => aj > 0 && aj <= rules.lowAllowance;
  const statusOf = (refHours: number, ecart: number | null, capitalDays: number, aj: number, used: boolean): OptionStatus => {
    if (refHours < rules.hoursRequired - 1e-6) return 'hours';
    // Chômage épuisé : ouverture intermittente directe, sans droit d'option
    if (capitalDays < 1) return 'possible';
    if (used) return 'used';
    if (lowAllowance(aj) || (ecart !== null && ecart >= rules.threshold - 1e-9)) return 'possible';
    return 'gap';
  };
  const tightOf = (status: OptionStatus, ecart: number | null, aj: number) =>
    status === 'possible' && !lowAllowance(aj) && ecart !== null && Number.isFinite(ecart) && ecart < rules.threshold + rules.safetyMargin;

  const monthOf = (t: number) => months.find((x) => t >= x.start && t < x.start + x.n) ?? months[months.length - 1];

  const at = (day: number): DayState => {
    const t = Math.min(Math.max(day, start), end);
    const M = monthOf(t);
    // France Travail ne décompte le mois qu'après l'actualisation : le reliquat d'un jour = celui du début du mois
    const capitalDays = M.capStartDays;
    const capital = M.capStart;
    const presumed = presumedFor(t);
    const fct = lastEndOn(t);
    const refHours = fct !== null ? winH[fct - base] : 0;
    const ecart = presumed ? (capitalDays >= 1 ? presumed.global / capital - 1 : Infinity) : null;
    const used = fct !== null && usedFct(t, fct);
    const status = statusOf(refHours, ecart, capitalDays, M.aj, used);
    return { day: t, capital, capitalDays, hours: winH[t - base], refHours, presumed, ecart, aj: M.aj, status, tight: tightOf(status, ecart, M.aj) };
  };

  for (const M of months) {
    const s = at(M.start + M.n - 1);
    M.presumedEnd = s.presumed;
    // Fin de mois : le paiement du mois est passé, on compare au reliquat de fin de mois
    M.ecartEnd = s.presumed ? (M.capEndDays >= 1 ? s.presumed.global / M.capEnd - 1 : Infinity) : null;
    const fct = lastEndOn(M.start + M.n - 1);
    M.status = statusOf(s.refHours, M.ecartEnd, M.capEndDays, M.aj, fct !== null && usedFct(M.start + M.n - 1, fct));
    M.tight = tightOf(M.status, M.ecartEnd, M.aj);
  }

  let requestDay: DayState | null = null;
  let requestManual = false;
  const ov = input.requestOverride;
  if (hasReleve && ov != null && ov >= start && ov <= end) {
    requestDay = at(ov);
    requestManual = true;
  } else if (hasReleve) {
    for (let t = Math.max(today, start); t <= end; t++) {
      if (inSpan[t - base]) continue; // il faut un jour sans contrat (hors période d'un contrat)
      const s = at(t);
      if (s.status === 'possible') {
        requestDay = s;
        break;
      }
    }
  }
  const lastContractEnd: number | null = requestDay ? lastEndOn(requestDay.day) : null;

  const requestInfo = (day: number): RequestInfo => {
    const t = Math.min(Math.max(day, start), end);
    const e = lastEndOn(t);
    const onContract = !!inSpan[t - base];
    const st = at(t);
    return {
      day: t, lastEnd: e, from: e !== null ? e - W + 1 : null, to: e, hours: st.refHours, sr: e !== null ? winG[e - base] : 0,
      presumed: st.presumed, capital: st.capital, ecart: st.ecart, status: onContract && st.status === 'possible' ? 'gap' : st.status, tight: st.tight, onContract,
    };
  };

  let maxHours = 0;
  for (let t = Math.max(today, start); t <= end; t++) maxHours = Math.max(maxHours, winH[t - base]);

  // Un contrat ne compte plus du tout quand son dernier jour est sorti de la fenêtre de 365 jours
  const expiredAt = (day: number) => contracts.filter((c) => contractEnd(c) + W <= day);

  const isFree = (day: number) => day >= start && day <= end && !inSpan[day - base];

  return { start, end, today, months, at, requestDay, requestManual, requestInfo, lastContractEnd, expiredAt, maxHours, hasReleve, isFree };
}

import type { Annexe, Rules } from './types';

/**
 * Valeurs réglementaires par défaut. Toutes sont modifiables dans les paramètres
 * (la réglementation change : vérifiez-les, et proposez une correction sur le dépôt).
 *
 * Sources :
 * - Guide France Travail « Intermittents du spectacle » (p. 5 : 507 h sur 365 jours ; p. 19 : droit d'option)
 * - Unédic, annexes 8 et 10 : AJ = A + B + C, AJ minimale 31,96 € (depuis le 1/07/2023)
 * - Régime général : 70 % du salaire brut déduit de l'allocation du mois ; jours payés arrondis à l'entier
 *   le plus proche (Unédic, fiche « Cumul », 2025). Mensualisation (circulaire Unédic 2025-03, fiche 5) :
 *   jours du mois jusqu'au 31/03/2025, 30 jours à partir du 1/07/2025 (entre les deux : 30 jours si le mois
 *   n'a aucun jour de contrat).
 * - Droit d'option (annexes 8/10, art. 26 §2) : montant global intermittent =
 *   [365 − jours depuis la fin de contrat − délai d'attente − franchises CP et salaires] × AJ brute
 *   (Pôle emploi, CESI du 26/02/2020) ; reliquat ARE valorisé après participation retraite (3 % du SJR).
 */
export const DEFAULT_RULES: Rules = {
  hoursRequired: 507,
  threshold: 0.3,
  deductionRate: 0.7,
  lowAllowance: 20,
  windowDays: 365,
  ajMin: 31.96,
  floor8: 38,
  floor10: 44,
  intermittentPeriodDays: 365,
  teachingCap: 70,
  teachingCap50: 120,
  assimilatedCap: 338,
  monthDays: null,
  waitingDays: 7,
  smicHourly: 12.02,
  retirementRate: 0.03,
  retirementFloor: 31.97,
  arceRate: 0.6,
  safetyMargin: 0.05,
  ajMax: 174.8,
  // Plafond mensuel des heures retenues pour les 507 h : 208 h en annexe 8 (250 h avec plusieurs employeurs
  // selon un calculateur tiers, non confirmé), 28 cachets en annexe 10. À ajuster avec des cas réels.
  monthlyHoursCap: 208,
  monthlyHoursCapMulti: 250,
  monthlyCachetsCap: 28,
};

/** Détail du calcul de l'allocation journalière intermittente (A + B + C). */
export interface AJBreakdown {
  annexe: Annexe;
  ajMin: number;
  /** Salaire de référence (brut des 12 mois) et heures retenues. */
  sr: number;
  nht: number;
  /** Seuils au-delà desquels salaire et heures comptent beaucoup moins. */
  srCap: number;
  hCap: number;
  srIn: number;
  srOver: number;
  hIn: number;
  hOver: number;
  coefA: number;
  coefC: number;
  /** Parties A (salaire), B (heures), C (fixe). */
  aIn: number;
  aOver: number;
  a: number;
  bIn: number;
  bOver: number;
  b: number;
  c: number;
  raw: number;
  floor: number;
  max: number;
  aj: number;
}

/**
 * Allocation journalière intermittente « présumée ».
 * Annexe 8 : A = AJmin × (0,42 × SR jusqu'à 14 400 € + 0,05 × au-delà) ÷ 5 000
 *            B = AJmin × (0,26 × NHT jusqu'à 720 h + 0,08 × au-delà) ÷ 507
 *            C = AJmin × 0,40          (plancher 38 €)
 * Annexe 10 : 0,36 / 13 700 € · 690 h · C = AJmin × 0,70 (plancher 44 €)
 * Plafond : 174,80 € par jour.
 */
export function intermittentBreakdown(sr: number, nht: number, annexe: Annexe, rules: Rules): AJBreakdown {
  const ajMin = rules.ajMin;
  const a8 = annexe === '8';
  const srCap = a8 ? 14_400 : 13_700;
  const hCap = a8 ? 720 : 690;
  const coefA = a8 ? 0.42 : 0.36;
  const coefC = a8 ? 0.4 : 0.7;
  const srIn = Math.min(sr, srCap);
  const srOver = Math.max(0, sr - srCap);
  const hIn = Math.min(nht, hCap);
  const hOver = Math.max(0, nht - hCap);
  const aIn = (ajMin * coefA * srIn) / 5_000;
  const aOver = (ajMin * 0.05 * srOver) / 5_000;
  const bIn = (ajMin * 0.26 * hIn) / 507;
  const bOver = (ajMin * 0.08 * hOver) / 507;
  const c = ajMin * coefC;
  const raw = aIn + aOver + bIn + bOver + c;
  const floor = a8 ? rules.floor8 : rules.floor10;
  const max = rules.ajMax || Infinity;
  // France Travail tronque l'AJ au centime (60,4865 → 60,48 € sur une notification réelle)
  const aj = Math.min(max, Math.max(floor, Math.floor(raw * 100 + 1e-9) / 100));
  return { annexe, ajMin, sr, nht, srCap, hCap, srIn, srOver, hIn, hOver, coefA, coefC, aIn, aOver, a: aIn + aOver, bIn, bOver, b: bIn + bOver, c, raw, floor, max, aj };
}

export function intermittentDailyAllowance(sr: number, nht: number, annexe: Annexe, rules: Rules): number {
  return intermittentBreakdown(sr, nht, annexe, rules).aj;
}

/** Jours indemnisables d'un mois au régime général (mensualisation datée, cf. DEFAULT_RULES). */
export function indemnifiableDays(monthStartDay: number, daysInMonth: number, hasContract: boolean, rules: Rules): number {
  if (rules.monthDays === 0) return daysInMonth;
  if (rules.monthDays) return rules.monthDays;
  const iso = new Date(monthStartDay * 86_400_000).toISOString().slice(0, 10);
  if (iso >= '2025-07-01') return 30;
  if (iso >= '2025-04-01') return hasContract ? daysInMonth : 30;
  return daysInMonth;
}

/** Franchise congés payés intermittente : 2,5 jours ouvrables par 24 jours travaillés, 30 jours au plus. */
export function paidLeaveFranchise(workedDays: number): number {
  return Math.min(30, Math.floor((workedDays * 2.5) / 24 + 1e-9));
}

/**
 * Franchise salaires intermittente : (SR ÷ SMIC mensuel) × (SJM ÷ (3 × SMIC journalier)) − 27, si positif.
 * SJM = SR ÷ (heures ÷ 8) en annexe 8, ÷ (heures ÷ 10) en annexe 10. SMIC journalier = 35 h ÷ 7 jours.
 */
export function salaryFranchise(sr: number, nht: number, annexe: Annexe, rules: Rules): number {
  if (!sr || !nht || !rules.smicHourly) return 0;
  const smicMonth = (rules.smicHourly * 35 * 52) / 12;
  const smicDay = (rules.smicHourly * 35) / 7;
  const sjm = sr / (nht / (annexe === '10' ? 10 : 8));
  return Math.max(0, Math.floor((sr / smicMonth) * (sjm / (3 * smicDay)) - 27 + 1e-9));
}

/** AJ du reliquat retenue pour le droit d'option : AJ brute moins la participation retraite (3 % du SJR). */
export function reliquatAllowance(aj: number, sjr: number | null | undefined, rules: Rules): number {
  if (!sjr || aj <= rules.retirementFloor) return aj;
  return Math.max(rules.retirementFloor, aj - Math.round(rules.retirementRate * sjr * 100) / 100);
}

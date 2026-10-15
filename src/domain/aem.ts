/**
 * Lecture d'une AEM (attestation employeur mensuelle, annexes 8 et 10) à partir du texte du PDF.
 * Tout se passe dans le navigateur. On ne garde que les champs utiles au calcul : jamais le nom,
 * le numéro de sécurité sociale, l'adresse ni les coordonnées.
 */
import { daysInMonth, fromDay, monthStart, toDay, weekday } from './dates';
import type { Row } from './releve';
import type { Annexe, Contract } from './types';

export interface ParsedAem {
  /** Numéro de l'attestation (dédoublonnage). */
  ref: string;
  /** Attestation initiale dont celle-ci est le complément (même contrat, mois suivant). */
  initialRef: string | null;
  /** Mois des rémunérations (AAAA-MM). */
  month: string;
  /** Dates du contrat de travail (ISO). end = null : contrat encore en cours à la fin du mois. */
  start: string;
  end: string | null;
  hours: number | null;
  cachets: number | null;
  workedDays: number | null;
  gross: number | null;
  /** Brut soumis à contributions d'assurance chômage. */
  grossSubject: number | null;
  employer: string;
  job: string;
  annexe: Annexe | null;
  /** Gabarit reconnu (« XOTIS », « standard »). */
  template: string;
  /** Champs que la lecture n'a pas pu établir avec certitude : à vérifier. */
  doubts: string[];
}

const amount = (s: string) => Number(s.replace(/[\s  ]/g, '').replace(',', '.'));
const AMOUNT = /^\d{1,3}(?:[\s  ]?\d{3})*[.,]\d{2}$/;
const isoFromSpaced = (s: string) => {
  const m = s.match(/^(\d{2})\s?(\d{2})\s?(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const ARTIST = /artiste|com[ée]dien|musicien|chanteu|danseu|acteur|actrice|figurant|circassien|choriste|instrumentiste/i;

/** Les montants de la ligne « salaires bruts | brut soumis | taux | contributions », contrôlés entre eux. */
function salaryRow(rows: Row[]): { gross: number; subject: number } | null {
  for (const r of rows) {
    const vals = r.cells.map((c) => c.s).filter((s) => AMOUNT.test(s)).map(amount);
    if (vals.length >= 4) {
      const [gross, subject, rate, contrib] = vals;
      if (rate > 0 && rate < 30 && Math.abs((subject * rate) / 100 - contrib) <= Math.max(1.5, contrib * 0.02)) return { gross, subject };
    }
  }
  return null;
}

/** Gabarit XOTIS : les libellés sont une image de fond, seules les valeurs sont du texte. */
function parseXotis(rows: Row[]): ParsedAem | null {
  const doubts: string[] = [];
  const refRe = /^[A-Z]{3}\d{7}$/;
  const head = rows.find((r) => r.cells.filter((c) => /^\d$/.test(c.s)).length >= 4 && r.cells.some((c) => refRe.test(c.s)));
  if (!head) return null;
  const digits = head.cells.filter((c) => /^\d$/.test(c.s)).map((c) => c.s);
  const month = `20${digits[2]}${digits[3]}-${digits[0]}${digits[1]}`;
  const ref = head.cells.find((c) => refRe.test(c.s))!.s;
  const after = rows.slice(rows.indexOf(head) + 1);
  const comp = after.find((r) => r.cells.length === 2 && r.cells[0].s === 'X' && refRe.test(r.cells[1].s));
  // « début | fin » ou « début | X » (case « contrat en cours » cochée)
  const dates = rows.find((r) => r.cells.length === 2 && isoFromSpaced(r.cells[0].s) && (isoFromSpaced(r.cells[1].s) || r.cells[1].s === 'X'));
  if (!dates) return null;
  const start = isoFromSpaced(dates.cells[0].s)!;
  const end = isoFromSpaced(dates.cells[1].s);
  const nums = rows.slice(rows.indexOf(dates) + 1).find((r) => r.cells.length === 2 && r.cells.every((c) => /^\d+$/.test(c.s)));
  if (!nums) doubts.push('heures et jours');
  const sal = salaryRow(rows);
  if (!sal) doubts.push('salaire');
  const siretIdx = rows.findIndex((r) => r.cells.some((c) => /^\d{14}$/.test(c.s)));
  const employer = siretIdx >= 0 ? rows.slice(siretIdx + 1, siretIdx + 4).find((r) => /[A-Za-z]{2}/.test(r.text) && !/@/.test(r.text))?.text ?? '' : '';
  const jobRow = rows.find((r) => r.cells.length === 2 && /^\d{3}[A-Z]\d{8}$/.test(r.cells[1].s));
  const job = jobRow?.cells[0].s ?? '';
  return {
    ref, initialRef: comp ? comp.cells[1].s : null, month, start, end,
    hours: nums ? Number(nums.cells[0].s) : null, cachets: null, workedDays: nums ? Number(nums.cells[1].s) : null,
    gross: sal?.gross ?? null, grossSubject: sal?.subject ?? null, employer, job,
    annexe: job ? (ARTIST.test(job) ? '10' : '8') : null, template: 'XOTIS', doubts,
  };
}

/** Gabarit standard Unédic (libellés en texte) : ligne code-barres « …##AEM##MM-AAAA##… ». */
function parseStandard(rows: Row[]): ParsedAem | null {
  const text = rows.map((r) => r.text).join('\n');
  const bar = text.match(/##AEM##(\d{2})-(\d{4})##([A-Z0-9]+)##/);
  if (!bar) return null;
  const doubts: string[] = [];
  const allDates = [...text.matchAll(/\b(\d{2})\s+(\d{2})\s+(20\d{2})\b/g)].map((m) => `${m[3]}-${m[2]}-${m[1]}`);
  const endM = text.match(/Date de fin du contrat de travail\s*(\d{2})\s+(\d{2})\s+(\d{4})/i);
  const end = endM ? `${endM[3]}-${endM[2]}-${endM[1]}` : null;
  const start = allDates.find((d) => d !== end && d.slice(0, 7) <= `${bar[2]}-${bar[1]}`) ?? null;
  if (!start) return null;
  if (!end) doubts.push('date de fin (contrat en cours ?)');
  const sal = salaryRow(rows);
  if (!sal) doubts.push('salaire');
  // Heures et jours : la ligne qui suit « Nombre d'HEURES … JOURS travaillés » contient deux ou trois entiers
  const hi = rows.findIndex((r) => /JOURS travaill/i.test(r.text));
  const nr = hi >= 0 ? rows.slice(Math.max(0, hi - 3), hi + 4).find((r) => /^\d+( \d+){1,2}$/.test(r.text)) : undefined;
  const ints = nr ? nr.text.split(' ').map(Number) : [];
  if (ints.length < 2) doubts.push('heures et jours');
  const job = text.match(/Emploi occupé\s*([^\n]+)/i)?.[1]?.replace(/\s*\d{3}[A-Z]\d{8}.*/, '').trim() ?? '';
  const employer = text.match(/Raison sociale\s+([^\n]+)/i)?.[1]?.replace(/N° IDCC.*/i, '').trim() ?? '';
  const artist = /\bX\s*Artiste|Artiste\s*X\b/.test(text) || ARTIST.test(job);
  return {
    ref: bar[3], initialRef: null, month: `${bar[2]}-${bar[1]}`, start, end,
    hours: ints.length >= 2 ? ints[0] : null, cachets: ints.length === 3 ? ints[1] : null, workedDays: ints.length >= 2 ? ints[ints.length - 1] : null,
    gross: sal?.gross ?? null, grossSubject: sal?.subject ?? null, employer, job, annexe: artist ? '10' : '8', template: 'standard', doubts,
  };
}

export function isAem(rows: Row[]): boolean {
  const text = rows.map((r) => r.text).join('\n');
  return /##AEM##|ATTESTATION \(AEM\)|ANNEXES 8 et 10/i.test(text) || (rows.some((r) => /XOTIS/.test(r.text)) && !!salaryRow(rows));
}

export function parseAem(rows: Row[]): ParsedAem | null {
  if (!isAem(rows)) return null;
  return rows.some((r) => /XOTIS/.test(r.text)) ? parseXotis(rows) : parseStandard(rows);
}

/**
 * Jours travaillés d'une AEM : le nombre de jours indiqué, placés sur les jours de semaine du mois
 * compris dans le contrat (le détail jour par jour n'est pas sur l'AEM ; seul le nombre compte pour le calcul).
 */
export function aemDays(a: ParsedAem): string[] {
  const [y, m] = a.month.split('-').map(Number);
  const from = Math.max(toDay(a.start), monthStart(y, m - 1));
  const monthEnd = monthStart(y, m - 1) + daysInMonth(y, m - 1) - 1;
  const to = a.end ? Math.min(toDay(a.end), monthEnd) : monthEnd;
  const span: number[] = [];
  for (let d = from; d <= to; d++) span.push(d);
  const want = Math.min(a.workedDays ?? span.length, span.length);
  const week = span.filter((d) => weekday(d) < 5);
  const picked = week.length >= want ? week.slice(0, want) : [...week, ...span.filter((d) => weekday(d) >= 5).slice(0, want - week.length)];
  return picked.sort((p, q) => p - q).map(fromDay);
}

/** Contrats à créer à partir des AEM lues (une ligne par AEM, plus la fin d'un contrat dont l'AEM n'est pas encore arrivée). */
export function aemContracts(list: ParsedAem[], uid: () => string, fallbackAnnexe: Annexe): Contract[] {
  const uniq = [...new Map(list.map((a) => [a.ref, a])).values()].sort((p, q) => (p.month + p.start < q.month + q.start ? -1 : 1));
  const out: Contract[] = [];
  for (const a of uniq) {
    const days = aemDays(a);
    if (!days.length) continue;
    out.push({
      id: uid(), title: `${a.employer || 'Employeur'}${a.job ? ` · ${a.job.toLowerCase()}` : ''} (AEM ${a.month.slice(5)}/${a.month.slice(0, 4)})`,
      days, hours: a.hours ?? 0, gross: a.grossSubject ?? a.gross ?? 0, annexe: a.annexe ?? fallbackAnnexe, simulated: false,
      source: { kind: 'aem', ref: a.ref },
    });
  }
  return out;
}

/**
 * Contrats encore en cours à la fin du dernier mois attesté : leur vraie date de fin manque, alors qu'elle
 * fixe la fin de contrat retenue pour la demande. À faire compléter par l'utilisateur.
 */
export function openContracts(list: ParsedAem[]): ParsedAem[] {
  return list.filter((a) => {
    const [y, m] = a.month.split('-').map(Number);
    const monthEnd = fromDay(monthStart(y, m - 1) + daysInMonth(y, m - 1) - 1);
    const goesOn = a.end === null || a.end > monthEnd;
    return goesOn && !list.some((b) => b !== a && b.start === a.start && b.month > a.month);
  });
}

/** Suite d'un contrat en cours (jours de semaine du mois suivant jusqu'à la date de fin donnée), à compléter. */
export function pendingContract(a: ParsedAem, end: string, uid: () => string, fallbackAnnexe: Annexe): Contract | null {
  const [y, m] = a.month.split('-').map(Number);
  const from = monthStart(y, m - 1) + daysInMonth(y, m - 1);
  const days: string[] = [];
  for (let d = from; d <= toDay(end); d++) if (weekday(d) < 5) days.push(fromDay(d));
  if (!days.length) return null;
  return {
    id: uid(), title: `${a.employer || 'Employeur'} · suite du contrat jusqu'au ${end.slice(8, 10)}/${end.slice(5, 7)} (AEM pas encore reçue : heures et salaire à compléter)`,
    days, hours: 0, gross: 0, annexe: a.annexe ?? fallbackAnnexe, simulated: true, source: { kind: 'aem-pending', ref: a.ref },
  };
}


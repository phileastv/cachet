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

/**
 * Gabarit standard Unédic (formulaire DAJ 110, édité par Silae, Movinmotion…) : les libellés sont du texte,
 * les valeurs sont posées à côté. On s'appuie sur les libellés et sur la position horizontale des valeurs.
 */
function parseStandard(rows: Row[]): ParsedAem | null {
  const doubts: string[] = [];
  const text = rows.map((r) => r.text).join('\n');
  const refRe = /^[A-Z]{3,4}\d{6,7}$/;
  const ints = (r: Row) => r.cells.filter((c) => /^\d+$/.test(c.s));
  // Mois : ligne code-barres « ##AEM##MM-AAAA## », sinon les chiffres isolés de l'en-tête « MOIS 20__ »
  const bar = text.match(/##AEM##(\d{2})-(\d{4})##/);
  // Selon le logiciel de paie, « 0 5 2 6 » arrive en quatre cases ou en deux (« 0 5 », « 2 6 »)
  const digitsOf = (r: Row) => r.cells.filter((c) => /^\d( \d)*$/.test(c.s)).flatMap((c) => c.s.split(' '));
  const head = rows.find((r) => r.cells.some((c) => refRe.test(c.s)) && digitsOf(r).length >= 4);
  const d = head ? digitsOf(head) : [];
  const month = bar ? `${bar[2]}-${bar[1]}` : d.length >= 4 ? `20${d[2]}${d[3]}-${d[0]}${d[1]}` : null;
  if (!month) return null;
  // Numéro d'attestation (dédoublonnage) et, pour une complémentaire, numéro de l'attestation initiale
  const headIdx = head ? rows.indexOf(head) : -1;
  const ref = head?.cells.find((c) => refRe.test(c.s))?.s ?? null;
  if (!ref) doubts.push("numéro d'attestation");
  const kindRow = rows.find((r) => r.cells.some((c) => /INITIALE$/.test(c.s)) && r.cells.some((c) => /^COMPLEMENTAIRE/.test(c.s)));
  let initialRef: string | null = null;
  if (kindRow) {
    const xInit = kindRow.cells.find((c) => /INITIALE$/.test(c.s))!.x;
    const xComp = kindRow.cells.find((c) => /^COMPLEMENTAIRE/.test(c.s))!.x;
    const marks = kindRow.cells.filter((c) => c.s === 'X').map((c) => c.x);
    if (marks.some((x) => x > xComp) && !marks.some((x) => x > xInit && x < xComp)) {
      initialRef = rows.slice(Math.max(0, headIdx), headIdx + 6).flatMap((r) => r.cells).find((c) => refRe.test(c.s) && c.s !== ref)?.s ?? null;
    }
  }
  // Dates : « Date d'embauche jj mm aaaa … Contrat en cours [X] Sinon Date de fin du contrat de travail jj mm aaaa »
  const dateRow = rows.find((r) => /Date d'embauche/i.test(r.text));
  if (!dateRow) return null;
  const cells = dateRow.cells;
  // « 15 12 2022 » en trois cases ou en une seule
  const tripletAfter = (from: number): string | null => {
    const n = cells.slice(from).flatMap((c) => (/^\d{1,4}( \d{1,4})*$/.test(c.s) ? c.s.split(' ') : [])).slice(0, 3);
    return n.length === 3 && /^\d{4}$/.test(n[2]) ? `${n[2]}-${n[1].padStart(2, '0')}-${n[0].padStart(2, '0')}` : null;
  };
  const iEmb = cells.findIndex((c) => /d'embauche/i.test(c.s));
  const iTrav = cells.map((c) => /travail$/.test(c.s)).lastIndexOf(true);
  const start = iEmb >= 0 ? tripletAfter(iEmb + 1) : null;
  if (!start) return null;
  const end = iTrav >= 0 ? tripletAfter(iTrav + 1) : null;
  const iCours = cells.findIndex((c) => /cours$/.test(c.s));
  const iSinon = cells.findIndex((c) => c.s === 'Sinon');
  const ongoing = iCours >= 0 && cells.slice(iCours + 1, iSinon > iCours ? iSinon : undefined).some((c) => c.s === 'X');
  if (!end && !ongoing) doubts.push('date de fin');
  // Heures, cachets, jours travaillés : la ligne de nombres sous l'en-tête « isolés | groupés | JOURS travaillés »,
  // chaque nombre rattaché à la colonne la plus proche
  const hdrIdx = rows.findIndex((r) => r.cells.some((c) => c.s === 'isolés') && r.cells.some((c) => /^JOURS/.test(c.s)));
  let hours: number | null = null;
  let cachets: number | null = null;
  let workedDays: number | null = null;
  if (hdrIdx >= 0) {
    const hdr = rows[hdrIdx];
    const xOf = (s: string, fallback: number) => hdr.cells.find((c) => c.s === s)?.x ?? fallback;
    const hoursX = rows.slice(Math.max(0, hdrIdx - 3), hdrIdx).flatMap((r) => r.cells).find((c) => /d'HEURES/i.test(c.s))?.x ?? xOf('isolés', 146) - 75;
    const daysX = hdr.cells.find((c) => /^JOURS/.test(c.s))?.x ?? 263;
    const cols: [string, number][] = [['hours', hoursX], ['isoles', xOf('isolés', 146)], ['groupes', xOf('groupés', 182)], ['days', daysX]];
    const valRow = rows.slice(hdrIdx + 1, hdrIdx + 5).find((r) => ints(r).some((c) => c.x < cols[3][1] + 60));
    if (valRow) {
      let iso = 0;
      let grp = 0;
      for (const c of ints(valRow)) {
        if (c.x > cols[3][1] + 60) continue;
        const col = cols.reduce((best, k) => (Math.abs(k[1] - c.x) < Math.abs(best[1] - c.x) ? k : best))[0];
        if (col === 'hours') hours = Number(c.s);
        else if (col === 'isoles') iso = Number(c.s);
        else if (col === 'groupes') grp = Number(c.s);
        else workedDays = Number(c.s);
      }
      if (iso + grp > 0) cachets = iso + grp;
    }
  }
  if (hours === null && cachets === null) doubts.push('heures');
  if (workedDays === null) doubts.push('jours travaillés');
  const sal = salaryRow(rows);
  if (!sal) doubts.push('salaire');
  // Employeur, emploi, statut (artiste → annexe 10)
  const rs = rows.find((r) => r.cells.some((c) => /^Raison( sociale)?$/.test(c.s)));
  const employer = rs ? rs.cells.slice(rs.cells.map((c) => /sociale$/.test(c.s)).lastIndexOf(true) + 1).map((c) => c.s).filter((s) => !/^(ou|nom)$/i.test(s)).join(' ').trim() : '';
  const jobRow = rows.find((r) => r.cells.some((c) => /^\d{3}[A-Z]\d{8}$/.test(c.s)));
  const job = jobRow ? jobRow.cells.filter((c) => !/^\d{3}[A-Z]\d{8}$/.test(c.s)).map((c) => c.s).join(' ').trim() : '';
  const stRow = rows.find((r) => r.cells.some((c) => c.s === 'Artiste') && r.cells.some((c) => c.s === 'Technicien'));
  let artist = ARTIST.test(job);
  if (stRow) {
    const labels = stRow.cells.filter((c) => /^(Réalisateur|Artiste|Technicien|Ouvrier)$/.test(c.s));
    const marked = stRow.cells.filter((c) => c.s === 'X').map((x) => labels.filter((l) => l.x < x.x).sort((a, b) => b.x - a.x)[0]?.s).filter(Boolean);
    if (marked.length) artist = marked.includes('Artiste');
  }
  return {
    ref: ref ?? `${month}-${employer}-${start}`, initialRef, month, start, end, hours, cachets, workedDays,
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
export function aemDays(a: ParsedAem, taken: Set<string> = new Set()): string[] {
  const [y, m] = a.month.split('-').map(Number);
  const from = Math.max(toDay(a.start), monthStart(y, m - 1));
  const monthEnd = monthStart(y, m - 1) + daysInMonth(y, m - 1) - 1;
  const to = a.end ? Math.min(toDay(a.end), monthEnd) : monthEnd;
  const span: number[] = [];
  for (let d = from; d <= to; d++) span.push(d);
  const want = Math.min(a.workedDays ?? span.length, span.length);
  // Jours de semaine libres d'abord, puis jours de semaine déjà pris par une autre AEM, puis week-ends
  const free = (d: number) => !taken.has(fromDay(d));
  const order = [...span.filter((d) => weekday(d) < 5 && free(d)), ...span.filter((d) => weekday(d) < 5 && !free(d)), ...span.filter((d) => weekday(d) >= 5)];
  return order.slice(0, want).sort((p, q) => p - q).map(fromDay);
}

/** Contrats à créer à partir des AEM lues (une ligne par AEM, plus la fin d'un contrat dont l'AEM n'est pas encore arrivée). */
export function aemContracts(list: ParsedAem[], uid: () => string, fallbackAnnexe: Annexe): Contract[] {
  const uniq = [...new Map(list.map((a) => [a.ref, a])).values()].sort((p, q) => (p.month + p.start < q.month + q.start ? -1 : 1));
  const out: Contract[] = [];
  // Les contrats les plus courts choisissent leurs jours en premier : un contrat d'un jour ne peut pas bouger,
  // un contrat de deux jours sur une semaine peut éviter ce jour-là
  const taken = new Set<string>();
  const daysOf = new Map<ParsedAem, string[]>();
  for (const a of [...uniq].sort((p, q) => (toDay(p.end ?? p.start) - toDay(p.start)) - (toDay(q.end ?? q.start) - toDay(q.start)))) {
    const days = aemDays(a, taken);
    daysOf.set(a, days);
    for (const d of days) taken.add(d);
  }
  for (const a of uniq) {
    const days = daysOf.get(a) ?? [];
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


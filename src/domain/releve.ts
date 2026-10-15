/**
 * Lecture d'un « relevé de situation » France Travail (ex-Pôle emploi), à partir du texte du PDF.
 * Tout se passe dans le navigateur : rien n'est envoyé. On ne garde que les champs utiles au calcul
 * (jamais le nom, l'adresse, l'identifiant ni l'IBAN).
 */

/** Un élément de texte positionné, tel que le donne pdf.js (page.getTextContent()). */
export interface TextItem {
  str: string;
  x: number;
  y: number;
}

/** Une ligne du document : son texte et ses morceaux avec leur position horizontale. */
export interface Row {
  text: string;
  cells: { x: number; s: string }[];
}

/** Regroupe les éléments d'une page en lignes (même hauteur), de haut en bas puis de gauche à droite. */
export function itemsToRows(items: TextItem[], tolerance = 2.5): Row[] {
  const rows: { y: number; items: TextItem[] }[] = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    let row = rows.find((r) => Math.abs(r.y - it.y) < tolerance);
    if (!row) rows.push((row = { y: it.y, items: [] }));
    row.items.push(it);
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => {
    const cells = r.items.sort((a, b) => a.x - b.x).map((i) => ({ x: i.x, s: i.str.trim().normalize('NFC') }));
    return { text: cells.map((c) => c.s).join(' ').replace(/\s+/g, ' '), cells };
  });
}

/** Bloc « INFORMATIONS SUR VOS DROITS AU … » : l'état du compteur à cette date. */
export interface RightsInfo {
  /** Date « au » (ISO). */
  date: string;
  daysLeft: number | null;
  /** Allocation journalière brute. */
  dailyAllowance: number | null;
  /** Salaire journalier de référence. */
  sjr: number | null;
  /** Début de l'indemnisation en cours (ISO) et nombre d'allocations versées depuis. */
  since: string | null;
  paidSince: number | null;
  /** Le droit en cours relève des annexes 8/10 (intermittent) plutôt que du régime général. */
  intermittent: boolean;
}

/** Une période (en général un mois) détaillée dans le relevé. */
export interface ReleveMonth {
  from: string;
  to: string;
  days: number;
  /** Paiement provisoire (sur déclaration) ou régularisé. */
  provisional: boolean;
  /** Jours sans indemnisation, par motif tel qu'imprimé (« Carence », « Différé d'Indemnisation », « travail »…). */
  unpaid: { label: string; days: number }[];
  /** Allocations journalières dues sur la période (dernière valeur imprimée = définitive). */
  paidDays: number | null;
}

export interface ParsedReleve {
  /** Le document ressemble bien à un relevé de situation. */
  isReleve: boolean;
  infos: RightsInfo[];
  months: ReleveMonth[];
  /** Points à signaler à l'utilisateur. */
  notes: string[];
}

const num = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'));
const iso = (d: string) => `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}`;
const DATE = String.raw`(\d{2}/\d{2}/\d{4})`;
const AMOUNT = String.raw`(\d[\d\s]*,\d{2})`;

/** Motifs de jours non indemnisés reconnus dans les tableaux mensuels. */
const UNPAID_LABELS: [RegExp, string][] = [
  [/^Carence/i, 'Carence'],
  [/^Différé d'Indemnisation/i, "Différé d'indemnisation"],
  [/^Différé(?! d'Indemnisation)/i, 'Différé'],
  [/^Délai d'attente/i, "Délai d'attente"],
  [/^Franchise/i, 'Franchise'],
];

export function parseReleve(rows: Row[]): ParsedReleve {
  const lines = rows.map((r) => r.text);
  const text = lines.join('\n');
  const isReleve = /RELEVE DE SITUATION DU/i.test(text);
  const infos: RightsInfo[] = [];
  const months: ReleveMonth[] = [];
  const notes: string[] = [];

  // --- Blocs « INFORMATIONS SUR VOS DROITS AU … »
  lines.forEach((line, i) => {
    const m = line.match(new RegExp(`INFORMATIONS SUR VOS DROITS AU ${DATE}`, 'i'));
    if (!m) return;
    const block = lines.slice(i + 1, i + 12).join(' ');
    const days = block.match(/Durée d'indemnisation restante \(en jours\) : (\d+)/i);
    const aj = block.match(new RegExp(`Allocation brute d'un montant journalier de ${AMOUNT}`, 'i'));
    const sjr = block.match(new RegExp(`Salaire Journalier de Référence de ${AMOUNT}`, 'i'));
    const since = block.match(new RegExp(`depuis le ${DATE} : (\\d+) allocations? journali`, 'i'));
    infos.push({
      date: iso(m[1]),
      daysLeft: days ? Number(days[1]) : null,
      dailyAllowance: aj ? num(aj[1]) : null,
      sjr: sjr ? num(sjr[1]) : null,
      since: since ? iso(since[1]) : null,
      paidSince: since ? Number(since[2]) : null,
      intermittent: /annexes? (VIII|X|8|10)|intermittent|spectacle/i.test(block),
    });
  });

  // --- Périodes mensuelles. Chaque tableau a deux groupes de colonnes : à gauche ce qui a déjà été versé
  // (ou le provisoire à déduire), à droite les allocations dues. On lit la colonne de droite.
  let cur: ReleveMonth | null = null;
  let split = Infinity;
  for (let i = 0; i < rows.length; i++) {
    const line = lines[i];
    const p = line.match(new RegExp(`PERIODE DU ${DATE} AU ${DATE} \\((\\d+) jours?\\)`, 'i'));
    if (p) {
      cur = { from: iso(p[1]), to: iso(p[2]), days: Number(p[3]), provisional: /provisoire/i.test(line) && !/régularisé/i.test(line), unpaid: [], paidDays: null };
      // Une même période peut réapparaître (paiement provisoire puis régularisé) : la dernière fait foi
      const prev = months.findIndex((x) => x.from === cur!.from && x.to === cur!.to);
      if (prev >= 0) months.splice(prev, 1);
      months.push(cur);
      // En-tête des colonnes : le 2e « Nb d'alloc. » ouvre le groupe de droite (allocations dues)
      split = Infinity;
      for (const r of rows.slice(i + 1, i + 5)) {
        const nb = r.cells.filter((c) => /^Nb d'alloc/i.test(c.s));
        if (nb.length >= 2) {
          split = nb[1].x - 5;
          break;
        }
      }
      continue;
    }
    if (!cur) continue;
    if (/^(DECOMPTE GENERAL|INFORMATIONS SUR VOS DROITS|REGLEMENT DU)/i.test(line)) {
      cur = null;
      continue;
    }
    const clean = line.replace(/^[A-Z]{1,4}\d+(\/ID\d+)?\s+/, ''); // codes internes en marge (« FT16 », « C16/ID010 »)
    for (const [re, label] of UNPAID_LABELS) {
      const m = clean.match(new RegExp(re.source + String.raw`\s*(\d+)\s*$`, 'i'));
      if (m) cur.unpaid.push({ label, days: Number(m[1]) });
    }
    const right = (r: Row | undefined) => (r ? r.cells.filter((c) => c.x >= split && /^\d+$/.test(c.s)) : []);
    const nums = (r: Row | undefined) => (r ? r.cells.filter((c) => /^\d+$/.test(c.s)) : []);
    // « Jours non indemnisés : » puis le(s) nombre(s) et le motif, sur la même ligne ou les deux suivantes
    if (/^Jours non indemnisés/i.test(clean)) {
      const sameLine = nums(rows[i]).length > 0;
      const r = sameLine ? rows[i] : rows[i + 1];
      const label = sameLine ? (clean.match(/:\s*([^\d]+)/)?.[1] ?? '').trim() : (lines[i + 2] ?? '').trim();
      const val = right(r)[0] ?? nums(r).slice(-1)[0];
      // Seul le provisoire est imprimé (à gauche) : rien de définitif à lire ici
      if (val && (val.x >= split || !Number.isFinite(split) || nums(r).length === 1)) cur.unpaid.push({ label: label || 'non précisé', days: Number(val.s) });
    }
    // Ligne d'allocation « N | brut | retraite | net » (même ligne ou suivante)
    if (/^Allocation d'Aide au/i.test(clean)) {
      const r = nums(rows[i]).length ? rows[i] : rows[i + 1];
      const due = right(r)[0];
      if (due) cur.paidDays = Number(due.s);
      else if (cur.paidDays === null && /régularisé/i.test(rows.slice(Math.max(0, i - 8), i).map((x) => x.text).join(' '))) cur.paidDays = 0;
    }
  }

  if (/SOMMES TROP PERCUES|trop perçues? \(6\)/i.test(text)) notes.push('Le relevé signale un trop-perçu : il sera retenu sur vos prochains paiements.');
  for (const m of months) {
    const special = m.unpaid.filter((u) => !/travail/i.test(u.label));
    if (special.length) {
      notes.push(`Du ${fmt(m.from)} au ${fmt(m.to)} : ${special.map((u) => `${u.label.toLowerCase()} ${u.days} j`).join(', ')}.`);
    }
    if (m.provisional) notes.push(`${fmt(m.from)} → ${fmt(m.to)} : paiement provisoire, il sera régularisé quand France Travail recevra vos attestations.`);
  }
  return { isReleve, infos, months, notes };
}

const fmt = (isoDate: string) => `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}/${isoDate.slice(0, 4)}`;

/**
 * Périodes sans indemnisation à proposer : jours de carence, de différé ou de délai d'attente
 * en début de période (là où France Travail les applique).
 */
export function suggestedUnpaid(parsed: ParsedReleve): { from: string; to: string; reason: string }[] {
  const out: { from: string; to: string; reason: string }[] = [];
  // Première période qui commence après le 1er du mois : avant, la personne n'était pas inscrite
  const first = [...parsed.months].sort((a, b) => (a.from < b.from ? -1 : 1))[0];
  if (first && first.from.slice(8, 10) !== '01' && parsed.months.some((m) => m.unpaid.some((u) => /carence|différé|délai/i.test(u.label)))) {
    out.push({ from: `${first.from.slice(0, 8)}01`, to: new Date(Date.parse(first.from) - 86_400_000).toISOString().slice(0, 10), reason: 'pas encore inscrit·e' });
  }
  for (const m of parsed.months) {
    const days = m.unpaid.filter((u) => /carence|différé|délai/i.test(u.label));
    const total = days.reduce((a, u) => a + u.days, 0);
    if (!total) continue;
    const start = Date.parse(m.from);
    const end = Math.min(start + (total - 1) * 86_400_000, Date.parse(m.to));
    out.push({ from: m.from, to: new Date(end).toISOString().slice(0, 10), reason: days.map((u) => u.label.toLowerCase()).join(' + ') });
  }
  return out;
}

/** Le bloc d'informations le plus récent : c'est lui qui sert d'ancre au calcul. */
export function latestInfo(parsed: ParsedReleve): RightsInfo | null {
  return [...parsed.infos].filter((x) => x.daysLeft !== null && x.dailyAllowance !== null).sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
}

/** Un délai de 7 jours (« délai d'attente » ou « différé d'indemnisation » de 7 j) apparaît sur une période. */
export function waitingSeen(parsed: ParsedReleve): string | null {
  for (const m of parsed.months) if (m.unpaid.some((u) => (/délai d'attente/i.test(u.label) || /différé d'indemnisation/i.test(u.label)) && u.days === 7)) return m.from;
  return null;
}

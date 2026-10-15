export const eur = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} €`;
export const eur2 = (v: number) => `${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const pct = (v: number | null) => {
  if (v === null) return '—';
  if (!Number.isFinite(v)) return 'chômage épuisé';
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1).replace('.', ',')} %`;
};
export const num = (s: string | number) => {
  const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
/** Couleur d'un jour travaillé selon son salaire brut. */
export function rateColor(rate: number): string {
  if (rate < 180) return 'var(--int-1)';
  if (rate < 210) return 'var(--int-2)';
  if (rate < 260) return 'var(--int-3)';
  return 'var(--int-4)';
}

/** Détail des jours retenus dans le montant global intermittent (formule France Travail). */
export const globalDaysText = (p: { globalDays: number; elapsed: number; waiting: number; franchiseCP: number; franchiseSalary: number }) =>
  `${p.globalDays} j = 365 − ${p.elapsed} j depuis la fin de contrat − ${p.waiting} j de délai d'attente − ${p.franchiseCP + p.franchiseSalary} j de franchises`;

import { useMemo, useState } from 'react';
import { daysInMonth, fmtDay, monthStart, MONTHS, weekday } from '../domain/dates';
import { averageRate, copyMonthTo, lastRealEnd, monthsFrom, roughMonths, workedMonths } from '../domain/future';
import { DEFAULT_PARAMS, runScenarios } from '../domain/scenarios';
import { diagnose } from '../domain/situation';
import type { AppData, Contract } from '../domain/types';
import { uid, useStore } from '../state/store';
import { eur, num } from './format';

/** Le droit d'option passe-t-il avec ces données ? (jour de demande possible, et lecture de la situation) */
export function optionVerdict(d: AppData, today: number) {
  const res = runScenarios(d, today, DEFAULT_PARAMS);
  return { req: res[0].sim.requestDay, situation: diagnose(res, d.contracts, today, d.settings.rules) };
}

const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

type Mode = 'copy' | 'rough' | 'manual';

/** Ce que donneraient les mois simulés, recalculé en direct. */
function Verdict({ after }: { after: ReturnType<typeof optionVerdict> | null }) {
  if (!after) return null;
  return after.req ? (
    <div className="alert" role="status" style={{ background: 'var(--ok-bg)', color: 'var(--ok-ink)' }}>
      <span className="small"><strong>Avec ces mois simulés, le droit d'option deviendrait possible le {fmtDay(after.req.day)}.</strong> {after.req.presumed ? `Allocation intermittente estimée : ${eur(after.req.presumed.monthly)} par mois.` : ''}</span>
    </div>
  ) : (
    <div className="alert warn" role="status">
      <span className="small"><strong>Même avec ces mois, le droit d'option ne passe pas encore.</strong> {after.situation.title}. Le tableau de bord compare d'autres scénarios (travailler plus ou moins, un mois sur deux, cours, formation…).</span>
    </div>
  );
}

/** Aperçu, mois par mois, des contrats qui seront simulés (en violet). */
function SimPreview({ contracts }: { contracts: Contract[] }) {
  const keys = [...new Set(contracts.flatMap((c) => c.days.map((d) => d.slice(0, 7))))].sort();
  if (!keys.length) return null;
  const days = new Set(contracts.flatMap((c) => c.days)).size;
  const hours = contracts.reduce((a, c) => a + c.hours, 0);
  const gross = contracts.reduce((a, c) => a + c.gross, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="small"><span className="sim-dot" /> Mois simulés : <strong>{keys.length} mois</strong>, {days} jours, {Math.round(hours)} h, {eur(gross)} brut au total.</span>
      <div className="sim-grid">{keys.map((k) => <MiniMonth key={k} contracts={contracts} monthKey={k} sim small />)}</div>
    </div>
  );
}

/** Mini-calendrier d'un mois passé : jours travaillés, heures, jours et salaire brut du mois. */
function MiniMonth({ contracts, monthKey, sim = false, small = false }: { contracts: Contract[]; monthKey: string; sim?: boolean; small?: boolean }) {
  const [y, m] = monthKey.split('-').map(Number);
  const first = monthStart(y, m - 1);
  const n = daysInMonth(y, m - 1);
  const perDay = new Map<number, { hours: number; gross: number; titles: string[] }>();
  for (const c of contracts) {
    if (c.teaching || c.training) continue;
    for (const iso of c.days) {
      if (!iso.startsWith(monthKey)) continue;
      const d = Number(iso.slice(8, 10));
      const cur = perDay.get(d) ?? { hours: 0, gross: 0, titles: [] };
      cur.hours += c.hours / c.days.length;
      cur.gross += c.gross / c.days.length;
      cur.titles.push(c.title);
      perDay.set(d, cur);
    }
  }
  const hours = [...perDay.values()].reduce((a, x) => a + x.hours, 0);
  const gross = [...perDay.values()].reduce((a, x) => a + x.gross, 0);
  const lead = weekday(first);
  return (
    <div className={`mini-month${sim ? ' sim' : ''}${small ? ' small' : ''}`}>
      {small && <strong className="mini-title">{monthLabel(monthKey)}</strong>}
      <div className="mini-cal" role="img" aria-label={`${perDay.size} jours travaillés en ${monthLabel(monthKey)}`}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <b key={i}>{d}</b>)}
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {Array.from({ length: n }, (_, i) => {
          const w = perDay.get(i + 1);
          return <span key={i} className={w ? 'on' : ''} title={w ? `${w.titles.join(', ')} · ${Math.round(w.hours * 10) / 10} h · ${eur(w.gross)}` : undefined}>{i + 1}</span>;
        })}
      </div>
      <div className="mini-stats">
        <span><strong>{perDay.size}</strong> {small ? 'j' : 'jours travaillés'}</span>
        <span><strong>{Math.round(hours)}</strong> {small ? 'h' : 'heures'}</span>
        <span><strong>{eur(gross)}</strong> brut</span>
      </div>
    </div>
  );
}

/** Accueil, dernière étape : le droit d'option ne passe pas encore → simuler les contrats à venir. */
export function FutureStep({ onDone, withManual }: { onDone: (to: string) => void; withManual: (d: AppData) => AppData }) {
  const { data, today, update } = useStore();
  const [mode, setMode] = useState<Mode>('copy');
  const base = data;
  // La simulation part du lendemain du dernier contrat attesté (dernière AEM), même s'il est passé :
  // les mois sans AEM encore reçue (ex. septembre) sont simulés aussi.
  const end = lastRealEnd(base.contracts) ?? today;
  const from = end;
  const months = monthsFrom(from + 1, 12);
  const worked = workedMonths(base.contracts);
  const rate = averageRate(base.contracts);
  const realDays = base.contracts.filter((c) => !c.simulated && !c.teaching && !c.training && c.gross > 0).reduce((n, c) => n + c.days.length, 0);
  const [ref, setRef] = useState(worked[0] ?? '');
  const [count, setCount] = useState(6);
  const [days, setDays] = useState<Record<string, string>>({});
  const [perDay, setPerDay] = useState({ gross: rate ? String(Math.round(rate.gross)) : '', hours: rate ? String(Math.round(rate.hours * 10) / 10).replace('.', ',') : '8' });

  const fake = () => 'apercu';
  const copyPreview = useMemo(() => (ref ? copyMonthTo(base.contracts, ref, months.slice(0, count), fake, from) : []), [base.contracts, ref, count, from]);
  const roughPreview = roughMonths(months.slice(0, 6).map((mm) => ({ y: mm.y, m: mm.m, days: Math.round(num(days[mm.key] ?? '')) })), { gross: num(perDay.gross), hours: num(perDay.hours) || 8 }, data.profile.annexe, fake, from);
  const before = useMemo(() => optionVerdict(withManual(base), today), [base, today, withManual]);
  // Verdict recalculé en direct sur l'aperçu, avant d'enregistrer
  const preview = mode === 'copy' ? copyPreview : mode === 'rough' ? roughPreview : [];
  const previewKey = JSON.stringify(preview.map((c) => [c.days, c.hours, c.gross]));
  const after = useMemo(() => (preview.length ? optionVerdict(withManual({ ...base, contracts: [...base.contracts, ...preview] }), today) : null), [previewKey, base, today, withManual]);

  /** Ajoute les contrats simulés et montre le tableau de bord. */
  const applyAndGo = (next: Contract[]) => {
    update((d) => ({ ...d, contracts: [...d.contracts, ...next] }));
    onDone('/');
  };

  const why = before.situation.kind === 'never-hours' || before.situation.kind === 'later-hours' ? 'il vous manque encore des heures sur 12 mois' : 'votre chômage restant est encore trop élevé par rapport à votre droit intermittent';

  return (
    <div className="card" style={{ gap: 12 }}>
      <div className="alert warn" role="status">
        <span className="small">Avec vos contrats jusqu'au <strong>{fmtDay(end)}</strong>, le droit d'option ne passe pas encore : {why}. Ce n'est pas une fin : tout dépend de ce que vous allez faire ensuite.</span>
      </div>
      <strong>Avez-vous d'autres contrats prévus après le {fmtDay(end)} ?</strong>
      <div className="seg" role="group" aria-label="Façon de saisir les contrats à venir" style={{ flexWrap: 'wrap' }}>
        <button aria-pressed={mode === 'copy'} onClick={() => setMode('copy')}>Comme un mois passé</button>
        <button aria-pressed={mode === 'rough'} onClick={() => setMode('rough')}>À peu près, mois par mois</button>
        <button aria-pressed={mode === 'manual'} onClick={() => setMode('manual')}>Je les saisis un par un</button>
      </div>

      {mode === 'copy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="small muted">Les prochains mois ressembleront à un mois que vous avez déjà travaillé : mêmes jours, mêmes heures, mêmes salaires.</span>
          <div className="grid2">
            <label className="field">Comme le mois de
              <select value={ref} onChange={(e) => setRef(e.target.value)}>{worked.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}</select>
            </label>
            <label className="field">Pendant
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[1, 2, 3, 6, 9, 12].map((n) => <option key={n} value={n}>{n} mois (jusqu'à {monthLabel(months[n - 1].key)})</option>)}</select>
            </label>
          </div>
          {ref && <MiniMonth contracts={base.contracts} monthKey={ref} />}
          {ref && <SimPreview contracts={copyPreview} />}
          <Verdict after={after} />
          <button className="btn primary" style={{ alignSelf: 'flex-start', minHeight: 48 }} disabled={!ref || !copyPreview.length} onClick={() => applyAndGo(copyMonthTo(base.contracts, ref, months.slice(0, count), uid, from))}>Simuler ces mois et voir mon tableau de bord →</button>
        </div>
      )}

      {mode === 'rough' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="small muted">Indiquez à peu près combien de jours vous pensez travailler chaque mois.</span>
          {rate ? (
            <span className="small" style={{ background: 'var(--card-2)', borderRadius: 10, padding: '8px 10px' }}>
              Salaire et heures par jour <strong>pré-remplis avec la moyenne de vos contrats déjà saisis</strong> : {eur(rate.gross)} brut et {String(Math.round(rate.hours * 10) / 10).replace('.', ',')} h par jour travaillé, sur {realDays} jours.
              {(num(perDay.gross) !== Math.round(rate.gross) || num(perDay.hours) !== Math.round(rate.hours * 10) / 10) && (
                <> <button className="btn sm ghost" onClick={() => setPerDay({ gross: String(Math.round(rate.gross)), hours: String(Math.round(rate.hours * 10) / 10).replace('.', ',') })}>Revenir à la moyenne</button></>
              )}
            </span>
          ) : <span className="small muted">Aucun contrat saisi : indiquez votre salaire brut et vos heures par jour habituels.</span>}
          <div className="grid2">
            <label className="field">Salaire brut moyen par jour (€)<input inputMode="decimal" value={perDay.gross} onChange={(e) => setPerDay({ ...perDay, gross: e.target.value })} /></label>
            <label className="field">Heures par jour<input inputMode="decimal" value={perDay.hours} onChange={(e) => setPerDay({ ...perDay, hours: e.target.value })} /></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {months.slice(0, 6).map((m) => (
              <label key={m.key} className="field small">{monthLabel(m.key)}
                <input inputMode="numeric" placeholder="jours" value={days[m.key] ?? ''} onChange={(e) => setDays({ ...days, [m.key]: e.target.value })} />
              </label>
            ))}
          </div>
          <SimPreview contracts={roughPreview} />
          <Verdict after={after} />
          <button className="btn primary" style={{ alignSelf: 'flex-start', minHeight: 48 }} disabled={!num(perDay.gross) || !roughPreview.length}
            onClick={() => applyAndGo(roughMonths(months.slice(0, 6).map((m) => ({ y: m.y, m: m.m, days: Math.round(num(days[m.key] ?? '')) })), { gross: num(perDay.gross), hours: num(perDay.hours) || 8 }, data.profile.annexe, uid, from))}>
            Simuler ces mois et voir mon tableau de bord →
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="small muted">Vous cocherez les jours de chaque contrat prévu sur un calendrier, avec ses heures et son salaire brut (cochez « simulation » : un contrat pas encore signé).</span>
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => onDone('/contrats')}>Saisir mes prochains contrats →</button>
        </div>
      )}

      <div className="nav">
        <button className="btn" style={{ minHeight: 48 }} onClick={() => onDone('/')}>Non, aucun autre contrat prévu</button>
      </div>
      <span className="tiny muted">Les contrats simulés apparaissent en violet dans le calendrier : vous pourrez les modifier, les supprimer ou les remplacer par les vrais quand vous aurez leurs AEM.</span>
    </div>
  );
}

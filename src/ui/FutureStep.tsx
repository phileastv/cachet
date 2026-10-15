import { useMemo, useState } from 'react';
import { fmtDay, MONTHS } from '../domain/dates';
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

/** Accueil, dernière étape : le droit d'option ne passe pas encore → simuler les contrats à venir. */
export function FutureStep({ onDone, withManual }: { onDone: (to: string) => void; withManual: (d: AppData) => AppData }) {
  const { data, today, update } = useStore();
  const [mode, setMode] = useState<Mode>('copy');
  const [added, setAdded] = useState<string[]>([]);
  const base = useMemo(() => ({ ...data, contracts: data.contracts.filter((c) => !added.includes(c.id)) }), [data, added]);
  const end = lastRealEnd(base.contracts) ?? today;
  // À partir du lendemain du dernier contrat (ou d'aujourd'hui) : jamais de jour simulé dans le passé
  const from = Math.max(end, today);
  const months = monthsFrom(from + 1, 12);
  const worked = workedMonths(base.contracts);
  const rate = averageRate(base.contracts);
  const [ref, setRef] = useState(worked[0] ?? '');
  const [count, setCount] = useState(6);
  const [days, setDays] = useState<Record<string, string>>({});
  const [perDay, setPerDay] = useState({ gross: rate ? String(Math.round(rate.gross)) : '', hours: rate ? String(Math.round(rate.hours * 10) / 10).replace('.', ',') : '8' });

  const before = useMemo(() => optionVerdict(withManual(base), today), [base, today, withManual]);
  const after = useMemo(() => (added.length ? optionVerdict(withManual(data), today) : null), [added, data, today, withManual]);

  /** Remplace la simulation précédente de cette étape par la nouvelle. */
  const apply = (next: Contract[]) => {
    update((d) => ({ ...d, contracts: [...d.contracts.filter((c) => !added.includes(c.id)), ...next] }));
    setAdded(next.map((c) => c.id));
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
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={!ref} onClick={() => apply(copyMonthTo(base.contracts, ref, months.slice(0, count), uid, from))}>Simuler ces mois</button>
        </div>
      )}

      {mode === 'rough' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="small muted">Indiquez à peu près combien de jours vous pensez travailler chaque mois. On prend votre rythme moyen, modifiable.</span>
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
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={!num(perDay.gross) || !months.slice(0, 6).some((m) => num(days[m.key] ?? '') > 0)}
            onClick={() => apply(roughMonths(months.slice(0, 6).map((m) => ({ y: m.y, m: m.m, days: Math.round(num(days[m.key] ?? '')) })), { gross: num(perDay.gross), hours: num(perDay.hours) || 8 }, data.profile.annexe, uid, from))}>
            Simuler ces mois
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="small muted">Vous cocherez les jours de chaque contrat prévu sur un calendrier, avec ses heures et son salaire brut (cochez « simulation » : un contrat pas encore signé).</span>
          <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => onDone('/contrats')}>Saisir mes prochains contrats →</button>
        </div>
      )}

      {after && (
        after.req ? (
          <div className="alert" role="status" style={{ background: 'var(--ok-bg)', color: 'var(--ok-ink)' }}>
            <span className="small"><strong>Avec ces contrats prévus, le droit d'option deviendrait possible le {fmtDay(after.req.day)}.</strong> {after.req.presumed ? `Allocation intermittente estimée : ${eur(after.req.presumed.monthly)} par mois.` : ''} Vous pourrez ajuster ces contrats simulés à tout moment.</span>
          </div>
        ) : (
          <div className="alert warn" role="status">
            <span className="small"><strong>Même avec ces contrats, le droit d'option ne passe pas encore.</strong> {after.situation.title}. Le tableau de bord compare d'autres scénarios (travailler plus ou moins, un mois sur deux, cours, formation…).</span>
          </div>
        )
      )}

      <div className="nav">
        {added.length > 0 && <button className="btn primary" style={{ minHeight: 48 }} onClick={() => onDone('/')}>Voir mon tableau de bord →</button>}
        <button className="btn" style={{ minHeight: 48 }} onClick={() => { if (added.length) apply([]); onDone('/'); }}>Non, aucun autre contrat prévu</button>
      </div>
      <span className="tiny muted">Les contrats simulés apparaissent hachurés dans le calendrier : vous pourrez les modifier, les supprimer ou les remplacer par les vrais quand vous aurez leurs AEM.</span>
    </div>
  );
}

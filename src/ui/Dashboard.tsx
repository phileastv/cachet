import { useEffect, useMemo, useState } from 'react';
import { addMonthsDay, fmtDay, fromDay, monthKey, parts } from '../domain/dates';
import type { MonthRow, Simulation } from '../domain/engine';
import { DEFAULT_PARAMS, pattern, runScenarios, type ScenarioId, type ScenarioParams, type ScenarioResult } from '../domain/scenarios';
import { useStore } from '../state/store';
import { eur, globalDaysText, pct, rateColor } from './format';
import { Check, Info, Left, Right, Target, Warn, Calendar } from './Icons';
import { diagnose, type Situation } from '../domain/situation';
import { PresumedPanel, CalcDetail } from './Presumed';
import { RequestGuide } from './RequestGuide';
import { Tour, type TourStep } from './Tour';

const DASH_TOUR: TourStep[] = [
  { target: 'headline', title: 'La réponse, en une phrase', body: <>Le jour où vous pourrez envoyer votre demande de droit d'option avec vos contrats actuels, et la stratégie la plus rapide.</> },
  { target: 'calendar', title: 'Mois par mois', body: <>Chaque ligne est un mois. Les carrés orange sont vos jours d'intermittence (plus foncé = mieux payé), les violets vos contrats simulés, la barre bleue le chômage versé. À droite : heures, chômage et « Droit d'option ». Cliquez un mois pour voir le détail du calcul.</> },
  { target: 'toolbar', title: 'Voyager dans le temps', body: <>Survolez les jours ou utilisez le curseur : les réservoirs suivent. « Aujourd'hui » et « ★ Jour de la demande » vous y ramènent d'un clic.</> },
  { target: 'side', title: 'Les deux réservoirs', body: <>Votre chômage restant (bleu) et votre droit intermittent (orange). Le pointillé = chômage restant + 30 % : quand l'orange passe au-dessus, c'est possible.</> },
  { target: 'scenarios', title: 'Et si… ?', body: <>Comparez les stratégies : travailler comme d'habitude, arrêter, ralentir, un mois sur deux… « Voir la simulation » remplit le calendrier avec des contrats fictifs.</> },
  { target: 'views', title: 'Pour les détails', body: <>La vue technique remplace le calendrier par un tableau complet : capital, seuil, allocation intermittente estimée, écart…</> },
];

const MAX_MONTHS = 24;
/** Nombre de mois à venir toujours visibles après le mois en cours. */
const UPCOMING = 4;

export function Dashboard() {
  const { data, today, update } = useStore();
  const [tech, setTech] = useState(false);
  const [params, setParams] = useState<ScenarioParams>(DEFAULT_PARAMS);
  const [scen, setScen] = useState<ScenarioId>('plan');
  const [day, setDay] = useState(today);
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const results = useMemo(() => runScenarios(data, today, params), [data, today, params]);
  const sel = results.find((r) => r.id === scen) ?? results[0];
  const sim = sel.sim;
  const cursor = Math.min(Math.max(hover ?? day, sim.start), sim.end);
  const state = sim.at(cursor);
  const info = sim.requestInfo(cursor);
  const setOverride = (d: number | null) => update((x) => ({ ...x, requestDayOverride: d === null ? null : fromDay(d) }));
  const cellAt = (d: number) => sim.months.find((M) => d >= M.start && d < M.start + M.n)?.cells[d - (sim.months.find((M) => d >= M.start && d < M.start + M.n)?.start ?? d)];
  const contractToday = cellAt(cursor)?.contract ?? null;
  const pickDay = (d: number) => {
    setDay(d);
    setHover(null);
  };
  const situation = useMemo(() => diagnose(results, data.contracts, today, data.settings.rules), [results, data.contracts, today, data.settings.rules]);

  // Mois affichés : de 1 mois avant le premier contrat encore valable jusqu'à 1 mois après le dernier
  // (au moins 12 mois). Au-delà de 24 mois, on navigue avec « Mois d'avant / d'après ».
  const shown = useMemo(() => {
    const L = sim.months.length;
    const idx = (d: number) => {
      const i = sim.months.findIndex((M) => d >= M.start && d < M.start + M.n);
      return i < 0 ? (d < sim.start ? 0 : L - 1) : i;
    };
    const valid = sel.contracts.filter((c) => toEnd(c) + data.settings.rules.windowDays >= today);
    const first = valid.length ? Math.min(today, ...valid.map((c) => Math.round(Date.parse(c.days[0]) / 86_400_000))) : today;
    let last = valid.length ? Math.max(today, ...valid.map(toEnd)) : today;
    if (sim.requestDay) last = Math.max(last, sim.requestDay.day);
    // Toujours quelques mois à venir après aujourd'hui
    last = Math.max(last, addMonthsDay(today, UPCOMING));
    let a = Math.max(0, idx(first) - 1);
    let b = Math.min(L - 1, idx(last) + 1);
    if (b - a + 1 < 12) b = Math.min(L - 1, a + 11);
    if (b - a + 1 < 12) a = Math.max(0, b - 11);
    return sim.months.slice(a, b + 1);
  }, [sim, sel, data.settings.rules.windowDays, today]);
  const monthIdx = (d: number) => Math.max(0, shown.findIndex((M) => d >= M.start && d < M.start + M.n));
  const WINDOW = Math.min(shown.length, MAX_MONTHS);
  const maxStart = Math.max(0, shown.length - WINDOW);
  // Si tout ne tient pas, on montre d'abord le récent : aujourd'hui suivi de quelques mois à venir.
  const recentStart = Math.min(maxStart, Math.max(0, monthIdx(today) - (WINDOW - 1 - UPCOMING)));
  const [winStart, setWinStart] = useState(recentStart);
  useEffect(() => setWinStart(recentStart), [shown.length, recentStart]);
  const focusOn = (d: number) => {
    const i = monthIdx(d);
    setWinStart((w) => Math.min(maxStart, i < w || i >= w + WINDOW ? Math.max(0, i - 6) : w));
  };
  useEffect(() => focusOn(day), [day]); // eslint-disable-line react-hooks/exhaustive-deps

  // « Le plus rapide » : parmi les rythmes de travail uniquement. Les « autres solutions »
  // (cours, formation, ARCE) ne sont proposées que si rien d'autre ne fonctionne.
  const earliest = (list: ScenarioResult[]) => list.filter((r) => r.sim.requestDay).sort((a, b) => a.sim.requestDay!.day - b.sim.requestDay!.day)[0];
  const mainBest = earliest(results.filter((r) => r.id !== 'plan' && r.group === 'main'));
  const best = mainBest ?? (results[0].sim.requestDay ? undefined : earliest(results.filter((r) => r.group === 'other')));
  const req = sim.requestDay;
  const onToday = cursor === today;
  const onReq = !!req && cursor === req.day;

  // Rappel mensuel du relevé
  const curKey = (() => { const { y, m } = parts(today); return monthKey(y, m); })();
  const lastRel = [...data.profile.releves].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const needReleve = (!lastRel || lastRel.date.slice(0, 7) < curKey) && data.releveReminderDismissed !== curKey;

  const showScenario = (r: ScenarioResult) => {
    setScen(r.id);
    setHover(null);
    const d = r.sim.requestDay?.day ?? today;
    setDay(d);
    const M = r.sim.months.find((x) => d >= x.start && d < x.start + x.n);
    if (M) setOpen(M.key);
  };

  if (!data.profile.releves.length) {
    return (
      <div className="card" style={{ alignItems: 'flex-start' }}>
        <h2>Commençons par votre chômage actuel</h2>
        <p className="muted" style={{ margin: 0 }}>Sans votre dernier relevé (jours restants et allocation journalière), impossible de calculer quoi que ce soit.</p>
        <a className="btn primary" href="#/contrats/regime">Saisir mon relevé</a>
      </div>
    );
  }

  return (
    <>
      <Tour id="tableau" steps={DASH_TOUR} />
      {needReleve && (
        <div className="alert blue" role="status">
          <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Calendar /><span><strong>Nouveau mois : ajoutez votre relevé de {fmtMonthName(today)}.</strong><br /><span className="small">Jours restants et allocation journalière, depuis votre espace France Travail. C'est ce qui garantit des calculs justes.</span></span></span>
          <span className="nav">
            <a className="btn blue" href="#/contrats/regime">Ajouter le relevé</a>
            <button className="btn ghost" onClick={() => update((d) => ({ ...d, releveReminderDismissed: curKey }))}>Plus tard</button>
          </span>
        </div>
      )}

      <div className="topbar">
        <p className="headline" data-tour="headline">
          {sel.id === 'plan' ? 'Avec votre plan, ' : 'Avec ce scénario, '}
          {req ? <>{sim.requestManual ? 'vous avez choisi d’envoyer la demande le ' : 'vous pourrez envoyer la demande le '}<span style={{ color: req.status === 'possible' ? 'var(--ok)' : 'var(--int-ink)' }}>{fmtDay(req.day)}</span>{sim.requestManual && req.status !== 'possible' ? ' (conditions non remplies ce jour-là)' : ''}.</> : 'pas de droit d’option possible sur les 12 prochains mois.'}
          {best && sel.id === 'plan' && (!req || best.sim.requestDay!.day < req.day) ? <span className="muted"> {best.group === 'other' ? 'Seule piste trouvée' : 'Le plus rapide'} : « {best.title.toLowerCase()} », le {fmtDay(best.sim.requestDay!.day)}.</span> : null}
        </p>
        <div className="seg" role="group" aria-label="Affichage" data-tour="views">
          <button aria-pressed={!tech} onClick={() => setTech(false)}>Vue simple</button>
          <button aria-pressed={tech} onClick={() => setTech(true)}>Vue technique</button>
        </div>
      </div>

      {sel.id !== 'plan' && (
        <div className="alert gen">
          <span><strong>Vous regardez le scénario « {sel.title} »</strong><br /><span className="small">Les mois à venir sont remplis de contrats fictifs, calqués sur vos contrats habituels.</span></span>
          <button className="btn dark" onClick={() => { setScen('plan'); setDay(today); }}>Revenir à mon plan</button>
        </div>
      )}

      <div className="card" data-tour="toolbar" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <button key={onToday ? 'today-on' : 'today-off'} aria-pressed={onToday} className={`btn pick ${onToday ? 'on today' : 'off'}`} onClick={() => { setDay(today); setHover(null); }}><Target />Aujourd'hui</button>
        <button key={onReq ? 'req-on' : 'req-off'} aria-pressed={onReq} className={`btn pick ${onReq ? 'on req' : 'off'}`} disabled={!req} onClick={() => { if (req) { setDay(req.day); setHover(null); } }}>★ Jour de la demande</button>
        {!onToday && !onReq && <span key={`sel-${day}`} className="btn pick on sel" aria-live="polite">◆ {fmtDay(cursor)}</span>}
        <label htmlFor="scrub" className="small" style={{ fontWeight: 700 }}>Se placer au</label>
        <input id="scrub" type="range" min={sim.start} max={sim.end} value={cursor} onChange={(e) => { setDay(Number(e.target.value)); setHover(null); }} style={{ flex: '1 1 240px', accentColor: 'var(--ink)' }} />
        <ModeBanner cursor={cursor} today={today} scenario={sel.id !== 'plan'} />
      </div>

      {sim.requestManual && sel.id === 'plan' && (
        <div className="alert info">
          <span className="small">Jour de la demande <strong>choisi à la main</strong> : {req ? fmtDay(req.day) : '—'}{req && req.status !== 'possible' ? ' · attention, ce jour-là les conditions ne sont pas remplies' : ''}.</span>
          <span className="nav"><button className="btn sm ghost" onClick={() => setOverride(null)}>Revenir au jour calculé</button></span>
        </div>
      )}
      {!tech ? (
        <div className="row">
          <section className="card grow" data-tour="calendar">
            <div className="winnav">
              <Legend />
              {maxStart > 0 && (
                <span className="nav">
                  <button className="btn sm" disabled={winStart === 0} onClick={() => setWinStart((w) => Math.max(0, w - 6))}><Left />Mois d'avant</button>
                  <button className="btn sm" disabled={winStart >= maxStart} onClick={() => setWinStart((w) => Math.min(maxStart, w + 6))}>Mois d'après<Right /></button>
                </span>
              )}
            </div>
            <div className="scroll-x">
              <div className="cal" onMouseLeave={() => setHover(null)}>
                <div className="cal-grid tiny muted" style={{ alignItems: 'end' }}>
                  <span />
                  <div className="days31">{Array.from({ length: 31 }, (_, i) => <span key={i}>{[0, 4, 9, 14, 19, 24, 29].includes(i) ? i + 1 : ''}</span>)}</div>
                  <strong style={{ color: 'var(--int-ink)', fontSize: 12 }}>Intermittence</strong>
                  <strong style={{ color: 'var(--chom-ink)', fontSize: 12 }}>Chômage</strong>
                  <strong style={{ fontSize: 12 }}>Droit d'option</strong>
                </div>
                {shown.slice(winStart, winStart + WINDOW).map((M) => (
                  <MonthLine key={M.key} M={M} sim={sim} cursor={cursor} today={today} open={open === M.key}
                    onToggle={() => setOpen(open === M.key ? null : M.key)} onPick={pickDay} onHover={setHover} />
                ))}
              </div>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {shown[winStart] && `${cap(shown[winStart].key)} → ${cap(shown[Math.min(shown.length - 1, winStart + WINDOW - 1)].key)}`} · Survolez les jours pour voir les réservoirs bouger, cliquez pour fixer la date. Chaque mois, France Travail retire 70 % de votre salaire brut de l'allocation ; les jours non versés restent dans votre capital.
            </p>
          </section>
          <Side state={state} sim={sim} cursor={cursor}>
            <PresumedPanel info={info} isRequest={onReq} manual={sim.requestManual && onReq} canChoose={sel.id === 'plan'}
              onChoose={() => setOverride(cursor)} onReset={() => setOverride(null)}
              editHref={contractToday && !contractToday.generated ? `#/contrats?edit=${contractToday.id}` : null} editTitle={contractToday?.title ?? null} />
          </Side>
        </div>
      ) : (
        <TechTable sim={sim} cursor={cursor} today={today} />
      )}

      {!tech && <SituationCard s={situation} onSee={(d) => { setDay(d); setHover(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}

      <Strategies results={results} sel={sel} best={best} params={params} setParams={setParams} today={today} onShow={showScenario}
        recommended={situation.recommended} onResetRequest={() => setOverride(null)} />

      <div className="row">
        <div className="alert info" style={{ flex: '1 1 380px', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
          <Info />
          <span className="small" style={{ flex: 1 }}>Pour que votre chômage continue de s'écouler, restez sous <strong>{eur(salaryCeiling(sim))} brut par mois</strong> d'intermittence (au-delà, rien n'est versé). Sous <strong>{eur(salaryCeiling(sim) / 2)}</strong>, vous touchez encore au moins la moitié du mois.</span>
        </div>
        <div className="alert ok" style={{ flex: '1 1 380px', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
          <Calendar />
          <span className="small" style={{ flex: 1 }}><strong>Gardez au moins 1 jour sans contrat</strong> pour envoyer la demande : au plus tôt le lendemain de la fin du contrat qui vous fait passer les 507 h. Ce jour devient le début de vos droits d'intermittent (en vert sur le calendrier).</span>
        </div>
      </div>

      <RequestGuide sim={sim} />
    </>
  );
}

const cap = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const fmtMonthName = (d: number) => new Date(d * 86_400_000).toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' });
const salaryCeiling = (sim: Simulation) => {
  const M = sim.months.find((x) => x.aj > 0);
  return M ? (M.aj * 30) / 0.7 : 0;
};

function ModeBanner({ cursor, today, scenario }: { cursor: number; today: number; scenario: boolean }) {
  const style: React.CSSProperties = { flex: '1 1 240px', display: 'flex', flexDirection: 'column', borderRadius: 12, padding: '8px 12px', lineHeight: 1.3 };
  if (cursor === today) return <span style={{ ...style, background: 'var(--ok-bg)', color: 'var(--ok-ink)' }}><strong>Aujourd'hui · {fmtDay(today)}</strong><span className="tiny">contrats réels uniquement</span></span>;
  if (cursor > today) return <span style={{ ...style, background: 'repeating-linear-gradient(45deg,#fff0e2 0 8px,#ffe6cf 8px 16px)', color: '#7a3500', boxShadow: 'inset 0 0 0 2px var(--int)' }}><strong>Simulation au {fmtDay(cursor)}</strong><span className="tiny">{scenario ? 'contrats fictifs du scénario' : 'inclut vos contrats simulés'}</span></span>;
  return <span style={{ ...style, background: 'var(--empty)', color: 'var(--ink-2)' }}><strong>Retour au {fmtDay(cursor)}</strong><span className="tiny">situation passée</span></span>;
}

function Legend() {
  return (
    <div className="legend">
      <span><strong style={{ color: 'var(--int-ink)' }}>Intermittence</strong>{['var(--int-1)', 'var(--int-2)', 'var(--int-3)', 'var(--int-4)'].map((c) => <i key={c} className="sw" style={{ background: c }} />)} salaire du jour</span>
      <span><i className="sw hatch-sim" />simulé</span>
      <span><i className="sw hatch-gen" />fictif (scénario)</span>
      <span><i className="sw" style={{ background: 'var(--expired)' }} />heures expirées</span>
      <span><i className="sw" style={{ background: 'var(--ok)' }} />jour de la demande</span>
      <span><strong style={{ color: 'var(--chom-ink)' }}>Chômage</strong><i className="sw" style={{ width: 22, height: 6, borderRadius: 99, background: 'var(--chom)' }} />part versée</span>
    </div>
  );
}

function statusBadge(M: { status: string; hoursEnd: number; ecartEnd: number | null; tight: boolean }) {
  if (M.status === 'possible' && M.tight) return <><span className="badge gap" title="L’écart dépasse à peine le seuil : une petite erreur sur les salaires ou l’allocation peut faire refuser la demande.">De justesse</span><span className="tiny muted">écart {pct(M.ecartEnd)}</span></>;
  if (M.status === 'possible') return <><span className="badge ok">Possible</span><span className="tiny muted">écart {pct(M.ecartEnd)}</span></>;
  if (M.status === 'gap') return <><span className="badge gap">Non</span><span className="tiny muted">écart {pct(M.ecartEnd)}</span></>;
  if (M.status === 'used') return <><span className="badge no" title="Cette fin de contrat a déjà servi à une demande de droit d’option : il en faut une nouvelle.">Non</span><span className="tiny muted">fin de contrat déjà examinée</span></>;
  return <><span className="badge no">Non</span><span className="tiny muted">{Math.round(M.hoursEnd)} h sur 507</span></>;
}

function MonthLine({ M, sim, cursor, today, open, onToggle, onPick, onHover }: {
  M: MonthRow; sim: Simulation; cursor: number; today: number; open: boolean;
  onToggle: () => void; onPick: (d: number) => void; onHover: (d: number) => void;
}) {
  const req = sim.requestDay?.day;
  const tag = M.hasGenerated ? 'fictif' : M.hasSimulated ? 'simulé' : '';
  return (
    <div className={open ? 'month-row open' : 'month-row'} style={{ padding: '2px 4px' }}>
      <div className="cal-grid">
        <button className="month-btn" aria-expanded={open} onClick={onToggle}>
          <span style={{ display: 'inline-block', width: 12, transition: 'transform .2s', transform: `rotate(${open ? 90 : 0}deg)`, color: 'var(--muted)' }}>›</span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            {cap(M.key).replace(/^\w/, (c) => c.toUpperCase())}
            <span className="tiny" style={{ color: tag === 'fictif' ? '#5b3fc4' : 'var(--sim)' }}>{tag}</span>
          </span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="days31">
            {Array.from({ length: 31 }, (_, k) => {
              const c = M.cells[k];
              if (!c) return <span key={k} className="dcell hidden" />;
              const ct = c.contract;
              let bg = 'var(--empty)';
              const expired = ct && toEnd(ct) + 365 < cursor;
              if (ct) {
                if (expired) bg = 'var(--expired)';
                else if (ct.generated) bg = 'repeating-linear-gradient(-45deg,var(--gen) 0 3px,#fff 3px 5px)';
                else if (ct.simulated) bg = 'var(--sim)';
                else bg = rateColor(c.rate);
              }
              const cls = ['dcell', c.day > cursor ? 'after' : '', c.day === cursor ? 'cursor' : '', c.day === today ? 'today' : '', c.day === req ? 'request' : ''].join(' ');
              return (
                <button key={k} className={cls} style={{ background: bg }} onClick={() => onPick(c.day)} onMouseEnter={() => onHover(c.day)}
                  aria-label={`${fmtDay(c.day)}${ct ? ` · ${ct.title} · ${Math.round(c.rate)} € brut${expired ? ' · expiré' : ''}` : ''}${c.day === req ? ' · jour de la demande' : ''}`} />
              );
            })}
          </div>
          <div className="chombar"><i style={{ width: `${Math.round((M.paidDays / M.indemDays) * 100)}%` }} /></div>
        </div>
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}><strong>{Math.round(M.hours)} h</strong><span className="tiny muted">{eur(M.gross)} brut</span></span>
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}><strong style={{ color: 'var(--chom-ink)' }}>{M.arce ? `ARCE ${eur(M.arce)}` : eur(M.paid)}</strong><span className="tiny muted">{M.paidDays} j payés sur {M.indemDays}</span></span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>{statusBadge(M)}</span>
      </div>
      {open && (
        <div className="detail">
          <div style={{ background: 'var(--int-bg)' }}>
            <strong style={{ color: 'var(--int-ink)' }}>Intermittence · contrats</strong>
            {M.contracts.length ? M.contracts.map((c) => (
              <div className="kv" key={c.id}><span>{c.generated ? c.title : <a href={`#/contrats?edit=${c.id}`} style={{ color: 'inherit', fontWeight: 700 }}>{c.title}</a>}{c.simulated && !c.generated ? ' (simulé)' : ''}<span className="tiny muted" style={{ display: 'block' }}>{c.days.length} j · {Math.round(c.gross / c.days.length)} €/jour{c.teaching ? ' · enseignement' : ''}</span></span><strong>{c.hours} h · {eur(c.gross)}</strong></div>
            )) : <span className="muted">Aucun contrat ce mois-ci.</span>}
            <a href="#/contrats" className="small" style={{ fontWeight: 700, color: 'var(--int-ink)' }}>Modifier les contrats →</a>
          </div>
          <div style={{ background: 'var(--chom-bg)' }}>
            <strong style={{ color: 'var(--chom-ink)' }}>Chômage · le calcul</strong>
            <div className="kv"><span>{M.indemDays} jours × {M.aj.toFixed(2).replace('.', ',')} €</span><strong>{eur(M.full)}</strong></div>
            <div className="kv"><span>− 70 % du salaire brut ({eur(M.gross)})</span><strong>− {eur(0.7 * M.gross)}</strong></div>
            <div className="kv"><span>Plafond salaire + chômage</span><strong>{M.plafondHit ? 'atteint' : 'ok'}</strong></div>
            <div className="kv"><span>Versé</span><strong>{eur(M.paid)} ({M.paidDays} j)</strong></div>
            {M.unpaidDays ? <div className="kv tiny muted"><span>Jours sans indemnisation (saisis)</span><span>{M.unpaidDays} j</span></div> : null}
            {M.arce ? <div className="kv"><span>ARCE (part du reliquat)</span><strong>{eur(M.arce)}</strong></div> : null}
            <div className="kv"><span>Jours restants</span><strong>{M.capStartDays} j → {M.capEndDays} j</strong></div>
            <div className="kv tiny muted"><span>valeur retenue pour le droit d'option</span><span>{eur(M.capStart)} → {eur(M.capEnd)}</span></div>
          </div>
          <div style={{ background: 'var(--card-2)' }}>
            <strong>Droit d'option · fin de mois</strong>
            <div className="kv"><span>Heures sur 12 mois</span><strong>{Math.round(M.hoursEnd)} / 507 h</strong></div>
            <div className="kv"><span>Allocation intermittente estimée</span><strong>{M.presumedEnd ? `${M.presumedEnd.aj.toFixed(2).replace('.', ',')} €/j` : '—'}</strong></div>
            <div className="kv"><span>Droit intermittent comparé</span><strong>{M.presumedEnd ? eur(M.presumedEnd.global) : '—'}</strong></div>
            {M.presumedEnd && <div className="kv tiny muted"><span>{globalDaysText(M.presumedEnd)}</span></div>}
            <div className="kv"><span>Seuil (capital + 30 %)</span><strong>{eur(M.capEnd * 1.3)}</strong></div>
            <div className="kv"><span>Écart</span><strong>{pct(M.ecartEnd)}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}



const toEnd = (c: { days: string[] }) => Math.round(Date.parse(c.days[c.days.length - 1]) / 86_400_000);

function Side({ state, sim, cursor, children }: { state: ReturnType<Simulation['at']>; sim: Simulation; cursor: number; children?: React.ReactNode }) {
  const scale = Math.max(20_000, sim.months[0]?.capStart ?? 0, state.presumed?.global ?? 0) * 1.05;
  const e = state.ecart;
  const deg = e === null ? -90 : -90 + ((Math.max(-0.2, Math.min(1, e)) + 0.2) / 1.2) * 180;
  const ok = state.status === 'possible';
  const lost = sim.expiredAt(cursor).filter((c) => toEnd(c) + 365 >= sim.start - 365);
  const lostH = lost.reduce((a, c) => a + c.hours, 0);
  return (
    <aside className="side" data-tour="side">
      <section className="card dark">
        <div className="kv" style={{ alignItems: 'baseline' }}><strong style={{ fontSize: 18 }}>{fmtDay(cursor)}</strong><span className="badge" style={ok ? { background: '#6bcdb4', color: '#0b3b30' } : { background: '#3a4757', color: '#e6eaf0' }}>{ok ? 'option possible' : 'option : non'}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="tank"><i style={{ background: 'var(--chom)', height: `${Math.min(100, (state.capital / scale) * 100)}%` }} /><b>{eur(state.capital)}<small className="tank-days">{state.capitalDays} jours</small></b></div>
            <span className="small" style={{ fontWeight: 700, color: '#a9c3f7' }}>Chômage restant</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="tank"><i style={{ background: 'var(--int)', height: `${Math.min(100, ((state.presumed?.global ?? 0) / scale) * 100)}%` }} /><span className="seuil" style={{ bottom: `${Math.min(100, ((state.capital * 1.3) / scale) * 100)}%` }} /><b>{state.presumed ? eur(state.presumed.global) : '—'}</b></div>
            <span className="small" style={{ fontWeight: 700, color: '#f9be8f' }}>Intermittence</span>
          </div>
        </div>
        <span className="tiny" style={{ color: 'var(--on-dark-2)', textAlign: 'center' }}>pointillé = chômage restant + 30 % : {eur(state.capital * 1.3)}</span>
      </section>
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg viewBox="0 0 200 116" width="150" aria-hidden="true" style={{ flex: 'none' }}>
            <path d="M20 100 A80 80 0 0 1 30.7 60" fill="none" stroke="var(--line)" strokeWidth="18" />
            <path d="M30.7 60 A80 80 0 0 1 79.3 22.7" fill="none" stroke="#F6C77A" strokeWidth="18" />
            <path d="M79.3 22.7 A80 80 0 0 1 180 100" fill="none" stroke="#6BCDB4" strokeWidth="18" />
            <g style={{ transformOrigin: '100px 100px', transform: `rotate(${deg}deg)`, transition: 'transform .25s' }}><path d="M100 100 L100 32" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" /></g>
            <circle cx="100" cy="100" r="9" fill="var(--ink)" />
          </svg>
          <div><span className="tiny muted">Écart entre les 2 chômages</span><strong style={{ display: 'block', fontSize: 30, lineHeight: 1.1 }}>{pct(e)}</strong><span className="tiny muted">il faut +30 %</span></div>
        </div>
        {state.tight ? <span className="small" style={{ background: 'var(--warn-bg)', color: 'var(--warn-ink)', borderRadius: 10, padding: '8px 10px' }}><strong>Marge faible.</strong> L’écart dépasse à peine 30 % : vérifiez l’allocation brute (relevé de situation) et les salaires bruts de chaque AEM avant d’envoyer la demande.</span> : null}
        <div className="kv small"><span style={{ fontWeight: 700 }}>Heures sur 12 mois glissants</span><strong>{Math.floor(state.hours)} / 507 h</strong></div>
        <div className="bar"><i style={{ width: `${Math.min(100, (state.hours / 507) * 100)}%` }} /></div>
        <span className="tiny muted">{lostH ? `${lostH} h ont expiré à cette date (contrats de plus d’un an, en gris).` : 'Aucune heure expirée à cette date.'}</span>
      </section>
      {children}
    </aside>
  );
}

type Explain = { key: string; kind: '507' | 'hcap' | 'srcap' | 'calc' } | null;

function TechTable({ sim, cursor, today }: { sim: Simulation; cursor: number; today: number }) {
  const { data } = useStore();
  // Mois où un relevé France Travail a été saisi : le capital y est connu, pas estimé
  const releveMonths = new Map(data.profile.releves.map((r) => [r.date.slice(0, 7), r]));
  const [explain, setExplain] = useState<Explain>(null);
  const firstAt = (pred: (M: MonthRow) => boolean) => sim.months.find((M, i) => pred(M) && (i === 0 || !pred(sim.months[i - 1])))?.key;
  const d0 = sim.months.find((M) => M.presumedEnd)?.presumedEnd?.detail;
  const hCap = d0?.hCap ?? 720;
  const srCap = d0?.srCap ?? 14_400;
  const k507 = firstAt((M) => M.hoursEnd >= 507);
  const kH = firstAt((M) => M.hoursEnd > hCap);
  const kS = firstAt((M) => M.grossEnd > srCap);
  const toggle = (key: string, kind: NonNullable<Explain>['kind']) => setExplain(explain && explain.key === key && explain.kind === kind ? null : { key, kind });
  const Q = ({ k, kind, label }: { k: string; kind: NonNullable<Explain>['kind']; label: string }) => (
    <button className="qmark" aria-label={label} aria-expanded={explain?.key === k && explain.kind === kind} onClick={() => toggle(k, kind)}>?</button>
  );
  const COLS = 17;
  return (
    <div className="tablewrap">
      <table className="data">
        <thead>
          <tr>
            <th />
            <th className="group" colSpan={5} style={{ color: 'var(--int-ink)', borderColor: 'var(--int)' }}>Intermittence</th>
            <th className="group" colSpan={3} style={{ color: 'var(--chom-ink)', borderColor: 'var(--chom)' }}>Chômage</th>
            <th className="group" colSpan={4} style={{ color: 'var(--int-ink)', borderColor: 'var(--int-2)' }}>Intermittence présumée</th>
            <th className="group" colSpan={4} style={{ borderColor: 'var(--ink)' }}>Droit d'option</th>
          </tr>
          <tr>
            <th>Mois</th><th>jours travaillés</th><th>heures</th><th>heures sur 12 mois</th><th>salaire brut</th><th>brut sur 12 mois</th>
            <th>versé</th><th>jours payés</th><th>capital restant</th>
            <th>taux jour</th><th>taux mois</th><th>droit (12 mois)</th><th>calcul</th>
            <th>seuil (+30 %)</th><th>écart</th><th>statut</th><th />
          </tr>
        </thead>
        <tbody>
          {sim.months.map((M) => {
            const now = cursor >= M.start && cursor < M.start + M.n;
            const hCls = M.key === k507 ? 'mark-ok' : M.key === kH ? 'mark-warn' : '';
            const ex = explain && explain.key === M.key ? explain.kind : null;
            const p = M.presumedEnd;
            return (
              <FragmentRows key={M.key}>
                <tr className={now ? 'now' : M.start > today ? 'future' : ''}>
                  <td><strong>{cap(M.key)}</strong> {M.hasGenerated ? <span className="badge gen">fictif</span> : M.hasSimulated ? <span className="badge sim">simulé</span> : null}</td>
                  <td>{M.workedDays}</td>
                  <td>{Math.round(M.hours)} h</td>
                  <td className={hCls}>
                    <strong>{Math.round(M.hoursEnd)} h</strong>
                    {M.key === k507 && <> <Q k={M.key} kind="507" label="Pourquoi 507 heures ?" /></>}
                    {M.key === kH && M.key !== k507 && <> <Q k={M.key} kind="hcap" label={`Que se passe-t-il au-delà de ${hCap} heures ?`} /></>}
                  </td>
                  <td>{eur(M.gross)}</td>
                  <td className={M.key === kS ? 'mark-warn' : ''}>
                    {eur(M.grossEnd)}
                    {M.key === kS && <> <Q k={M.key} kind="srcap" label={`Que se passe-t-il au-delà de ${eur(srCap)} ?`} /></>}
                  </td>
                  <td><strong>{M.arce ? `ARCE ${eur(M.arce)}` : eur(M.paid)}</strong></td>
                  <td>{M.paidDays} / {M.indemDays}</td>
                  <td className={releveMonths.has(M.key) ? 'mark-known' : ''} title={releveMonths.has(M.key) ? `Relevé France Travail du ${fmtDay(Math.round(Date.parse(releveMonths.get(M.key)!.date) / 86_400_000))} : ${releveMonths.get(M.key)!.daysLeft} jours restants` : undefined}>
                    <strong>{eur(M.capEnd)}</strong>
                    <span className="tiny" style={{ display: 'block', opacity: 0.75 }}>{M.capEndDays} j{releveMonths.has(M.key) ? ' · relevé ✓' : ''}</span>
                  </td>
                  <td>{p ? `${p.aj.toFixed(2).replace('.', ',')} €` : '—'}</td>
                  <td><strong>{p ? eur(p.monthly) : '—'}</strong></td>
                  <td>{p ? eur(p.global) : '—'}</td>
                  <td>{p ? <Q k={M.key} kind="calc" label={`Calcul de l'intermittence présumée en ${cap(M.key)}`} /> : '—'}</td>
                  <td>{eur(M.capEnd * 1.3)}</td>
                  <td style={{ fontWeight: 800, color: M.status === 'possible' ? 'var(--ok)' : M.status === 'gap' ? 'var(--int-ink)' : 'var(--muted)' }}>{pct(M.ecartEnd)}</td>
                  <td><span className={`badge ${M.status === 'possible' ? (M.tight ? 'gap' : 'ok') : M.status === 'gap' ? 'gap' : 'no'}`}>{M.status === 'possible' ? (M.tight ? 'De justesse' : 'Possible') : 'Non'}</span></td>
                  <td />
                </tr>
                {ex && (
                  <tr className="explain"><td colSpan={COLS}>
                    {ex === '507' && <p><strong>Vous passez les 507 heures ce mois-ci.</strong> C'est le minimum pour avoir droit à l'intermittence : 507 h sur les 12 mois avant la fin de votre dernier contrat. Les contrats de plus d'un an ne comptent plus.</p>}
                    {ex === 'hcap' && <p><strong>Vous passez les {hCap} heures ce mois-ci.</strong> Au-delà, chaque heure en plus ne fait presque plus monter votre allocation (environ trois fois moins qu'avant). C'est comme une sorte de limite : votre intermittence ne pourra pas vraiment grimper plus haut si votre salaire n'augmente pas.</p>}
                    {ex === 'srcap' && <p><strong>Vous passez les {eur(srCap)} de salaire sur 12 mois ce mois-ci.</strong> Au-delà, chaque euro gagné en plus ne fait presque plus monter votre allocation (environ huit fois moins qu'avant). C'est comme une sorte de limite : votre intermittence ne grimpera plus beaucoup, même si vous gagnez davantage.</p>}
                    {ex === 'calc' && p && <div style={{ maxWidth: 640 }}><CalcDetail d={p.detail} /></div>}
                  </td></tr>
                )}
              </FragmentRows>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Strategies({ results, sel, best, params, setParams, today, onShow, recommended, onResetRequest }: {
  results: ScenarioResult[]; sel: ScenarioResult; best?: ScenarioResult; params: ScenarioParams;
  setParams: (p: ScenarioParams) => void; today: number; onShow: (r: ScenarioResult) => void;
  recommended: ScenarioId[]; onResetRequest: () => void;
}) {
  const { data } = useStore();
  const p = useMemo(() => pattern(data.contracts, today, data.settings.fallbackHourlyGross), [data, today]);
  const refOpts = p.perMonth.filter((x) => x.hours > 0);
  const [showAll, setShowAll] = useState(false);
  const useful = recommended.map((id) => results.find((r) => r.id === id)).filter((r): r is ScenarioResult => !!r);
  if (!useful.some((r) => r.id === sel.id)) useful.push(sel);
  const others = results.filter((r) => !useful.includes(r));
  const othersMain = others.filter((r) => r.group === 'main');
  const othersOther = others.filter((r) => r.group === 'other');
  const futureOpts = Array.from({ length: 12 }, (_, k) => {
    const { y, m } = parts(today);
    const d = new Date(Date.UTC(y, m + 1 + k, 1));
    return { v: k, l: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
  });
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="topbar" data-tour="scenarios"><h2>Scénarios utiles pour vous</h2><span className="small muted">« Voir la simulation » remplit le calendrier avec des contrats fictifs</span></div>
      <div className="cards">
        {useful.map((r) => card(r))}
      </div>
      <button className="btn sm" aria-expanded={showAll} onClick={() => setShowAll(!showAll)} style={{ alignSelf: 'flex-start' }}>
        {showAll ? 'Masquer les autres scénarios' : `Voir tous les scénarios (${others.length} de plus)`}
      </button>
      {showAll && (
        <div className="all-scenarios">
          {othersMain.length > 0 && <h3 className="small muted" style={{ margin: 0 }}>Rythmes de travail</h3>}
          <div className="cards small-cards">{othersMain.map((r) => card(r))}</div>
          {othersOther.length > 0 && <h3 className="small muted" style={{ margin: '8px 0 0' }}>Autres solutions · moins connues, parfois radicales, à vérifier avec France Travail</h3>}
          <div className="cards small-cards">{othersOther.map((r) => card(r))}</div>
        </div>
      )}
    </section>
  );

  function card(r: ScenarioResult) {
          const rq = r.sim.requestDay;
          const lost = rq ? r.sim.expiredAt(rq.day).filter((c) => toEnd(c) + 365 >= today) : [];
          const lostH = lost.reduce((a, c) => a + c.hours, 0);
          const active = r.id === sel.id;
          return (
            <article key={r.id} className={['scard', active ? 'active' : '', best && r.id === best.id ? 'best' : ''].join(' ')}>
              <div className="kv" style={{ alignItems: 'center' }}>
                <span className={`badge ${rq ? 'ok' : 'no'}`}>{rq ? 'Possible' : 'Impossible'}</span>
                <span className="tiny" style={{ fontWeight: 800, color: 'var(--ok)' }}>{best && r.id === best.id ? '★ le plus rapide' : r.id === 'plan' ? 'votre plan' : ''}</span>
              </div>
              <strong style={{ fontSize: 17, lineHeight: 1.25 }}>{r.title}</strong>
              <span className="small" style={{ color: 'var(--ink-2)' }}>{r.description}</span>
              {r.id === 'plan' && (
                <div className="nav">
                  {r.sim.requestManual
                    ? <button className="btn sm ghost" onClick={onResetRequest}>Revenir au jour calculé</button>
                    : <span className="tiny muted">Pour choisir le jour à la main : cliquez un jour, puis « En faire mon jour de demande » dans la colonne de droite.</span>}
                </div>
              )}
              {r.id === 'stop' && (
                <label className="field">Dernier mois travaillé
                  <select value={r.stopMonth ?? -1} onChange={(e) => setParams({ ...params, stopMonth: Number(e.target.value) })}>
                    <option value={-1}>J'arrête dès maintenant</option>
                    {futureOpts.map((o) => <option key={o.v} value={o.v}>{o.l}{r.autoStop && r.stopMonth === o.v ? ' (premier possible)' : ''}</option>)}
                  </select>
                </label>
              )}
              {(r.id === 'plus' || r.id === 'minus') && (
                <div className="grid2">
                  <label className="field">{r.id === 'plus' ? '% de plus' : '% de moins'}
                    <input type="number" min={5} max={r.id === 'plus' ? 300 : 95} step={5} value={r.id === 'plus' ? params.plusPct : params.minusPct}
                      onChange={(e) => setParams(r.id === 'plus' ? { ...params, plusPct: Number(e.target.value) || 0 } : { ...params, minusPct: Number(e.target.value) || 0 })} />
                  </label>
                  <label className="field">par rapport à
                    <select value={(r.id === 'plus' ? params.plusRef : params.minusRef) ?? ''} onChange={(e) => setParams(r.id === 'plus' ? { ...params, plusRef: e.target.value || null } : { ...params, minusRef: e.target.value || null })}>
                      <option value="">dernier mois travaillé</option>
                      {refOpts.map((o) => <option key={o.key} value={o.key}>{o.label} ({Math.round(o.hours)} h)</option>)}
                    </select>
                  </label>
                </div>
              )}
              {r.id === 'habit' && (
                <label className="field">Mois témoin, recopié chaque mois
                  <select value={params.habitRef ?? ''} onChange={(e) => setParams({ ...params, habitRef: e.target.value || null })}>
                    <option value="">Mon rythme moyen ({Math.round(p.monthlyHours)} h/mois)</option>
                    {refOpts.map((o) => <option key={o.key} value={o.key}>{o.label} ({Math.round(o.hours)} h)</option>)}
                  </select>
                </label>
              )}
              {r.id === 'formation' && (
                <label className="field">Heures de formation
                  <input type="number" min={7} max={338} step={7} value={params.trainingHours} onChange={(e) => setParams({ ...params, trainingHours: Number(e.target.value) || 0 })} />
                </label>
              )}
              {r.id === 'arce' && (
                <label className="field">Mois de la demande d'ARCE
                  <select value={params.arceMonth} onChange={(e) => setParams({ ...params, arceMonth: Number(e.target.value) })}>
                    {futureOpts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </label>
              )}
              {(r.id === 'sprint' || r.id === 'fond' || r.id === 'alt') && (
                <label className="field">Heures par mois travaillé
                  <input type="number" min={20} max={200} step={10} value={params.intenseHours} onChange={(e) => setParams({ ...params, intenseHours: Number(e.target.value) || 80 })} />
                </label>
              )}
              {r.warning && <div className="warnbox"><Warn /><span>{r.warning}</span></div>}
              {r.note && <div className="warnbox" style={{ background: 'var(--chom-bg)', color: 'var(--chom-ink)' }}><Info /><span>{r.note}</span></div>}
              <div className={`result ${rq ? 'ok' : 'no'}`}>
                <strong style={{ fontSize: 17 }}>{rq ? `${r.sim.requestManual ? 'Demande choisie le' : 'Demande possible le'} ${fmtDay(rq.day)}` : 'Pas de bascule'}</strong>
                <span className="tiny">{rq ? (Number.isFinite(rq.ecart ?? 0) ? `écart ${pct(rq.ecart)} · ${Math.round(rq.hours)} h sur 12 mois` : 'chômage épuisé : ouverture intermittente directe') : r.sim.maxHours < 507 ? `507 h jamais atteintes sur 12 mois glissants (max ${Math.round(r.sim.maxHours)} h).` : 'L’écart n’atteint pas 30 % sur les 12 prochains mois.'}</span>
                {rq && <span className="tiny" style={{ fontWeight: 700 }}>{lostH ? `⏳ ${lostH} h expirées d’ici là (${lost.map((c) => fromDay(toEnd(c)).slice(0, 7)).join(', ')})` : 'Aucune heure perdue par expiration'}</span>}
              </div>
              <button className={active ? 'btn' : 'btn'} style={active ? { background: '#6a4fd8', color: '#fff', borderColor: '#6a4fd8' } : undefined} onClick={() => onShow(r)}>
                {active ? <><Check />Affiché sur le calendrier</> : 'Voir la simulation'}
              </button>
            </article>
          );
  }
}

function SituationCard({ s, onSee }: { s: Situation; onSee: (day: number) => void }) {
  const tone = { ok: 'var(--ok-bg)', warn: 'var(--warn-bg)', info: 'var(--chom-bg)', bad: 'var(--warn-bg)' }[s.tone];
  const ink = { ok: 'var(--ok-ink)', warn: 'var(--warn-ink)', info: 'var(--chom-ink)', bad: 'var(--warn-ink)' }[s.tone];
  return (
    <section className="card situation" data-tour="situation" style={{ boxShadow: `inset 6px 0 0 ${ink}` }}>
      <span className="tiny" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: ink }}>Votre situation</span>
      <h2 style={{ margin: 0 }}>{s.title}</h2>
      <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '90ch' }}>
        {s.points.map((p) => <li key={p}>{p}</li>)}
      </ul>
      {s.candidates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong>Comparer les dates de demande possibles</strong>
          <div className="scroll-x">
            <table className="ctable" style={{ minWidth: 860 }}>
              <thead><tr><th>Demande le</th><th>Fin de contrat retenue</th><th className="num">Allocation / mois</th><th className="num">par jour</th><th className="num">Heures retenues</th><th>Date anniversaire</th><th className="num">Heures prévues pour l'an prochain</th><th className="num">Écart</th><th /></tr></thead>
              <tbody>
                {s.candidates.map((c) => (
                  <tr key={c.day} style={!c.possible || c.past ? { opacity: c.past ? 0.7 : 0.55 } : undefined}>
                    <td><strong>{fmtDay(c.day)}</strong>{c.past
                      ? <span className="badge no" style={{ marginLeft: 6 }}>déjà passée</span>
                      : c === s.candidates.find((x) => x.possible && !x.past) && <span className="badge ok" style={{ marginLeft: 6 }}>au plus tôt</span>}</td>
                    <td>{fmtDay(c.lastEnd)}</td>
                    <td className="num"><strong>{eur(c.monthly)}</strong></td>
                    <td className="num">{c.aj.toFixed(2).replace('.', ',')} €</td>
                    <td className="num">{Math.round(c.hours)} h</td>
                    <td>{fmtDay(c.anniversary)}</td>
                    <td className="num">{c.nextYearHours ? `${Math.round(c.nextYearHours)} h` : '—'}</td>
                    <td className="num">{c.possible ? pct(c.ecart) : 'non'}</td>
                    <td><button className="btn sm" onClick={() => onSee(c.day)}>Voir ce jour</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.candidates.some((c) => c.past) && <span className="tiny muted">« Déjà passée » : la première date à laquelle vous auriez pu demander l'intermittence. On ne peut pas revenir en arrière : France Travail retient toujours la dernière fin de contrat avant votre demande.</span>}
          <span className="tiny muted">Date anniversaire : fin de vos droits d'intermittent, 12 mois après la fin de contrat retenue. Pour les renouveler, il faudra de nouveau 507 h entre ces deux dates. Pour fixer votre jour de demande : « Voir ce jour », puis « En faire mon jour de demande » dans la colonne de droite.</span>
        </div>
      )}
      {s.advice && <p className="small" style={{ margin: 0, background: tone, color: ink, borderRadius: 10, padding: '10px 12px', maxWidth: '90ch' }}><strong>Notre lecture :</strong> {s.advice}</p>}
    </section>
  );
}

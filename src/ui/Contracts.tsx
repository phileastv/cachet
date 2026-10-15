import { useEffect, useMemo, useState } from 'react';
import { addMonthsDay, daysInMonth, fmtDay, fmtDayShort, fmtMonth, fromDay, MONTHS_SHORT, monthStart, parts, toDay, weekday } from '../domain/dates';
import { contractEnd, sortContracts } from '../domain/engine';
import type { Annexe, Contract } from '../domain/types';
import { uid, useStore } from '../state/store';
import { eur, eur2, num, rateColor } from './format';
import { Calendar, Close, Info, Left, Right, Trash } from './Icons';
import { DocImport } from './DocImport';
import { AemGuide, FT_COURRIERS_URL, ReleveGuide } from './ImportGuides';
import { Tour, type TourStep } from './Tour';

const CONTRACT_TOUR: TourStep[] = [
  { target: 'import', title: '1. Déposez vos AEM', body: <>Le plus simple et le plus juste : glissez ici toutes vos attestations employeur (PDF). Les contrats se créent tout seuls, avec les vrais jours travaillés. Rien n'est envoyé : tout est lu dans votre navigateur.</> },
  { target: 'cal', title: '2. Vérifiez sur le calendrier', body: <>Vos contrats apparaissent sur le calendrier. Pour en ajouter un à la main (contrat sans AEM, contrat à venir), cochez ses jours : le formulaire « Ajouter un contrat à la main » s'ouvre à droite.</> },
  { target: 'list', title: '3. Retrouvez-les ici', body: <>Tous vos contrats s'affichent en bas, triés par date. Cliquez une ligne pour la modifier, changer ses jours sur le calendrier, la dupliquer ou la supprimer.</> },
  { target: 'tab-regime', title: '4. Et votre chômage', body: <>Dans l'onglet « Régime général », déposez votre dernier relevé de situation : tous les calculs partent de là.</> },
];

export function Contracts({ tab }: { tab: 'intermittence' | 'regime' }) {
  return (
    <>
      <div className="topbar">
        <h1>Mes données</h1>
        <a className="btn" href="#/"><Left />Tableau de bord</a>
      </div>
      <nav className="tabs" aria-label="Type de données">
        <a href="#/contrats" aria-current={tab === 'intermittence' ? 'page' : undefined}><span className="sw" style={{ background: 'var(--int)' }} />Intermittence · contrats</a>
        <a data-tour="tab-regime" href="#/contrats/regime" aria-current={tab === 'regime' ? 'page' : undefined}><span className="sw" style={{ background: 'var(--chom)' }} />Régime général · mon chômage</a>
      </nav>
      {tab === 'intermittence' ? <Intermittence /> : <RegimeGeneral />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet Intermittence                                                */
/* ------------------------------------------------------------------ */

type HoursMode = 'total' | 'perDay' | 'cachets';
type GrossMode = 'total' | 'perDay';

function Intermittence() {
  const { data, today, update } = useStore();
  const contracts = useMemo(() => sortContracts(data.contracts), [data.contracts]);
  const t = parts(today);
  const [view, setView] = useState({ y: t.y, m: t.m });
  const [sel, setSel] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [daysEditId, setDaysEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [range, setRange] = useState({ from: '', to: '' });
  // Saisie manuelle repliée par défaut (l'import des AEM est le chemin principal) ; elle s'ouvre dès qu'on coche un jour
  const [manualOpen, setManualOpen] = useState(false);
  useEffect(() => {
    if (sel.length) setManualOpen(true);
  }, [sel.length]);

  // Arrivée depuis le tableau de bord avec « ?edit=ID » : on ouvre directement ce contrat
  useEffect(() => {
    const id = new URLSearchParams(location.hash.split('?')[1] ?? '').get('edit');
    const c = id ? data.contracts.find((x) => x.id === id) : null;
    if (!c) return;
    const s0 = parts(toDay([...c.days].sort()[0]));
    setView({ y: s0.y, m: s0.m });
    setEditId(c.id);
    setTimeout(() => document.getElementById(`row-${c.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Saisie manuelle « du … au … » : sélectionne les jours libres de la plage. */
  const applyRange = (from: string, to: string) => {
    setRange({ from, to });
    if (!from) return;
    let a = toDay(from);
    let b = to ? toDay(to) : a;
    if (b < a) [a, b] = [b, a];
    if (b - a > 366) { setMsg('Plage trop longue (plus d’un an).'); return; }
    const days: string[] = [];
    for (let d = a; d <= b; d++) if (!byDay.has(fromDay(d))) days.push(fromDay(d));
    setSel(days);
    setAnchor(fromDay(b));
    setFocus(null);
    const p0 = parts(a);
    setView({ y: p0.y, m: p0.m });
    setMsg(days.length < b - a + 1 ? 'Certains jours de cette plage ont déjà un contrat : ils ne sont pas sélectionnés.' : null);
  };
  const [f, setF] = useState({ title: '', hoursMode: 'total' as HoursMode, hours: '', grossMode: 'total' as GrossMode, gross: '', annexe: data.profile.annexe as Annexe, simulated: true, teaching: false });

  const byDay = new Map<string, Contract>();
  contracts.forEach((c) => c.days.forEach((d) => byDay.set(d, c)));
  const expired = (c: Contract) => contractEnd(c) + data.settings.rules.windowDays < today;
  const setContracts = (fn: (l: Contract[]) => Contract[]) => update((d) => ({ ...d, contracts: fn(d.contracts) }));
  const patch = (id: string, p: Partial<Contract>) => setContracts((l) => l.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const editing = daysEditId ? contracts.find((c) => c.id === daysEditId) ?? null : null;

  const nSel = sel.length;
  const weekendSel = sel.filter((iso) => weekday(toDay(iso)) >= 5).length;
  const hoursTotal = f.hoursMode === 'total' ? num(f.hours) : f.hoursMode === 'perDay' ? num(f.hours) * nSel : num(f.hours) * 12;
  const grossTotal = f.grossMode === 'total' ? num(f.gross) : num(f.gross) * nSel;
  const canAdd = nSel > 0 && hoursTotal > 0 && grossTotal >= 0 && (grossTotal > 0 || f.teaching);

  const pick = (iso: string, shift: boolean) => {
    setMsg(null);
    if (editing) {
      const owner = byDay.get(iso);
      if (owner && owner.id !== editing.id) { setMsg(`Ce jour appartient déjà à « ${owner.title} ».`); return; }
      const n = editing.days.length;
      if (editing.days.includes(iso)) {
        if (n === 1) { setMsg('Un contrat garde au moins un jour : supprimez-le plutôt.'); return; }
        patch(editing.id, { days: editing.days.filter((d) => d !== iso), hours: round1((editing.hours * (n - 1)) / n), gross: Math.round((editing.gross * (n - 1)) / n) });
      } else {
        patch(editing.id, { days: [...editing.days, iso].sort(), hours: round1((editing.hours * (n + 1)) / n), gross: Math.round((editing.gross * (n + 1)) / n) });
      }
      return;
    }
    if (shift && anchor) {
      let a = toDay(anchor), b = toDay(iso);
      if (b < a) [a, b] = [b, a];
      const add: string[] = [];
      for (let d = a; d <= b; d++) if (!byDay.has(fromDay(d))) add.push(fromDay(d));
      setSel((s) => [...new Set([...s, ...add])]);
      setAnchor(iso);
      setFocus(null);
      return;
    }
    if (byDay.has(iso) && sel.length === 0) { setFocus(focus === iso ? null : iso); return; }
    if (byDay.has(iso)) { setMsg('Ce jour a déjà un contrat : cliquez-le sans sélection en cours pour le modifier.'); return; }
    setSel((s) => (s.includes(iso) ? s.filter((d) => d !== iso) : [...s, iso]));
    setAnchor(iso);
    setFocus(null);
  };

  const add = () => {
    if (!canAdd) return;
    const days = [...sel].sort();
    setContracts((l) => [...l, { id: uid(), title: f.title.trim() || 'Contrat', days, hours: round1(hoursTotal), gross: Math.round(grossTotal), annexe: f.annexe, simulated: f.simulated, teaching: f.teaching }]);
    setSel([]);
    setAnchor(null);
    setRange({ from: '', to: '' });
    setF({ ...f, title: '', hours: '', gross: '' });
  };

  const duplicate = (c: Contract, kind: 'week' | 'month') => {
    const shift = (iso: string) => fromDay(kind === 'week' ? toDay(iso) + 7 : addMonthsDay(toDay(iso), 1));
    setContracts((l) => [...l, { ...c, id: uid(), title: `${c.title} (copie)`, simulated: true, generated: false, days: c.days.map(shift) }]);
  };

  // Calendrier du mois affiché
  const first = monthStart(view.y, view.m);
  const n = daysInMonth(view.y, view.m);
  const lead = weekday(first);
  const focusC = focus ? byDay.get(focus) ?? null : null;
  const pills = Array.from({ length: 18 }, (_, k) => {
    const s = monthStart(t.y, t.m - 12 + k);
    const p = parts(s);
    // Heures du mois, y compris les contrats à cheval sur deux mois (réparties par jour)
    const e = s + daysInMonth(p.y, p.m);
    const h = contracts.reduce((a, c) => a + (c.hours / c.days.length) * c.days.filter((iso) => { const d = toDay(iso); return d >= s && d < e; }).length, 0);
    return { ...p, h };
  });

  return (
    <>
      <Tour id="contrats" steps={CONTRACT_TOUR} />
      <section className="card" data-tour="import" style={{ gap: 12, boxShadow: 'inset 4px 0 0 var(--int)' }}>
        <h2 style={{ color: 'var(--int-ink)' }}>Ajouter mes contrats en déposant mes AEM</h2>
        {/* Déjà fait une fois (accueil ou import précédent) : le guide se replie */}
        {data.contracts.some((c) => c.source?.kind === 'aem') ? <details className="toggle-manual"><summary>Où trouver mes AEM ?</summary><AemGuide /></details> : <AemGuide />}
        <DocImport kind="aem" />
      </section>
      <div className="row">
        <section className="card grow" data-tour="cal">
          <div className="pills">
            {pills.map((p) => (
              <button key={`${p.y}-${p.m}`} className="pill" aria-pressed={p.y === view.y && p.m === view.m} onClick={() => setView({ y: p.y, m: p.m })}>
                <span>{MONTHS_SHORT[p.m]} {String(p.y).slice(2)}</span><i style={{ width: `${Math.min(100, (p.h / 90) * 100)}%` }} />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button className="btn icon" aria-label="Mois précédent" onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}><Left /></button>
            <strong style={{ fontSize: 22, minWidth: 210, textAlign: 'center' }}>{fmtMonth(view.y, view.m)}</strong>
            <button className="btn icon" aria-label="Mois suivant" onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}><Right /></button>
          </div>
          {editing && (
            <div className="alert gen">
              <span><strong>Vous modifiez les jours de « {editing.title} »</strong><br /><span className="small">Cliquez un jour pour l'ajouter ou le retirer. Heures et salaire s'ajustent au prorata ({round1(editing.hours / editing.days.length)} h et {eur(editing.gross / editing.days.length)} par jour).</span></span>
              <button className="btn dark" onClick={() => setDaysEditId(null)}>Terminer</button>
            </div>
          )}
          {msg && <div className="alert warn" role="status"><span className="small">{msg}</span></div>}
          <div className="mcal tiny muted" style={{ fontWeight: 700, textAlign: 'center' }}>{['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((d) => <span key={d}>{d}</span>)}</div>
          <div className="mcal">
            {Array.from({ length: 42 }, (_, k) => {
              const dn = k - lead + 1;
              if (dn < 1 || dn > n) return <span key={k} />;
              const iso = fromDay(first + dn - 1);
              const c = byDay.get(iso);
              const old = c && expired(c);
              let bg = 'var(--card)';
              let col = 'var(--ink)';
              if (c) {
                const r = c.gross / c.days.length;
                if (old) { bg = 'var(--expired)'; col = '#16202c'; }
                else if (c.simulated) { bg = 'var(--sim)'; col = '#fff'; }
                else { bg = rateColor(r); col = r >= 210 ? '#fff' : '#16202c'; }
                if (c.teaching && !old) bg = 'repeating-linear-gradient(90deg,#c9b8ff 0 4px,#fff 4px 8px)';
              }
              const isSel = sel.includes(iso) || focus === iso;
              const inEdit = editing?.days.includes(iso);
              const cls = ['mcell', isSel ? 'sel' : '', inEdit ? 'edit' : '', first + dn - 1 === today ? 'today' : ''].join(' ');
              return (
                <button key={k} className={cls} style={{ background: isSel && !c ? 'var(--chom-bg)' : bg, color: col }} onClick={(e) => pick(iso, e.shiftKey)} aria-pressed={isSel}
                  aria-label={`${fmtDay(first + dn - 1)}${c ? `, ${c.title}${old ? ', expiré' : ''}` : ''}`}>
                  <strong>{dn}</strong>
                  <span className="tag" style={old ? { textDecoration: 'line-through' } : undefined}>{c ? c.title : first + dn - 1 === today ? 'aujourd’hui' : ''}</span>
                </button>
              );
            })}
          </div>
          <div className="legend">
            <span><i className="sw" style={{ background: 'var(--int)' }} />réel (plus foncé = mieux payé)</span>
            <span><i className="sw hatch-sim" />simulé</span>
            <span><i className="sw" style={{ background: 'repeating-linear-gradient(90deg,#c9b8ff 0 3px,#fff 3px 6px)' }} />enseignement</span>
            <span><i className="sw" style={{ background: 'var(--expired)' }} />expiré (plus d'un an)</span>
          </div>
          <div className="alert info small" style={{ justifyContent: 'flex-start' }}>
            <Info /><span>Cliquez un jour pour le cocher, puis maintenez <kbd>Maj ⇧</kbd> et cliquez un autre jour pour sélectionner toute la plage. Cliquez un jour déjà rempli pour voir son contrat.</span>
          </div>
        </section>

        <aside className="side">
          {focusC && !editing && (
            <section className="card" style={{ boxShadow: '0 0 0 3px var(--int)' }}>
              <div className="kv" style={{ alignItems: 'center' }}><span className="tiny" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--int-ink)' }}>Contrat du {fmtDay(toDay(focus!))}</span><button className="btn icon sm" aria-label="Fermer" onClick={() => setFocus(null)}><Close /></button></div>
              <strong style={{ fontSize: 18 }}>{focusC.title}</strong>
              <div className="grid2 small">
                <Stat k="Dates" v={rangeLabel(focusC)} />
                <Stat k="Statut" v={expired(focusC) ? 'Expiré' : focusC.simulated ? 'Simulé' : 'Réel'} />
                <Stat k="Heures" v={`${focusC.hours} h`} />
                <Stat k="Salaire brut" v={eur(focusC.gross)} />
              </div>
              <button className="btn" onClick={() => {
                const c = focusC; const nn = c.days.length;
                if (nn === 1) setContracts((l) => l.filter((x) => x.id !== c.id));
                else patch(c.id, { days: c.days.filter((d) => d !== focus), hours: round1((c.hours * (nn - 1)) / nn), gross: Math.round((c.gross * (nn - 1)) / nn) });
                setFocus(null);
              }}>Retirer cette journée uniquement</button>
              <button className="btn danger" onClick={() => { setContracts((l) => l.filter((x) => x.id !== focusC.id)); setFocus(null); }}>Retirer ce contrat en entier</button>
              <button className="btn dark" onClick={() => { setEditId(focusC.id); setDaysEditId(focusC.id); setFocus(null); }}>Modifier ce contrat</button>
            </section>
          )}
          <details className="card toggle-manual" open={manualOpen} onToggle={(e) => setManualOpen((e.target as HTMLDetailsElement).open)} style={{ padding: '4px 16px' }}>
          <summary>Ajouter un contrat à la main</summary>
          <section className="card dark" data-tour="form" style={{ marginBottom: 12 }}>
            <div className="kv" style={{ alignItems: 'baseline' }}><h2 style={{ fontSize: 18 }}>Nouveau contrat</h2><button className="btn ghost sm" style={{ color: '#a9c3f7' }} onClick={() => { setSel([]); setAnchor(null); setRange({ from: '', to: '' }); }}>Effacer la sélection</button></div>
            <div style={{ background: 'var(--dark-2)', borderRadius: 12, padding: '10px 12px' }}>
              <strong>{nSel ? `${nSel} jour${nSel > 1 ? 's' : ''} sélectionné${nSel > 1 ? 's' : ''}` : 'Cliquez les jours travaillés'}</strong>
              <span className="tiny" style={{ display: 'block', color: 'var(--on-dark-2)' }}>{nSel ? (nSel === 1 ? fmtDay(toDay(sel[0])) : `du ${fmtDayShort(toDay([...sel].sort()[0]))} au ${fmtDayShort(toDay([...sel].sort()[nSel - 1]))}`) : 'Maj ⇧ + clic pour une plage'}</span>
            </div>
            <div className="grid2">
              <label className="field">Du<input type="date" value={range.from} onChange={(e) => applyRange(e.target.value, range.to || e.target.value)} /></label>
              <label className="field">Au<input type="date" value={range.to} min={range.from || undefined} onChange={(e) => applyRange(range.from || e.target.value, e.target.value)} /></label>
            </div>
            <span className="tiny" style={{ color: 'var(--on-dark-2)', marginTop: -4 }}>ou tapez les dates : la plage se coche toute seule dans le calendrier.</span>
            <span className="tiny" style={{ background: 'var(--warn-bg)', color: 'var(--warn-ink)', borderRadius: 8, padding: '6px 8px' }}>
              Ne cochez que les jours <strong>réellement travaillés</strong> (nombre indiqué sur l’attestation employeur){weekendSel ? ` : ${weekendSel} samedi${weekendSel > 1 ? 's' : ''} ou dimanche${weekendSel > 1 ? 's' : ''} sélectionné${weekendSel > 1 ? 's' : ''}` : ''}. Chaque jour en trop augmente la franchise congés payés et rend le verdict plus sévère.
            </span>
            <label className="field">Employeur ou projet<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="ex. Cie Hors-Champ · régie" /></label>
            <div className="grid2">
              <label className="field">Heures
                <select value={f.hoursMode} onChange={(e) => setF({ ...f, hoursMode: e.target.value as HoursMode })}>
                  <option value="total">au total</option><option value="perDay">par jour</option><option value="cachets">en cachets (× 12 h)</option>
                </select>
              </label>
              <label className="field">{f.hoursMode === 'cachets' ? 'Nombre de cachets' : f.hoursMode === 'perDay' ? 'Heures par jour' : 'Heures au total'}<input inputMode="decimal" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></label>
              <label className="field">Salaire brut
                <select value={f.grossMode} onChange={(e) => setF({ ...f, grossMode: e.target.value as GrossMode })}>
                  <option value="total">total du contrat</option><option value="perDay">par jour</option>
                </select>
              </label>
              <label className="field">{f.grossMode === 'perDay' ? '€ brut / jour' : '€ brut au total'}<input inputMode="decimal" value={f.gross} onChange={(e) => setF({ ...f, gross: e.target.value })} /></label>
            </div>
            <span className="tiny" style={{ color: 'var(--on-dark-2)' }}>{nSel ? `= ${round1(hoursTotal)} h · ${eur(grossTotal)} brut${nSel ? ` · ${eur(grossTotal / nSel)}/jour` : ''}` : 'Sélectionnez d’abord des jours.'}</span>
            <label className="field">Annexe<select value={f.annexe} onChange={(e) => setF({ ...f, annexe: e.target.value as Annexe })}><option value="8">8 · technicien·ne</option><option value="10">10 · artiste</option></select></label>
            <label className="check"><input type="checkbox" checked={f.simulated} onChange={(e) => setF({ ...f, simulated: e.target.checked })} />C'est une simulation (pas encore signé)</label>
            <label className="check"><input type="checkbox" checked={f.teaching} onChange={(e) => setF({ ...f, teaching: e.target.checked })} />Heures d'enseignement (établissement agréé)</label>
            <button className="btn primary" style={{ minHeight: 48 }} disabled={!canAdd} onClick={add}>Ajouter le contrat</button>
          </section>
          </details>
        </aside>
      </div>

      <section className="tablewrap" data-tour="list">
        <div className="topbar" style={{ padding: '16px 18px 4px' }}><h2>Tous les contrats</h2><span className="tiny muted">triés par date · cliquez une ligne pour la modifier</span></div>
        <table className="ctable">
          <thead><tr><th>Statut</th><th>Contrat</th><th>Dates</th><th className="num">Jours</th><th className="num">Heures</th><th className="num">Brut</th><th className="num">€ / jour</th><th className="num">€ / h</th><th>Annexe</th><th>Compte jusqu'au</th></tr></thead>
          <tbody>
            {contracts.map((c) => {
              const old = expired(c);
              const isOpen = editId === c.id;
              const exp = contractEnd(c) + data.settings.rules.windowDays;
              return (
                <FragmentRow key={c.id}>
                  <tr id={`row-${c.id}`} className={['click', old ? 'old' : '', isOpen ? 'open' : ''].join(' ')} onClick={() => { setEditId(isOpen ? null : c.id); setDaysEditId(null); }}>
                    <td><span className={`badge ${old ? 'old' : c.simulated ? 'sim' : 'real'}`}>{old ? 'Expiré' : c.simulated ? 'Simulé' : 'Réel'}</span></td>
                    <td><button className="title" style={{ border: 0, background: 'transparent', padding: 0, fontWeight: 700, textAlign: 'left' }} aria-expanded={isOpen}>{c.title}</button>{c.teaching ? <span className="badge gen" style={{ marginLeft: 6 }}>cours</span> : null}</td>
                    <td className="small">{rangeLabel(c)}</td>
                    <td className="num">{c.days.length}</td>
                    <td className="num"><strong>{c.hours} h</strong></td>
                    <td className="num">{eur(c.gross)}</td>
                    <td className="num muted">{eur(c.gross / c.days.length)}</td>
                    <td className="num muted">{c.hours ? eur2(c.gross / c.hours) : '—'}</td>
                    <td>{c.annexe}</td>
                    <td className="small" style={{ color: old ? 'var(--muted)' : exp < today + 120 ? 'var(--warn-ink)' : undefined }}>{old ? `expiré le ${fmtDayShort(exp)}` : fmtDayShort(exp)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="open"><td colSpan={10}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end', padding: '4px 0 8px' }}>
                        <label className="field" style={{ gridColumn: 'span 2' }}>Employeur ou projet<input value={c.title} onChange={(e) => patch(c.id, { title: e.target.value })} /></label>
                        <label className="field">Heures au total<input inputMode="decimal" value={c.hours} onChange={(e) => patch(c.id, { hours: num(e.target.value) })} /></label>
                        <label className="field">Brut au total (€)<input inputMode="decimal" value={c.gross} onChange={(e) => patch(c.id, { gross: num(e.target.value) })} /></label>
                        <label className="field">Annexe<select value={c.annexe} onChange={(e) => patch(c.id, { annexe: e.target.value as Annexe })}><option value="8">8</option><option value="10">10</option></select></label>
                        <label className="check"><input type="checkbox" checked={c.simulated} onChange={(e) => patch(c.id, { simulated: e.target.checked })} />Simulation</label>
                        <label className="check"><input type="checkbox" checked={!!c.teaching} onChange={(e) => patch(c.id, { teaching: e.target.checked })} />Enseignement</label>
                      </div>
                      <div className="nav">
                        <button className="btn sm" style={daysEditId === c.id ? { background: '#6a4fd8', color: '#fff', borderColor: '#6a4fd8' } : undefined} onClick={() => { const s = parts(toDay(c.days[0])); setView({ y: s.y, m: s.m }); setDaysEditId(daysEditId === c.id ? null : c.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Calendar />{daysEditId === c.id ? 'Terminer la modification des jours' : 'Modifier les jours sur le calendrier'}</button>
                        <button className="btn sm" onClick={() => duplicate(c, 'week')}>Dupliquer +1 semaine</button>
                        <button className="btn sm" onClick={() => duplicate(c, 'month')}>Dupliquer +1 mois</button>
                        <button className="btn sm danger" onClick={() => { setContracts((l) => l.filter((x) => x.id !== c.id)); setEditId(null); setDaysEditId(null); }}><Trash />Supprimer</button>
                      </div>
                    </td></tr>
                  )}
                </FragmentRow>
              );
            })}
            {!contracts.length && <tr><td colSpan={10} className="muted" style={{ padding: 20 }}>Aucun contrat pour l'instant : sélectionnez des jours dans le calendrier.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const rangeLabel = (c: Contract) => {
  const a = toDay(c.days[0]);
  const b = toDay(c.days[c.days.length - 1]);
  const contiguous = b - a + 1 === c.days.length;
  return c.days.length === 1 ? fmtDayShort(a) : `${fmtDayShort(a)} → ${fmtDayShort(b)}${contiguous ? '' : ' (jours choisis)'}`;
};
const Stat = ({ k, v }: { k: string; v: string }) => (
  <div style={{ background: 'var(--card-2)', borderRadius: 10, padding: '8px 10px' }}><span className="muted">{k}</span><strong style={{ display: 'block' }}>{v}</strong></div>
);

/* ------------------------------------------------------------------ */
/* Onglet Régime général                                               */
/* ------------------------------------------------------------------ */

function RegimeGeneral() {
  const { data, today, update } = useStore();
  const releves = [...data.profile.releves].sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = releves[0];
  // Le bloc « Informations sur vos droits » est arrêté au dernier jour du mois précédent
  const endPrevMonth = fromDay(monthStart(parts(today).y, parts(today).m) - 1);
  const [r, setR] = useState({ date: endPrevMonth, daysLeft: last ? String(last.daysLeft) : '', aj: last ? String(last.dailyAllowance).replace('.', ',') : '', sjr: last?.sjr ? String(last.sjr).replace('.', ',') : '' });
  const [saved, setSaved] = useState(false);
  const cap = num(r.daysLeft) * num(r.aj);
  const setProfile = (p: Partial<typeof data.profile>) => update((d) => ({ ...d, profile: { ...d.profile, ...p } }));
  const [pr, setPr] = useState({ date: '', fct: '' });
  const [up, setUp] = useState({ from: '', to: '', reason: '' });
  const autoCeiling = last?.sjr ? Math.round(last.sjr * 30.42 * 100) / 100 : null;
  const unpaidList = [...(data.profile.unpaidPeriods ?? [])].sort((a, b) => (a.from < b.from ? -1 : 1));
  const unpaidFromReleve = unpaidList.filter((u) => u.fromReleve).length;

  const save = () => {
    if (!(num(r.daysLeft) >= 0) || !num(r.aj)) return;
    const rel = { id: uid(), date: r.date, daysLeft: num(r.daysLeft), dailyAllowance: num(r.aj), sjr: num(r.sjr) || null };
    setProfile({ releves: [rel, ...data.profile.releves.filter((x) => x.date !== r.date)] });
    setSaved(true);
  };

  return (
    <>
    <section className="card" style={{ gap: 12, boxShadow: 'inset 4px 0 0 var(--chom)' }}>
      <h2 style={{ color: 'var(--chom-ink)' }}>Mon chômage restant : déposez votre relevé de situation</h2>
      {data.profile.releves.length ? <details className="toggle-manual"><summary>Où trouver mon relevé de situation ?</summary><ReleveGuide /></details> : <ReleveGuide />}
      <DocImport kind="releve" />
    </section>
    <div className="row">
      <section className="card grow" style={{ boxShadow: 'inset 4px 0 0 var(--chom)' }}>
        <details className="toggle-manual">
        <summary>Saisir le relevé à la main</summary>
        <p className="small muted" style={{ margin: 0 }}>Recopiez le bloc « Informations sur vos droits au … » de votre dernier relevé de situation. Les calculs repartent du relevé le plus récent.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <label className="field">Jours restants<input inputMode="numeric" value={r.daysLeft} onChange={(e) => { setR({ ...r, daysLeft: e.target.value }); setSaved(false); }} /></label>
          <label className="field">au <span className="tiny muted" style={{ fontWeight: 400 }}>la date de « Informations sur vos droits au … », pas celle du courrier</span><input type="date" value={r.date} onChange={(e) => { setR({ ...r, date: e.target.value }); setSaved(false); }} /></label>
          <label className="field">Allocation brute / jour (€)<input inputMode="decimal" value={r.aj} onChange={(e) => { setR({ ...r, aj: e.target.value }); setSaved(false); }} /></label>
          <label className="field">Salaire journalier de référence (€) <span className="tiny muted" style={{ fontWeight: 400 }}>même phrase du relevé ; affine le calcul</span><input inputMode="decimal" value={r.sjr} onChange={(e) => { setR({ ...r, sjr: e.target.value }); setSaved(false); }} /></label>
        </div>
        <div className="alert blue">
          <span><span className="tiny">Capital chômage restant</span><strong style={{ display: 'block', fontSize: 24 }}>{eur(cap)}</strong><span className="tiny">{num(r.daysLeft)} jours × {eur2(num(r.aj))} au {r.date ? fmtDay(toDay(r.date)) : '—'}</span></span>
          <button className="btn blue" onClick={save}>{saved ? 'Relevé enregistré ✓' : 'Enregistrer ce relevé'}</button>
        </div>
        </details>
        <h3 style={{ fontSize: 15 }}>Mes relevés enregistrés</h3>
        <table className="ctable" style={{ minWidth: 0 }}>
          <thead><tr><th>Au</th><th className="num">Jours restants</th><th className="num">Allocation / jour</th><th className="num">SJR</th><th className="num">Capital</th><th /></tr></thead>
          <tbody>
            {releves.map((x) => (
              <tr key={x.id}><td>{fmtDay(toDay(x.date))}</td><td className="num">{x.daysLeft}</td><td className="num">{eur2(x.dailyAllowance)}</td><td className="num">{x.sjr ? eur2(x.sjr) : '—'}</td><td className="num"><strong>{eur(x.daysLeft * x.dailyAllowance)}</strong></td>
                <td style={{ textAlign: 'right' }}><button className="btn sm danger" aria-label={`Supprimer le relevé du ${x.date}`} onClick={() => setProfile({ releves: data.profile.releves.filter((y) => y.id !== x.id) })}><Trash /></button></td></tr>
            ))}
            {!releves.length && <tr><td colSpan={6} className="muted">Aucun relevé pour l'instant.</td></tr>}
          </tbody>
        </table>
        <details className="toggle-manual">
        <summary>
          Mon profil
          <span className="tiny muted" style={{ fontWeight: 400, display: 'block' }}>
            annexe {data.profile.annexe}{data.contracts.some((c) => c.source?.kind === 'aem') ? ' (déduite de vos AEM)' : ''} · plafond du cumul {data.profile.monthlyRefSalary ? eur(data.profile.monthlyRefSalary) : autoCeiling ? `${eur(autoCeiling)} (déduit du relevé)` : 'non renseigné'} · délai d'attente {data.profile.waitingApplied === true ? 'déjà appliqué' : data.profile.waitingApplied === false ? 'à appliquer' : 'inconnu (compté par prudence)'}
          </span>
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, paddingBottom: 12 }}>
          <label className="field">Plafond du cumul salaire + chômage (€/mois) <span className="tiny muted" style={{ fontWeight: 400 }}>{autoCeiling ? `vide : ${eur(autoCeiling)}, déduit du relevé (SJR × 30,42)` : 'salaire journalier de référence × 30,42'}</span>
            <input inputMode="decimal" placeholder={autoCeiling ? String(Math.round(autoCeiling)) : ''} value={data.profile.monthlyRefSalary ?? ''} onChange={(e) => setProfile({ monthlyRefSalary: e.target.value ? num(e.target.value) : null })} />
          </label>
          <label className="field">Annexe visée<select value={data.profile.annexe} onChange={(e) => setProfile({ annexe: e.target.value as Annexe })}><option value="8">8 · technicien·ne</option><option value="10">10 · artiste</option></select></label>
          <label className="check"><input type="checkbox" checked={data.profile.over50} onChange={(e) => setProfile({ over50: e.target.checked })} />J'ai 50 ans ou plus</label>
          <label className="field">Délai d'attente de 7 jours déjà appliqué dans les 12 derniers mois ? <span className="tiny muted" style={{ fontWeight: 400 }}>il figure sur la notification d'ouverture ou de reprise de vos droits</span>
            <select value={data.profile.waitingApplied == null ? '' : data.profile.waitingApplied ? 'yes' : 'no'} onChange={(e) => setProfile({ waitingApplied: e.target.value === '' ? null : e.target.value === 'yes' })}>
              <option value="">Je ne sais pas (on le compte : prudent)</option><option value="yes">Oui</option><option value="no">Non</option>
            </select>
          </label>
        </div>
        </details>
        <details className="toggle-manual">
        <summary>
          Périodes sans indemnisation
          <span className="tiny muted" style={{ fontWeight: 400, display: 'block' }}>
            {unpaidList.length ? `${unpaidList.length} période${unpaidList.length > 1 ? 's' : ''}${unpaidFromReleve ? `, dont ${unpaidFromReleve} déduite${unpaidFromReleve > 1 ? 's' : ''} de vos relevés` : ''}` : 'aucune'} · carence, différés et période avant inscription sont déduits des relevés importés
          </span>
        </summary>
        <p className="tiny muted" style={{ margin: 0 }}>À ajouter à la main seulement ce que les relevés ne montrent pas : mois sans relevé où rien n'a été versé (désinscription, mois non actualisé, paiement suspendu, attente de reprise). Sans elles, l'outil croit votre reliquat consommé.</p>
        <div className="nav" style={{ alignItems: 'flex-end' }}>
          <label className="field">du<input type="date" value={up.from} onChange={(e) => setUp({ ...up, from: e.target.value })} /></label>
          <label className="field">au<input type="date" value={up.to} onChange={(e) => setUp({ ...up, to: e.target.value })} /></label>
          <label className="field">motif<input value={up.reason} placeholder="ex. non inscrit" onChange={(e) => setUp({ ...up, reason: e.target.value })} /></label>
          <button className="btn sm" disabled={!up.from || !up.to || up.to < up.from} onClick={() => { setProfile({ unpaidPeriods: [...(data.profile.unpaidPeriods ?? []), { id: uid(), from: up.from, to: up.to, reason: up.reason || undefined }] }); setUp({ from: '', to: '', reason: '' }); }}>Ajouter</button>
        </div>
        {unpaidList.map((u) => (
          <div className="kv small" key={u.id}><span>{fmtDay(toDay(u.from))} → {fmtDay(toDay(u.to))}{u.reason ? ` · ${u.reason}` : ''}{u.fromReleve ? <span className="tiny muted"> · déduite du relevé</span> : null}</span>
            <button className="btn sm danger" aria-label="Supprimer la période" onClick={() => setProfile({ unpaidPeriods: unpaidList.filter((x) => x.id !== u.id) })}><Trash /></button></div>
        ))}
        <div style={{ height: 8 }} />
        </details>
        <h3 style={{ fontSize: 15 }}>Demandes de droit d'option déjà envoyées</h3>
        <p className="tiny muted" style={{ margin: 0 }}>Une fin de contrat déjà examinée (demande refusée ou en cours) ne peut pas resservir : il faudra une nouvelle fin de contrat.</p>
        <div className="nav" style={{ alignItems: 'flex-end' }}>
          <label className="field">Date de la demande<input type="date" value={pr.date} onChange={(e) => setPr({ ...pr, date: e.target.value })} /></label>
          <label className="field">Fin de contrat examinée <span className="tiny muted" style={{ fontWeight: 400 }}>vide : la dernière avant la demande</span><input type="date" value={pr.fct} onChange={(e) => setPr({ ...pr, fct: e.target.value })} /></label>
          <button className="btn sm" disabled={!pr.date} onClick={() => { setProfile({ priorRequests: [...(data.profile.priorRequests ?? []), { id: uid(), date: pr.date, fct: pr.fct || null }] }); setPr({ date: '', fct: '' }); }}>Ajouter</button>
        </div>
        {(data.profile.priorRequests ?? []).map((x) => (
          <div className="kv small" key={x.id}><span>Demande du {fmtDay(toDay(x.date))}{x.fct ? ` · fin de contrat du ${fmtDay(toDay(x.fct))}` : ''}</span>
            <button className="btn sm danger" aria-label="Supprimer la demande" onClick={() => setProfile({ priorRequests: (data.profile.priorRequests ?? []).filter((y) => y.id !== x.id) })}><Trash /></button></div>
        ))}
      </section>
      <aside className="side">
        <section className="card" style={{ background: 'var(--card-2)' }}>
          <h2 style={{ fontSize: 17 }}>Où trouver ces chiffres ?</h2>
          <ol className="small" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong>Jours restants, allocation brute, salaire journalier de référence</strong> : dernier relevé de situation, bloc « Informations sur vos droits au … » (« Durée d'indemnisation restante », « Allocation brute d'un montant journalier de … tenant compte d'un Salaire Journalier de Référence de … »). Prenez la date « au », pas celle du courrier.</li>
            <li><strong>Pas de relevé récent ?</strong> France Travail n'en envoie pas les mois où rien n'est versé : gardez le dernier et déclarez les mois sans paiement dans « Périodes sans indemnisation ».</li>
            <li><strong>Allocation journalière brute</strong> : relevé de situation, rubrique « Informations sur vos droits » › « Allocation brute d'un montant journalier de … ». Pas le montant versé par jour : il est déjà diminué de la retraite complémentaire (3 % du salaire journalier de référence).</li>
            <li><strong>Relevé de situation / attestations</strong> : « Mes échanges et documents ».</li>
            <li><strong>Salaire de référence</strong> : sur la notification d'ouverture de droits. Sinon, laissez vide.</li>
          </ol>
          <a className="btn" href={FT_COURRIERS_URL} target="_blank" rel="noopener noreferrer">Ouvrir mes courriers France Travail ↗</a>
          <span className="tiny muted">Vos données restent dans ce navigateur : rien n'est envoyé à un serveur.</span>
        </section>
      </aside>
    </div>
    </>
  );
}


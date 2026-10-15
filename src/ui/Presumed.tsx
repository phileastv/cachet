import { useState } from 'react';
import { fmtDay } from '../domain/dates';
import type { RequestInfo } from '../domain/engine';
import type { AJBreakdown } from '../domain/rules';
import { eur, eur2, globalDaysText, pct } from './format';

const n0 = (v: number) => Math.round(v).toLocaleString('fr-FR');
const n2 = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const c2 = (v: number) => String(v).replace('.', ',');

/** Le calcul complet A + B + C, ligne par ligne. */
export function CalcDetail({ d }: { d: AJBreakdown }) {
  return (
    <div className="calc">
      <div className="calc-row"><span>Salaire de référence (12 mois)</span><strong>{eur(d.sr)}</strong></div>
      <div className="calc-row sub"><span>jusqu'à {n0(d.srCap)} € : compte plein</span><span>{eur(d.srIn)}</span></div>
      <div className="calc-row sub"><span>au-delà de {n0(d.srCap)} € : compte peu</span><span>{d.srOver ? eur(d.srOver) : '—'}</span></div>
      <div className="calc-row"><span>Heures travaillées (hors cours et formation)</span><strong>{n0(d.nht)} h</strong></div>
      <div className="calc-row sub"><span>jusqu'à {d.hCap} h : compte plein</span><span>{n0(d.hIn)} h</span></div>
      <div className="calc-row sub"><span>au-delà de {d.hCap} h : compte peu</span><span>{d.hOver ? `${n0(d.hOver)} h` : '—'}</span></div>
      <hr />
      <div className="calc-row"><span><b>A</b> (salaire) = {c2(d.ajMin)} × ({c2(d.coefA)} × {n0(d.srIn)}{d.srOver ? ` + 0,05 × ${n0(d.srOver)}` : ''}) ÷ 5 000</span><strong>{n2(d.a)} €</strong></div>
      <div className="calc-row"><span><b>B</b> (heures) = {c2(d.ajMin)} × (0,26 × {n0(d.hIn)}{d.hOver ? ` + 0,08 × ${n0(d.hOver)}` : ''}) ÷ 507</span><strong>{n2(d.b)} €</strong></div>
      <div className="calc-row"><span><b>C</b> (fixe) = {c2(d.ajMin)} × {c2(d.coefC)}</span><strong>{n2(d.c)} €</strong></div>
      <hr />
      <div className="calc-row"><span>A + B + C</span><strong>{n2(d.raw)} €</strong></div>
      {d.raw < d.floor && <div className="calc-row sub"><span>relevé au plancher de l'annexe {d.annexe}</span><span>{n2(d.floor)} €</span></div>}
      {d.raw > d.max && <div className="calc-row sub"><span>ramené au plafond</span><span>{n2(d.max)} €</span></div>}
      <div className="calc-row total"><span>Allocation journalière brute (tronquée au centime)</span><strong>{n2(d.aj)} €</strong></div>
      <p className="tiny muted" style={{ margin: '4px 0 0' }}>
        Au-delà de {d.hCap} h et de {n0(d.srCap)} € (annexe {d.annexe}), chaque heure ou euro en plus ne compte presque plus (0,08 au lieu de 0,26 pour les heures, 0,05 au lieu de {c2(d.coefA)} pour le salaire) : c'est comme si le calcul était « plafonné ». Source : Unédic, annexe {d.annexe}.
      </p>
    </div>
  );
}

/** Panneau « Intermittence présumée » : ce que donnerait une demande au jour choisi. */
export function PresumedPanel({ info, isRequest, manual, canChoose, onChoose, onReset, editHref, editTitle }: {
  info: RequestInfo; isRequest: boolean; manual: boolean; canChoose: boolean;
  onChoose: () => void; onReset: () => void; editHref: string | null; editTitle: string | null;
}) {
  const [open, setOpen] = useState(false);
  const p = info.presumed;
  return (
    <section className="card" data-tour="presumed">
      <div className="kv" style={{ alignItems: 'baseline' }}>
        <strong style={{ fontSize: 16 }}>Intermittence présumée</strong>
        <span className={`badge ${isRequest ? 'ok' : 'no'}`}>{isRequest ? (manual ? 'jour choisi' : 'jour de la demande') : 'si demande ce jour'}</span>
      </div>
      <span className="tiny muted">Demande le {fmtDay(info.day)}</span>
      {editHref && editTitle && (
        <a className="small" href={editHref} style={{ fontWeight: 700, color: 'var(--int-ink)' }}>Contrat ce jour-là : « {editTitle} » · Modifier →</a>
      )}
      {info.onContract && <span className="small" style={{ background: 'var(--warn-bg)', color: 'var(--warn-ink)', borderRadius: 10, padding: '6px 10px' }}>Ce jour-là, vous êtes sous contrat : la demande doit se faire un jour sans contrat.</span>}
      {p ? (
        <>
          <div><strong style={{ fontSize: 36, lineHeight: 1 }}>{eur(p.monthly)}</strong><span className="small muted"> / mois</span></div>
          <span className="small">soit <strong>{eur2(p.aj)}</strong> brut par jour · montant comparé : {eur(p.global)} · écart {pct(info.ecart)}</span>
          <span className="tiny muted">{globalDaysText(p)}, comme le calcule France Travail pour le droit d'option.</span>
        </>
      ) : (
        <span className="small"><strong>Pas encore 507 h</strong> sur la période de référence ({Math.round(info.hours)} h).</span>
      )}
      <div className="calc">
        <div className="calc-row"><span>Dernière fin de contrat</span><strong>{info.lastEnd !== null ? fmtDay(info.lastEnd) : '—'}</strong></div>
        <div className="calc-row sub"><span>période de référence</span><span>{info.from !== null && info.to !== null ? `${fmtDay(info.from)} → ${fmtDay(info.to)}` : '—'}</span></div>
        <div className="calc-row"><span>Heures retenues (507 h)</span><strong>{Math.round(info.hours)} h</strong></div>
        {p && <div className="calc-row sub"><span>jours travaillés (franchise congés payés)</span><span>{p.workedDays} j</span></div>}
        <div className="calc-row"><span>Salaire de référence retenu</span><strong>{eur(info.sr)}</strong></div>
      </div>
      {p && (
        <>
          <button className="btn sm" aria-expanded={open} onClick={() => setOpen(!open)} style={{ alignSelf: 'flex-start' }}>{open ? 'Masquer le calcul' : 'Voir le calcul complet'}</button>
          {open && <CalcDetail d={p.detail} />}
        </>
      )}
      <div className="nav">
        {canChoose && !isRequest && <button className="btn sm" onClick={onChoose}>★ En faire mon jour de demande</button>}
        {manual && <button className="btn sm ghost" onClick={onReset}>Revenir au jour calculé</button>}
      </div>
    </section>
  );
}

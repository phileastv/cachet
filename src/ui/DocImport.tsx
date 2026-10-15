import { useState } from 'react';
import { aemContracts, openContracts, parseAem, pendingContract, type ParsedAem } from '../domain/aem';
import { fmtDay, toDay } from '../domain/dates';
import { latestInfo, parseReleve, suggestedUnpaid, waitingSeen, type RightsInfo } from '../domain/releve';
import type { Contract } from '../domain/types';
import { uid, useStore } from '../state/store';
import { eur, eur2 } from './format';
import { pdfRows } from './pdfText';

interface Found {
  info: RightsInfo | null;
  notes: string[];
  unpaid: { from: string; to: string; reason: string }[];
  waiting: string | null;
  aems: ParsedAem[];
  /** AEM déjà importées auparavant (même numéro d'attestation). */
  known: number;
  /** Doublons repérés : même fichier déposé deux fois, même AEM, relevé déjà enregistré. */
  dupes: string[];
  unknownFiles: string[];
}

/** Empreinte d'un fichier (repère un même PDF déposé deux fois, quel que soit son nom). */
async function fingerprint(f: File): Promise<string> {
  try {
    const h = await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${f.name}:${f.size}`;
  }
}

const fd = (iso: string) => fmtDay(toDay(iso));

/**
 * Glisser-déposer les documents France Travail et employeurs (relevés de situation, AEM) :
 * lecture dans le navigateur, résumé à vérifier, puis ajout au dossier.
 */
export function DocImport({ kind = 'aem', compact = false }: { kind?: 'releve' | 'aem'; compact?: boolean }) {
  const { data, update } = useStore();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [keepUnpaid, setKeepUnpaid] = useState<boolean[]>([]);
  const [waitingOk, setWaitingOk] = useState(true);
  const [replace, setReplace] = useState(true);
  const [ends, setEnds] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);

  const read = async (files: File[]) => {
    setFound(null);
    setDone(null);
    setBusy(true);
    const infos: RightsInfo[] = [];
    const notes: string[] = [];
    const unpaid: Found['unpaid'] = [];
    const aems: ParsedAem[] = [];
    const unknownFiles: string[] = [];
    const dupes: string[] = [];
    const seen = new Set<string>();
    let waiting: string | null = null;
    for (const f of files) {
      const fp = await fingerprint(f);
      if (seen.has(fp)) {
        dupes.push(`${f.name} déposé deux fois`);
        continue;
      }
      seen.add(fp);
      if (!(f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) {
        unknownFiles.push(`${f.name} (pas un PDF)`);
        continue;
      }
      try {
        const rows = await pdfRows(f);
        const rel = parseReleve(rows);
        if (rel.isReleve) {
          infos.push(...rel.infos);
          for (const n of rel.notes) if (!notes.includes(n)) notes.push(n);
          for (const u of suggestedUnpaid(rel)) if (!unpaid.some((x) => x.from === u.from && x.to === u.to)) unpaid.push(u);
          waiting = waitingSeen(rel) ?? waiting;
          continue;
        }
        const aem = parseAem(rows);
        if (aem) aems.push(aem);
        else unknownFiles.push(`${f.name} (document non reconnu ou scanné)`);
      } catch {
        unknownFiles.push(`${f.name} (illisible)`);
      }
    }
    const knownRefs = new Set(data.contracts.map((c) => c.source?.ref).filter(Boolean));
    const unique = [...new Map(aems.map((a) => [a.ref, a])).values()];
    if (unique.length < aems.length) dupes.push(`${aems.length - unique.length} AEM en double dans les fichiers déposés`);
    const fresh = unique.filter((a) => !knownRefs.has(a.ref));
    const info = latestInfo({ isReleve: true, infos, months: [], notes: [] });
    const same = info && data.profile.releves.find((r) => r.date === info.date);
    if (same && info) {
      dupes.push(same.daysLeft === info.daysLeft && same.dailyAllowance === info.dailyAllowance
        ? `relevé au ${fd(info.date)} déjà enregistré (identique)`
        : `relevé au ${fd(info.date)} déjà enregistré avec d'autres chiffres : il sera remplacé`);
    }
    setFound({ info, notes, unpaid, waiting, aems: fresh.sort((a, b) => (a.month + a.start < b.month + b.start ? -1 : 1)), known: unique.length - fresh.length, dupes, unknownFiles });
    setKeepUnpaid(unpaid.map(() => true));
    setEnds({});
    setBusy(false);
  };

  const apply = () => {
    if (!found) return;
    const created: Contract[] = aemContracts(found.aems, uid, data.profile.annexe);
    for (const a of openContracts(found.aems)) {
      const end = ends[a.ref];
      if (end) {
        const p = pendingContract(a, end, uid, data.profile.annexe);
        if (p) created.push(p);
      }
    }
    // Périodes couvertes par les AEM : les contrats saisis à la main sur ces périodes font doublon
    const spans = found.aems.map((a) => [a.start, a.end ?? `${a.month}-31`] as const);
    update((d) => {
      const contracts = replace
        ? d.contracts.filter((c) => c.source || c.simulated || !c.days.some((day) => spans.some(([s, e]) => day >= s && day <= e)))
        : d.contracts;
      const releves = found.info?.daysLeft != null && found.info.dailyAllowance != null
        ? [{ id: uid(), date: found.info.date, daysLeft: found.info.daysLeft, dailyAllowance: found.info.dailyAllowance, sjr: found.info.sjr }, ...d.profile.releves.filter((r) => r.date !== found.info!.date)]
        : d.profile.releves;
      const newUnpaid = found.unpaid.filter((_, i) => keepUnpaid[i]).filter((u) => !(d.profile.unpaidPeriods ?? []).some((x) => x.from === u.from && x.to === u.to));
      return {
        ...d,
        contracts: [...contracts, ...created],
        profile: {
          ...d.profile, releves,
          unpaidPeriods: [...(d.profile.unpaidPeriods ?? []), ...newUnpaid.map((u) => ({ id: uid(), ...u }))],
          waitingApplied: found.waiting && waitingOk ? true : d.profile.waitingApplied,
        },
      };
    });
    const parts = [created.length ? `${created.length} contrat${created.length > 1 ? 's' : ''} ajouté${created.length > 1 ? 's' : ''} (vérifiez-les dans le calendrier)` : '', found.info ? 'relevé enregistré' : ''].filter(Boolean);
    setDone(`${parts.join(', ')}.`.replace(/^./, (c) => c.toUpperCase()));
    setFound(null);
  };

  // Seul le contrat le plus récent fixe la fin de contrat de la demande : on ne demande la date de fin que pour lui
  const lastMonth = found?.aems.reduce((m, a) => (a.month > m ? a.month : m), '') ?? '';
  const open = found ? openContracts(found.aems).filter((a) => a.month === lastMonth) : [];
  const totalH = found?.aems.reduce((s, a) => s + (a.hours ?? 0), 0) ?? 0;
  const totalG = found?.aems.reduce((s, a) => s + (a.grossSubject ?? a.gross ?? 0), 0) ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label
        className={`dropzone${over ? ' over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); read([...e.dataTransfer.files]); }}
      >
        <input type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => { read([...(e.target.files ?? [])]); e.target.value = ''; }} />
        <strong>{busy ? 'Lecture en cours…' : kind === 'releve' ? 'Déposez ici votre relevé de situation (PDF)' : 'Déposez ici toutes vos AEM (PDF), d’un coup'}</strong>
        <span className="tiny">{kind === 'releve' ? 'ou cliquez pour le choisir. Plusieurs relevés à la fois, c’est possible : votre chômage restant se remplit tout seul.' : 'ou cliquez pour les choisir. Les contrats se créent tout seuls. Vous pouvez aussi y déposer vos relevés de situation.'}</span>
      </label>
      {!compact && <span className="tiny muted">
        Tout est lu <strong>dans votre navigateur</strong> : aucun fichier n'est envoyé, et le code de l'outil est libre et public. Les documents officiels donnent le calcul le plus juste :
        vrais jours travaillés, carence et différés, délai d'attente, reliquat exact. Seuls les chiffres utiles au calcul sont gardés (jamais votre nom, numéro de sécurité sociale ou adresse).
      </span>}
      {done && <div className="alert blue" role="status"><span className="small">{done}</span></div>}
      {found && (
        <div className="alert blue" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          {found.info && (
            <span className="small">
              <strong>Relevé de situation</strong> : au {fd(found.info.date)}, <strong>{found.info.daysLeft} jours</strong> restants, allocation brute <strong>{eur2(found.info.dailyAllowance ?? 0)}</strong>
              {found.info.sjr ? <>, salaire journalier de référence <strong>{eur2(found.info.sjr)}</strong></> : null}{found.info.intermittent ? ' · droit en annexes 8/10' : ''}.
            </span>
          )}
          {found.notes.length > 0 && <ul className="tiny" style={{ margin: 0, paddingLeft: 18 }}>{found.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          {found.unpaid.map((u, i) => (
            <label key={u.from + u.to} className="check small">
              <input type="checkbox" checked={keepUnpaid[i] ?? false} onChange={(e) => setKeepUnpaid(keepUnpaid.map((k, j) => (j === i ? e.target.checked : k)))} />
              Rien versé du {fd(u.from)} au {fd(u.to)} ({u.reason})
            </label>
          ))}
          {found.waiting && (
            <label className="check small">
              <input type="checkbox" checked={waitingOk} onChange={(e) => setWaitingOk(e.target.checked)} />
              Délai d'attente de 7 jours déjà appliqué (vu sur la période du {fd(found.waiting)}) : il ne sera pas retiré une 2e fois du droit intermittent
            </label>
          )}
          {found.aems.length > 0 && (
            <>
              <strong className="small">{found.aems.length} AEM lue{found.aems.length > 1 ? 's' : ''} · {Math.round(totalH)} h · {eur(totalG)} brut</strong>
              <div className="tablewrap">
                <table className="ctable" style={{ minWidth: 0 }}>
                  <thead><tr><th>Mois</th><th>Employeur</th><th>Contrat</th><th className="num">Heures</th><th className="num">Jours</th><th className="num">Brut</th><th>Annexe</th></tr></thead>
                  <tbody>
                    {found.aems.map((a) => (
                      <tr key={a.ref} style={a.doubts.length ? { background: 'var(--warn-bg)' } : undefined} title={a.doubts.length ? `À vérifier : ${a.doubts.join(', ')}` : undefined}>
                        <td>{a.month.slice(5)}/{a.month.slice(0, 4)}{a.initialRef ? <span className="tiny muted"> (suite)</span> : null}</td><td>{a.employer || '—'}</td>
                        <td className="tiny">{fd(a.start)} → {a.end ? fd(a.end) : 'en cours'}</td>
                        <td className="num">{a.hours ?? '?'}</td><td className="num">{a.workedDays ?? '?'}</td><td className="num">{a.grossSubject ?? a.gross ?? '?'}</td><td>{a.annexe ?? '?'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <span className="tiny">Les jours précis ne figurent pas sur l'AEM : l'outil place le nombre de jours travaillés sur les jours de semaine du contrat. Seul ce nombre compte pour le calcul.</span>
              {open.map((a) => (
                <label key={a.ref} className="field small">
                  Contrat {a.employer ? `chez ${a.employer} ` : ''}encore en cours fin {a.month.slice(5)}/{a.month.slice(0, 4)} (l'AEM du mois suivant manque) : date de fin du contrat ?
                  <span className="tiny" style={{ fontWeight: 400 }}>
                    Elle fixe la fin de contrat retenue pour votre demande (contrat de travail ou dernière AEM). Laissez vide si vous ne la connaissez pas encore.
                  </span>
                  <input type="date" value={ends[a.ref] ?? ''} min={a.start} onChange={(e) => setEnds({ ...ends, [a.ref]: e.target.value })} />
                </label>
              ))}
              <label className="check small"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />Remplacer les contrats saisis à la main sur ces périodes (évite les doublons)</label>
            </>
          )}
          {found.dupes.length > 0 && <span className="tiny"><strong>Doublons :</strong> {found.dupes.join(' · ')}.</span>}
          {found.known > 0 && <span className="tiny">{found.known} AEM déjà importée{found.known > 1 ? 's' : ''} auparavant : ignorée{found.known > 1 ? 's' : ''}.</span>}
          {found.unknownFiles.length > 0 && <span className="tiny">Non lus : {found.unknownFiles.join(' · ')}. Saisissez-les à la main.</span>}
          <div className="nav">
            {(found.info || found.aems.length > 0) && <button className="btn blue" onClick={apply}>Tout ajouter</button>}
            <button className="btn ghost" onClick={() => setFound(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

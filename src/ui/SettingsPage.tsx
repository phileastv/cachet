import { DEFAULT_RULES } from '../domain/rules';
import type { Rules } from '../domain/types';
import { useStore } from '../state/store';
import { num } from './format';

const FIELDS: [keyof Rules, string, string][] = [
  ['hoursRequired', 'Heures requises', 'h sur la période'],
  ['windowDays', 'Période de recherche des heures', 'jours'],
  ['threshold', 'Écart minimum pour le droit d’option', 'ex. 0,3 = 30 %'],
  ['lowAllowance', 'Allocation sous laquelle l’écart n’est pas exigé', '€ / jour'],
  ['safetyMargin', 'Marge de prudence au-dessus du seuil', 'ex. 0,05 = 5 points'],
  ['deductionRate', 'Part du salaire déduite de l’allocation', 'ex. 0,7 = 70 %'],
  ['monthDays', 'Jours indemnisables par mois', 'vide = automatique (jours du mois avant 2025, 30 depuis juillet 2025)'],
  ['waitingDays', 'Délai d’attente', 'jours, une fois par 12 mois'],
  ['retirementRate', 'Participation retraite retirée du reliquat', 'part du SJR, ex. 0,03'],
  ['retirementFloor', 'AJ minimale après participation retraite', '€ / jour'],
  ['arceRate', 'Part du reliquat versée par l’ARCE', '0,6 (fin de contrat depuis le 1/07/2023), 0,45 avant'],
  ['ajMin', 'AJ minimale annexes 8 et 10', '€ (formule A + B + C)'],
  ['floor8', 'Plancher allocation annexe 8', '€ / jour'],
  ['floor10', 'Plancher allocation annexe 10', '€ / jour'],
  ['ajMax', 'Plafond allocation intermittente', '€ / jour'],
  ['intermittentPeriodDays', 'Durée du droit intermittent', 'jours'],
  ['smicHourly', 'SMIC horaire brut', '€, pour la franchise salaires'],
  ['teachingCap', 'Plafond heures d’enseignement', 'h (moins de 50 ans)'],
  ['teachingCap50', 'Plafond heures d’enseignement à 50 ans et plus', 'h'],
];

export function SettingsPage() {
  const { data, update } = useStore();
  const rules = data.settings.rules;
  const setRule = (k: keyof Rules, v: number | null) => update((d) => ({ ...d, settings: { ...d.settings, rules: { ...d.settings.rules, [k]: v } } }));
  return (
    <>
      <div className="topbar"><h1>Paramètres</h1><a className="btn" href="#/">Tableau de bord</a></div>
      <section className="card">
        <h2>Apparence</h2>
        <div className="seg" role="group" aria-label="Thème" style={{ alignSelf: 'flex-start' }}>
          {([['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']] as const).map(([v, l]) => (
            <button key={v} aria-pressed={(data.settings.theme ?? 'auto') === v} onClick={() => update((d) => ({ ...d, settings: { ...d.settings, theme: v } }))}>{l}</button>
          ))}
        </div>
        <span className="small muted">« Automatique » suit le réglage clair / sombre de votre appareil.</span>
      </section>
      <section className="card">
        <h2>Règles de calcul</h2>
        <p className="small muted" style={{ margin: 0 }}>Valeurs issues du guide France Travail « Intermittents du spectacle » et des annexes 8 et 10 de l'Unédic. La réglementation change : si une valeur est fausse, corrigez-la ici et signalez-la sur le dépôt du projet.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {FIELDS.map(([k, label, hint]) => (
            <label key={k} className="field">{label} <span className="tiny muted" style={{ fontWeight: 400 }}>{hint} · défaut {DEFAULT_RULES[k] == null ? 'automatique' : String(DEFAULT_RULES[k]).replace('.', ',')}</span>
              <input inputMode="decimal" value={rules[k] == null ? '' : String(rules[k]).replace('.', ',')} onChange={(e) => setRule(k, k === 'monthDays' && e.target.value.trim() === '' ? null : num(e.target.value))} />
            </label>
          ))}
        </div>
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => update((d) => ({ ...d, settings: { ...d.settings, rules: { ...DEFAULT_RULES } } }))}>Revenir aux valeurs par défaut</button>
      </section>
      <section className="card">
        <h2>Simulation</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <label className="field">Date « aujourd'hui » <span className="tiny muted" style={{ fontWeight: 400 }}>pour tester une autre date, vide = vraie date</span>
            <input type="date" value={data.settings.todayOverride ?? ''} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, todayOverride: e.target.value || null } }))} />
          </label>
          <label className="field">Taux horaire brut par défaut <span className="tiny muted" style={{ fontWeight: 400 }}>utilisé par les scénarios si vous n'avez aucun contrat</span>
            <input inputMode="decimal" value={data.settings.fallbackHourlyGross} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, fallbackHourlyGross: num(e.target.value) } }))} />
          </label>
        </div>
        <div className="nav">
          <a className="btn" href="#/bienvenue">Revoir l'explication</a>
          <button className="btn" onClick={() => update((d) => ({ ...d, toursSeen: [] }))}>Revoir les visites guidées</button>
        </div>
      </section>
    </>
  );
}

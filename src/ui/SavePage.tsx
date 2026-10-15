import { useRef, useState } from 'react';
import { emptyData } from '../domain/demo';
import { clearLocal, exportPlain, normalize } from '../state/persistence';
import { go } from '../state/router';
import { useStore } from '../state/store';

/** Exemples de situations (src/examples/*.json), pour découvrir l'outil ou le tester. */
const EXAMPLES = import.meta.glob('../examples/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const EXAMPLE_LABELS: Record<string, [string, string]> = {
  '1-a-l-aise-quand-demander': ['À l’aise : quand demander ?', 'Beaucoup d’heures, le droit d’option est acquis : la question devient la date.'],
  '2-de-justesse': ['De justesse', 'Possible bientôt, mais l’écart dépasse à peine 30 %.'],
  '3-il-manque-des-heures': ['Il manque des heures', 'Les contrats prévus amènent aux 507 h dans quelques mois.'],
  '4-ecart-trop-faible': ['Écart trop faible', 'Les heures y sont, mais le chômage restant reste trop gros.'],
  '5-ecart-dans-quelques-mois': ['Écart atteint dans quelques mois', 'Sans nouveau contrat, le chômage baisse et l’option devient possible.'],
  '6-chomage-bientot-epuise': ['Chômage bientôt épuisé', 'Pas besoin du droit d’option : ouverture intermittente directe.'],
  '7-jamais-507-heures': ['507 h jamais atteintes', 'Trop peu de contrats pour ouvrir un droit d’intermittent.'],
  '8-petite-allocation': ['Petite allocation (< 20 €/jour)', 'Seules les 507 h comptent, pas la règle des 30 %.'],
};

export function SavePage() {
  const { data, replace, savedAt, storageOk } = useStore();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const onFile = async (f: File) => {
    try {
      const obj = JSON.parse(await f.text());
      replace({ ...normalize(obj), onboarded: true });
      setMsg({ kind: 'ok', text: 'Sauvegarde importée.' });
      go('/');
    } catch (e) {
      setMsg({ kind: 'warn', text: e instanceof Error ? e.message : 'Fichier illisible' });
    }
  };

  return (
    <>
      <div className="topbar"><h1>Sauvegarder mes données</h1><a className="btn" href="#/">Tableau de bord</a></div>
      {msg && <div className={`alert ${msg.kind}`} role="status">{msg.text}</div>}
      <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        <section className="card">
          <h2>1 · Dans ce navigateur</h2>
          <p className="small" style={{ margin: 0 }}>Tout est enregistré automatiquement sur cet appareil, dans ce navigateur. Rien n'est envoyé à un serveur : le site n'a même pas de base de données.</p>
          <span className={`badge ${storageOk ? 'ok' : 'gap'}`} style={{ alignSelf: 'flex-start' }}>{storageOk ? (savedAt ? `Enregistré à ${new Date(savedAt).toLocaleTimeString('fr-FR')}` : 'Enregistrement automatique actif') : 'Stockage indisponible (navigation privée ?)'}</span>
          <p className="tiny muted" style={{ margin: 0 }}>Attention : vider les données du site, changer de navigateur ou d'appareil fait tout perdre. Exportez un fichier de temps en temps.</p>
        </section>
        <section className="card">
          <h2>2 · Dans un fichier</h2>
          <p className="small" style={{ margin: 0 }}>Un fichier <code>.json</code> à garder où vous voulez (ordinateur, clé USB, cloud perso) et à réimporter plus tard, sur n'importe quel appareil.</p>
          <button className="btn dark" onClick={() => exportPlain(data)}>Télécharger ma sauvegarde</button>
          <button className="btn" onClick={() => file.current?.click()}>Importer une sauvegarde…</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </section>
      </div>
      <section className="card">
        <h2>Exemples de situations</h2>
        <p className="small" style={{ margin: 0 }}>Pour découvrir l'outil sans saisir vos données. Charger un exemple <strong>remplace vos données actuelles</strong> : téléchargez d'abord votre sauvegarde. Les exemples sont calés sur le 7 octobre 2026 (réglable dans les Paramètres).</p>
        <div className="cards small-cards">
          {Object.entries(EXAMPLES).sort(([a], [b]) => a.localeCompare(b)).map(([path, json]) => {
            const key = path.split('/').pop()!.replace('.json', '');
            const [title, desc] = EXAMPLE_LABELS[key] ?? [key, ''];
            return (
              <article key={key} className="scard">
                <strong>{title}</strong>
                <span className="small muted">{desc}</span>
                <button className="btn sm" style={{ marginTop: 'auto' }} onClick={() => {
                  if (!confirm(`Charger l'exemple « ${title} » ? Vos données actuelles seront remplacées.`)) return;
                  replace({ ...normalize(json), onboarded: true });
                  go('/');
                }}>Charger cet exemple</button>
              </article>
            );
          })}
        </div>
      </section>
      <section className="card" style={{ background: 'var(--card-2)' }}>
        <h2 style={{ fontSize: 17 }}>Tout effacer</h2>
        <p className="small" style={{ margin: 0 }}>Supprime toutes vos données de ce navigateur. Pensez à télécharger une sauvegarde avant.</p>
        <button className="btn danger" style={{ alignSelf: 'flex-start' }} onClick={() => { if (confirm('Effacer toutes les données de ce navigateur ?')) { clearLocal(); replace(emptyData()); go('/'); } }}>Effacer mes données</button>
      </section>
    </>
  );
}

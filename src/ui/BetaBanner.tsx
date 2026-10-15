import { CONTACT_EMAIL as CONTACT } from '../config';

/** Bandeau permanent : l'outil est expérimental et ne remplace pas France Travail. */
export function BetaBanner() {
  return (
    <div className="beta-banner" role="note">
      <strong>Outil expérimental.</strong> Testé sur de vrais dossiers France Travail et conçu pour être aussi fiable que possible, il peut
      pourtant se tromper : prenez ses résultats avec des pincettes. Il ne remplace pas France Travail, seul à décider de vos droits.
      {CONTACT ? <> Faites-moi vos retours par mail : <a href={`mailto:${CONTACT}`}>{CONTACT}</a></> : null}
    </div>
  );
}

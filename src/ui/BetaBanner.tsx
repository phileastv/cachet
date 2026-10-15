/** Adresse de contact : définie dans .env.local (hors git, pour éviter qu'elle soit moissonnée sur le dépôt). */
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

/** Bandeau permanent : l'outil est expérimental et ne remplace pas France Travail. */
export function BetaBanner() {
  return (
    <div className="beta-banner" role="note">
      <strong>Outil expérimental.</strong> Testé sur de vrais dossiers France Travail et conçu pour être aussi fiable que possible, il peut
      pourtant se tromper : prenez ses résultats avec des pincettes. Il ne remplace pas France Travail, seul à décider de vos droits.
      {CONTACT ? <> Une erreur, une question ? <a href={`mailto:${CONTACT}`}>{CONTACT}</a></> : null}
    </div>
  );
}

/**
 * Guides illustrés « où trouver mes documents ». Les illustrations sont des maquettes simplifiées
 * (aucune capture réelle, aucune donnée personnelle, pas de logo officiel).
 */

function Step({ n, title, children, mock }: { n: number; title: React.ReactNode; children?: React.ReactNode; mock: React.ReactNode }) {
  return (
    <li className="guide-step">
      <div className="guide-mock" aria-hidden="true">{mock}</div>
      <div className="guide-text">
        <span className="guide-n">Étape {n}</span>
        <strong>{title}</strong>
        {children && <span className="small muted">{children}</span>}
      </div>
    </li>
  );
}

const Browser = ({ url, children }: { url: string; children: React.ReactNode }) => (
  <div className="mock-win">
    <div className="mock-bar"><i /><i /><i /><span>{url}</span></div>
    <div className="mock-body">{children}</div>
  </div>
);

const Envelope = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);

/** Récupérer le dernier relevé de situation dans l'espace France Travail. */
export function ReleveGuide({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={`guide${compact ? ' compact' : ''}`}>
      <Step n={1} title="Allez sur votre espace France Travail" mock={
        <Browser url="francetravail.fr">
          <div className="mock-head"><b>Mon espace personnel</b></div>
          <div className="mock-tabs"><span className="on">Accueil</span><span>Mon projet</span><span>Inscription et allocations</span></div>
          <div className="mock-cards"><span /><span /></div>
        </Browser>
      }>Connectez-vous sur francetravail.fr (ou l'appli « Mon espace »).</Step>
      <Step n={2} title={<>Ouvrez vos courriers reçus : la petite enveloppe <span className="guide-icon"><Envelope size={14} /></span> en haut à droite</>} mock={
        <Browser url="francetravail.fr">
          <div className="mock-top">
            <span className="mock-btn" />
            <span className="mock-btn hl"><Envelope /></span>
            <span className="mock-user" />
          </div>
          <div className="mock-arrow">↑ Mes courriers reçus</div>
        </Browser>
      }>Ou : Échanges et documents › Mes courriers reçus.</Step>
      <Step n={3} title={<>Téléchargez le dernier « Relevé de situation », puis déposez-le ici</>} mock={
        <Browser url="francetravail.fr · Mes courriers reçus">
          <div className="mock-row hl"><Envelope /><span><b>Relevé de situation</b><small>le plus récent, en haut</small></span><em>Consulter</em></div>
          <div className="mock-row"><Envelope /><span><b>Relevé de situation</b><small>le mois d'avant</small></span><em>Consulter</em></div>
          <div className="mock-row"><Envelope /><span><b>Notification admission ARE</b><small>…</small></span><em>Consulter</em></div>
        </Browser>
      }>« Consulter » ouvre le PDF : enregistrez-le, puis glissez-le dans le cadre ci-dessous. Plusieurs relevés d'un coup, c'est encore mieux (carence, différés, mois sans paiement).</Step>
    </ol>
  );
}

/** Rassembler ses AEM (attestations employeur mensuelles). */
export function AemGuide() {
  return (
    <ol className="guide">
      <Step n={1} title="Retrouvez vos AEM (attestations employeur mensuelles)" mock={
        <div className="mock-win">
          <div className="mock-bar"><i /><i /><i /><span>Messagerie · Paie</span></div>
          <div className="mock-body">
            <div className="mock-row"><span className="mock-pdf">PDF</span><span><b>AEM · septembre</b><small>envoyée par l'employeur</small></span></div>
            <div className="mock-row"><span className="mock-pdf">PDF</span><span><b>AEM · août</b><small>plateforme de paie</small></span></div>
          </div>
        </div>
      }>Votre employeur vous en remet une chaque mois de contrat : par e-mail, ou sur sa plateforme de paie (Movinmotion, Silae, Spaiectacle…). Il manque une AEM ? Demandez-la à l'employeur.</Step>
      <Step n={2} title="Prenez toutes celles des 12 derniers mois" mock={
        <div className="mock-stack"><span className="mock-pdf big">PDF</span><span className="mock-pdf big">PDF</span><span className="mock-pdf big">PDF</span></div>
      }>Un PDF par employeur et par mois. Avec la DSN, les AEM sont progressivement remplacées par une « AE-CS » : déposez-les aussi.</Step>
      <Step n={3} title="Déposez-les toutes d'un coup ci-dessous" mock={
        <div className="mock-drop">⇣<b>Déposez vos PDF</b><small>lecture dans le navigateur</small></div>
      }>Les contrats se créent tout seuls (heures, jours travaillés, salaires). Vous vérifiez le tableau avant d'ajouter.</Step>
    </ol>
  );
}

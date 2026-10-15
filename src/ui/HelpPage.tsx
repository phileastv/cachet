const STRATEGIES: [string, string, string][] = [
  ['Écouler tout son chômage', 'Arrêter les contrats jusqu’à épuisement des droits, puis ouvrir ses droits d’intermittent normalement.', 'Il faut avoir 507 h sur les 12 derniers mois le jour où le chômage s’arrête. Coûteux pour le réseau professionnel.'],
  ['Attendre le bon mois', 'Le chômage restant baisse chaque mois. Mais le droit intermittent comparé baisse aussi : France Travail retire les jours écoulés depuis votre dernière fin de contrat. Attendre n’aide que si votre droit intermittent compte plus de jours que votre chômage restant.', 'Surveillez aussi l’expiration de vos plus vieux contrats (12 mois glissants).'],
  ['Moduler son rythme', 'Travailler, mais sous le plafond de salaire qui laisse le chômage s’écouler (en dessous d’environ 30 × AJ ÷ 0,7 par mois).', 'Visible dans les scénarios « moins que d’habitude » et « un mois sur deux ».'],
  ['Sprint puis pause', 'Enchaîner pour passer vite les 507 h, puis lever le pied pour laisser fondre le chômage.', 'Techniquement efficace, mais pas toujours réaliste avec ses employeurs ou sa santé.'],
  ['Mieux négocier ses salaires', 'Un salaire de référence plus élevé augmente l’allocation intermittente (partie A de la formule) donc l’écart.', 'Mais un mois mieux payé verse aussi moins de chômage.'],
  ['Heures d’enseignement', 'Des cours artistiques ou techniques dans un établissement agréé comptent pour les 507 h : 70 h max (120 h à 50 ans et plus).', 'Pas pris en compte pour le montant. Total enseignement + formation plafonné à 338 h.'],
  ['Heures de formation', 'Certaines formations professionnelles (non rémunérées par le chômage) comptent jusqu’à 338 h.', 'Une période de travail après la formation est nécessaire (sauf PTP). À vérifier avec France Travail.'],
  ['Arrêt maladie', 'Une maladie entre deux contrats allonge la période de 365 jours. Un arrêt pendant un contrat compte 5 h par jour.', 'Indemnisé par la Sécurité sociale uniquement.'],
  ['Allocation sous 20 €/jour', 'Si votre allocation actuelle est de 20 € brut par jour ou moins, la condition des 30 % ne s’applique pas.', 'Seules les 507 h sont exigées.'],
  ['L’ARCE', 'Créer ou reprendre une activité et toucher 60 % du chômage restant en capital (45 % si votre fin de contrat date d’avant le 1/07/2023) : le droit restant fond d’un coup.', ' Arrête le versement mensuel. À valider avec un conseiller.'],
  ['Annuler une révision / régulariser un rechargement', 'Si des heures d’intermittence ont servi à recharger ou réviser votre chômage général, vous pouvez demander un réexamen en annexes 8/10.', 'Guide France Travail p. 19. Le reliquat est alors perdu.'],
  ['Bien choisir le jour de la demande', 'Au plus tôt le lendemain de la fin du contrat qui fait passer les 507 h, un jour sans contrat. La date de la demande = début des droits.', 'Compter quelques semaines de traitement et 21 jours pour signer le comparatif.'],
];

export function HelpPage() {
  return (
    <>
      <div className="topbar"><h1>Comprendre et stratégies</h1><a className="btn" href="#/">Tableau de bord</a></div>
      <section className="card">
        <h2>Les règles en bref</h2>
        <ul className="small" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><strong>Régime général</strong> : chaque mois, l'allocation pleine moins 70 % du salaire brut. Les jours non versés restent dans le capital. Le cumul salaire + chômage est plafonné au salaire de référence.</li>
          <li><strong>Intermittence</strong> : 507 h d'annexes 8 ou 10 sur les 365 jours avant la fin du dernier contrat. 1 cachet = 12 h.</li>
          <li><strong>Droit d'option</strong> : 507 h, et droit intermittent ≥ droit restant + 30 % (ou allocation actuelle &lt; 20 €/jour). Demande écrite, comparatif à signer sous 21 jours, irrévocable.</li>
          <li><strong>Allocation intermittente</strong> (annexe 8) : A + B + C, avec A lié au salaire, B aux heures, C fixe ; plancher 38 € (44 € en annexe 10). Estimation : la vraie valeur dépend aussi des franchises.</li>
        </ul>
      </section>
      <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {STRATEGIES.map(([t, d, n]) => (
          <article key={t} className="scard">
            <strong style={{ fontSize: 16 }}>{t}</strong>
            <span className="small">{d}</span>
            <span className="tiny muted" style={{ marginTop: 'auto' }}>{n}</span>
          </article>
        ))}
      </div>
      <p className="tiny muted">Cet outil est une aide au calcul, pas un avis juridique. En cas de doute : France Travail Spectacle, votre syndicat, ou une permanence juridique (CGT Spectacle, SFA, SNAM…).</p>
    </>
  );
}

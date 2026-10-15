import { useState } from 'react';
import { fmtDay } from '../domain/dates';
import type { Simulation } from '../domain/engine';

const steps: [string, React.ReactNode][] = [
  ['Vérifier les 2 conditions', <>507 h sur les 12 mois avant la fin de votre dernier contrat, <strong>et</strong> un droit intermittent au moins 30 % plus élevé que ce qu'il vous reste (ou une allocation actuelle de 20 €/jour ou moins). France Travail compte le droit intermittent à partir de la date de la demande : chaque jour d'attente après la fin de contrat le réduit.</>],
  ['Choisir le jour', <>Un jour <strong>sans contrat</strong>, au plus tôt le lendemain de la fin du contrat qui fait passer les 507 h. La date d'envoi devient le début de l'indemnisation intermittente.</>],
  ['Pas besoin de tout renvoyer', <>France Travail regarde vos 12 derniers mois <strong>rétroactivement</strong> : vos employeurs lui transmettent déjà les AEM et DUS. Vérifiez « Mes 2 dernières années professionnelles » et faites l'actualisation du mois.</>],
  ['Écrire à France Travail Spectacle', <>Espace personnel › Mes échanges et documents › Transmettre et suivre un document › « Demande/acceptation de droit d'option ». Ce sont les équipes Spectacle qui traitent la demande.</>],
  ['Signer sous 21 jours', <>Vous recevez un tableau comparatif à renvoyer signé. Sans réponse, vous restez au régime général. C'est <strong>irrévocable</strong> : le reste de votre chômage est perdu.</>],
];

export function RequestGuide({ sim }: { sim: Simulation }) {
  const [copied, setCopied] = useState(false);
  const r = sim.requestDay;
  const letter = `Objet : Demande de droit d’option — annexes 8 et 10

Bonjour,

Je souhaite exercer mon droit d’option pour être indemnisé·e au titre des annexes 8 et 10.
Je justifie de ${r ? Math.round(r.hours) : '[NOMBRE]'} heures de travail sur les 12 mois précédant ma dernière fin de contrat, le ${sim.lastContractEnd !== null ? fmtDay(sim.lastContractEnd) : '[DATE]'}.
Merci de m’adresser le tableau comparatif entre mon droit actuel et mon droit intermittent.

Identifiant France Travail : [VOTRE IDENTIFIANT]

Cordialement,
[VOTRE NOM]`;
  return (
    <section className="card" style={{ gap: 16, padding: '22px 24px' }} id="demande">
      <div className="topbar"><h2>Envoyer sa demande de droit d'option</h2><span className="tiny muted">Sources : guide France Travail « Intermittents du spectacle » p. 19 · francetravail.fr/spectacle</span></div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {steps.map(([t, body], i) => (
          <li key={t} style={{ background: 'var(--card-2)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ width: 30, height: 30, borderRadius: 99, background: 'var(--dark)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{i + 1}</span>
            <strong>{t}</strong>
            <span className="small" style={{ color: 'var(--ink-2)' }}>{body}</span>
          </li>
        ))}
      </ol>
      <div className="row" style={{ alignItems: 'stretch' }}>
        <pre style={{ flex: '1 1 520px', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.55, background: 'var(--dark)', color: '#e6eaf0', borderRadius: 16, padding: '16px 18px' }}>{letter}</pre>
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
          <button className="btn primary" style={{ minHeight: 48 }} onClick={async () => { try { await navigator.clipboard.writeText(letter); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Copié ✓' : 'Copier le message'}</button>
          <span className="small muted">Le message reprend vos heures et la date de fin de votre dernier contrat avant le jour de la demande. Complétez [VOTRE IDENTIFIANT] et [VOTRE NOM].</span>
        </div>
      </div>
    </section>
  );
}

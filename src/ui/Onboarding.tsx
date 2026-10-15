import { useEffect, useState } from 'react';
import { APP_NAME, DONATE_URL, REPO_URL } from '../config';
import { fromDay, monthStart, parts } from '../domain/dates';
import { demoData } from '../domain/demo';
import { go } from '../state/router';
import { uid, useStore } from '../state/store';
import { eur, num } from './format';
import { DocImport } from './DocImport';
import { Logo } from './Icons';
import { ReleveGuide } from './ImportGuides';

const STEPS = [
  'Vous voulez devenir intermittent·e ?',
  'Vous avez des droits au chômage « classique »',
  'Ces droits forment un capital',
  'Les contrats d’intermittent mettent ce capital en pause',
  'Le droit d’option et la règle des 30 %',
  'Le serpent qui se mord la queue',
  'L’autre voie : écouler tout son chômage',
  'Êtes-vous concerné·e ?',
  '507 heures sur 12 mois glissants',
  'Un outil libre et gratuit',
  'Vos chiffres de chômage',
];

export function Onboarding() {
  const { today, update, data } = useStore();
  const [step, setStep] = useState(0);
  const last = STEPS.length - 1;
  // Le bloc « Informations sur vos droits » d'un relevé est arrêté au dernier jour du mois précédent
  const releveCount = data.profile.releves.length;
  // Téléphone : écran étroit et pointeur tactile
  const phone = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px) and (pointer: coarse)').matches;
  const [phoneOk, setPhoneOk] = useState(false);
  const [f, setF] = useState({ daysLeft: '', date: fromDay(monthStart(parts(today).y, parts(today).m) - 1), aj: '' });

  const finish = (withDemo: boolean) => {
    if (withDemo) {
      update(() => demoData(today));
      go('/');
      return;
    }
    update((d) => ({
      ...d,
      onboarded: true,
      profile: num(f.aj) ? { ...d.profile, releves: [{ id: uid(), date: f.date, daysLeft: num(f.daysLeft), dailyAllowance: num(f.aj) }] } : d.profile,
    }));
    go('/contrats');
  };

  return (
    <div className="ob">
      <header style={{ maxWidth: 1240, width: '100%', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span className="brand"><Logo /><strong>{APP_NAME}</strong></span>
        <div className="dots" aria-label="Progression">
          {STEPS.map((t, i) => (
            <button key={t} aria-label={`Étape ${i + 1} : ${t}`} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}
              style={{ width: i === step ? 34 : 10, background: i <= step ? 'var(--ink)' : 'var(--line)' }} />
          ))}
        </div>
        {data.onboarded ? <a href="#/" className="btn ghost">Retour au tableau de bord</a> : <button className="btn ghost" onClick={() => setStep(last)}>Passer l'explication</button>}
      </header>

      {phone && step === 0 && !phoneOk && (
        <div className="alert warn" role="note" style={{ maxWidth: 1240, width: '100%', margin: '0 auto' }}>
          <span className="small"><strong>Conseillé sur ordinateur.</strong> Vous allez télécharger vos relevés et vos attestations (PDF) puis les déposer ici : c'est bien plus simple sur un ordinateur. Vous pouvez quand même continuer sur téléphone.</span>
          <button className="btn sm" onClick={() => setPhoneOk(true)}>Compris</button>
        </div>
      )}
      <main>
        <section className="stage" aria-hidden="true"><Visual step={step} /></section>
        <section className="text">
          <span className="tiny muted" style={{ fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>Étape {step + 1} sur {STEPS.length}</span>
          <h1>{STEPS[step]}</h1>
          <Body step={step} />
          {step === last && (
            <div className="card" style={{ gap: 12 }}>
              <strong>Le plus simple : déposez votre dernier relevé de situation</strong>
              <ReleveGuide />
              <DocImport kind="releve" compact />
              {releveCount > 0 && <span className="small" style={{ color: 'var(--ok)' }}>✓ Relevé enregistré : vous pouvez continuer.</span>}
              <details className="toggle-manual">
                <summary>Ou saisir les chiffres à la main</summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                  <label className="field">Jours restants<input inputMode="numeric" value={f.daysLeft} onChange={(e) => setF({ ...f, daysLeft: e.target.value })} placeholder="ex. 220" /></label>
                  <label className="field">au (date « au » du relevé)<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
                  <label className="field">Allocation brute / jour<input inputMode="decimal" value={f.aj} onChange={(e) => setF({ ...f, aj: e.target.value })} placeholder="ex. 48,70" /></label>
                </div>
                <div className="alert blue" style={{ marginTop: 10 }}><span className="small">Votre capital de chômage restant</span><strong style={{ fontSize: 22 }}>{eur(num(f.daysLeft) * num(f.aj))}</strong></div>
                <span className="tiny muted">Dans le relevé de situation, bloc « Informations sur vos droits au … » : « Durée d'indemnisation restante » et « Allocation brute d'un montant journalier de … » (pas le montant versé).</span>
              </details>
              <span className="tiny muted">Tout reste dans votre navigateur, et le code de l'outil est libre. À l'étape suivante, déposez vos AEM : vos contrats se créent tout seuls.</span>
            </div>
          )}
          <div className="nav">
            {step > 0 && <button className="btn" style={{ minHeight: 52 }} onClick={() => setStep(step - 1)}>← Précédent</button>}
            {step < last && <button className="btn dark" style={{ minHeight: 52, padding: '0 24px' }} onClick={() => setStep(step + 1)}>{step === 0 ? 'Comprendre pas à pas' : 'Suivant →'}</button>}
            {step === last && <button className="btn primary" style={{ minHeight: 52, padding: '0 24px' }} onClick={() => finish(false)}>Continuer avec mes contrats →</button>}
            {step === last && <button className="btn" style={{ minHeight: 52 }} onClick={() => finish(true)}>Essayer avec un exemple</button>}
            {step === 0 && <a className="btn ghost" href="#/sauvegarde">J'ai déjà une sauvegarde</a>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Body({ step }: { step: number }) {
  const P = ({ children }: { children: React.ReactNode }) => <p className="lead">{children}</p>;
  switch (step) {
    case 0:
      return <>
        <P>Vous êtes au chômage au régime général (le chômage « classique ») et vous enchaînez des contrats d'intermittent du spectacle ? Pour passer intermittent·e, vous devez faire ce qu'on appelle un <strong>droit d'option</strong>.</P>
        <P>Beaucoup d'intermittent·es tombent dans le piège sans le voir. Personnellement, ça m'a pris deux ans de galères pour comprendre et enfin ouvrir mes droits d'intermittent. J'ai créé cet outil pour vous aider à calculer <strong>si</strong> vous pouvez le faire, et <strong>quand</strong>.</P>
      </>;
    case 1:
      return <>
        <P>Avant l'intermittence, vous avez eu un emploi « classique » : un CDD, un CDI, un intérim… Quand il s'est terminé, France Travail vous a <strong>ouvert des droits au chômage</strong> au régime général. On appelle cette allocation l'<strong>ARE</strong>.</P>
        <P>Vous êtes indemnisé·e avec un <strong>montant par jour</strong> (l'allocation journalière), calculé à partir de vos anciens salaires. Par exemple 48,70 € brut par jour.</P>
      </>;
    case 2:
      return <>
        <P>Ces droits ne sont pas illimités : on vous a ouvert un <strong>nombre de jours</strong>. Nombre de jours × montant par jour = votre <strong>capital</strong> de chômage.</P>
        <P>Par exemple 340 jours × 48,70 € = 16 558 €. Chaque jour indemnisé le fait baisser, comme un réservoir qui se vide. Vous voyez les jours restants dans votre espace France Travail.</P>
      </>;
    case 3:
      return <>
        <P>Quand vous signez des contrats d'intermittent (des CDDU, des cachets), France Travail retire chaque mois <strong>70 % de votre salaire brut</strong> de votre chômage. Certains mois, vous ne touchez presque rien.</P>
        <P>Mais les jours non versés ne sont pas perdus : ils restent dans votre capital. Votre chômage est donc <strong>mis en pause</strong>, et la <strong>date de fin</strong> de vos droits au régime général <strong>recule</strong> d'autant.</P>
      </>;
    case 4:
      return <>
        <P>Pour passer intermittent·e sans attendre la fin de votre chômage, il faut faire un <strong>droit d'option</strong> : vous <strong>renoncez au capital qu'il vous reste</strong> pour être indemnisé·e comme intermittent·e.</P>
        <P>France Travail ne l'accepte que si vous avez <strong>507 heures</strong> d'intermittence sur les 12 derniers mois, <strong>et</strong> si votre droit intermittent est <strong>au moins 30 % plus élevé</strong> que le capital qu'il vous reste (sauf si votre allocation actuelle est sous 20 € par jour). C'est définitif.</P>
      </>;
    case 5:
      return <>
        <P>Pour atteindre 507 h, il faut travailler. Mais chaque contrat met votre chômage en pause : le capital reste élevé… donc le seuil des +30 % reste haut… donc le droit d'option est refusé… donc vous continuez à travailler.</P>
        <P>Et pendant ce temps, vos plus vieux contrats sortent des 12 mois et vos heures redescendent. C'est le serpent qui se mord la queue : plus vous travaillez, plus la bascule recule.</P>
      </>;
    case 6:
      return <>
        <P>Vous pouvez aussi <strong>écouler tout votre chômage</strong>, puis ouvrir vos droits d'intermittent normalement, sans droit d'option. Sur le papier c'est le plus simple.</P>
        <P>Mais il faut mettre en pause son réseau et sa vie professionnelle, et <strong>avoir déjà ses 507 h (sur les 12 derniers mois) le jour où le chômage se termine</strong>, sachant que vos contrats auront reporté cette date de fin.</P>
      </>;
    case 7:
      return <>
        <P>S'il vous reste <strong>moins d'un an de chômage</strong>, ou si vous avez fait une <strong>longue pause de travail</strong> après l'ouverture de vos droits, vous n'aurez probablement pas de souci : votre capital s'est déjà bien vidé.</P>
        <P>Si vous n'êtes pas sûr·e, c'est justement ce que cet outil calcule, mois par mois, avec plusieurs stratégies possibles.</P>
      </>;
    case 8:
      return <P>Les 507 h se comptent sur les 365 jours avant la fin de votre dernier contrat. Ce cadre avance avec le temps : un contrat de plus d'un an <strong>ne compte plus</strong>. Attendre trop longtemps peut donc aussi vous faire perdre des heures.</P>;
    case 9:
      return <>
        <P>Cet outil est <strong>open source</strong> : son code est public, tout le monde peut le lire, vérifier les calculs, le corriger ou l'améliorer. Il est gratuit, sans publicité, et vos données ne quittent jamais votre navigateur.</P>
        <P>S'il vous a aidé·e, vous pouvez <strong>soutenir le projet</strong> avec un don, et surtout <strong>en parler autour de vous</strong> : pour que d'autres ne tombent pas dans le même piège.</P>
        <div className="nav">
          {DONATE_URL ? <a className="btn primary" href={DONATE_URL} target="_blank" rel="noreferrer">♥ Soutenir le projet</a> : <span className="btn" aria-disabled="true" style={{ opacity: .7 }}>♥ Soutenir le projet · [LIEN DE DON]</span>}
          <ShareButton />
          {REPO_URL && <a className="btn ghost" href={REPO_URL} target="_blank" rel="noreferrer">Voir le code source</a>}
        </div>
      </>;
    default:
      return <P>Dernière étape : déposez votre dernier relevé de situation France Travail (ou recopiez ses chiffres). Les calculs partiront de là, et vous pourrez le mettre à jour chaque mois.</P>;
  }
}

function ShareButton() {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = location.href.split('#')[0];
    const text = 'Au chômage et bientôt intermittent·e ? Cet outil calcule quand faire son droit d’option.';
    try {
      if (navigator.share) await navigator.share({ title: APP_NAME, text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setDone(true); }
    } catch { /* partage annulé */ }
  };
  return <button className="btn" onClick={share}>{done ? 'Lien copié ✓' : 'Partager l’outil'}</button>;
}

function Jar({ color, anim, label, height = '60%', children }: { color: string; anim?: string; label: string; height?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div className="jar"><i className={anim} style={{ background: color, height: anim ? undefined : height }} />{children}</div>
      <strong>{label}</strong>
    </div>
  );
}

const Box = ({ children, bg, style }: { children: React.ReactNode; bg: string; style?: React.CSSProperties }) => (
  <div style={{ background: bg, borderRadius: 18, padding: '14px 16px', fontWeight: 700, ...style }}>{children}</div>
);

function Visual({ step }: { step: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1400);
    return () => clearInterval(t);
  }, []);

  switch (step) {
    case 0:
      return <IntroStory />;
    case 1:
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Box bg="var(--card-2)" style={{ width: 170, textAlign: 'center' }}>
            <span className="tiny muted" style={{ display: 'block' }}>Contrat terminé</span>
            <span style={{ fontSize: 22 }}>CDD · CDI</span>
            <span className="tiny muted" style={{ display: 'block', textDecoration: 'line-through' }}>2022 → 2025</span>
          </Box>
          <svg width="60" height="30" viewBox="0 0 60 30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M4 15h48M42 6l10 9-10 9" /></svg>
          <Box bg="var(--chom-bg)" style={{ width: 200, textAlign: 'center', color: 'var(--chom-ink)' }}>
            <span className="tiny" style={{ display: 'block' }}>France Travail vous verse l'ARE</span>
            <span style={{ fontSize: 34 }}>48,70 €</span>
            <span className="tiny" style={{ display: 'block' }}>brut par jour</span>
          </Box>
        </div>
      );
    case 2:
      return <CapitalDrain />;
    case 3:
      return <PauseCalendar />;
    case 4:
      return <ThirtyRule />;
    case 5: {
      const nodes = ['Je signe un contrat', 'Mon chômage se met en pause', 'Mon capital reste élevé', 'Le seuil des +30 % reste haut'];
      const pos = [{ gridArea: '1 / 1' }, { gridArea: '1 / 2' }, { gridArea: '2 / 2' }, { gridArea: '2 / 1' }];
      const active = tick % 4;
      return (
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 60, width: 'min(100%, 460px)' }}>
          {nodes.map((n, i) => (
            <div key={n} style={{ ...pos[i], borderRadius: 18, padding: 16, minHeight: 90, display: 'flex', alignItems: 'center', fontWeight: 800, transition: 'all .4s', background: i === active ? 'var(--int)' : 'var(--card-2)', color: i === active ? '#16202c' : 'var(--ink)', transform: i === active ? 'scale(1.06)' : 'none' }}>
              <span style={{ fontSize: 13, opacity: .7, marginRight: 8 }}>{i + 1}</span>{n}
            </div>
          ))}
          <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', fontSize: 40, transform: `rotate(${tick * 90}deg)`, transition: 'transform .6s' }}>↻</span>
        </div>
      );
    }
    case 6:
      return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 30, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Jar color="var(--chom)" anim="anim-drain" label="Chômage écoulé" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 60 }}>
            <Box bg="var(--ok-bg)" style={{ color: 'var(--ok-ink)' }}>Le jour où il se termine…</Box>
            <Box bg="var(--int-bg)" style={{ color: 'var(--int-ink)' }}>…avoir 507 h sur les 12 derniers mois</Box>
          </div>
        </div>
      );
    case 7:
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: 'min(100%, 520px)' }}>
          <Box bg="var(--ok-bg)" style={{ color: 'var(--ok-ink)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 30 }}>✓</span>Moins d'un an de chômage restant<span className="tiny" style={{ fontWeight: 400 }}>ou une longue pause après l'ouverture des droits</span>
          </Box>
          <Box bg="var(--warn-bg)" style={{ color: 'var(--warn-ink)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 30 }}>?</span>Beaucoup de chômage restant et des contrats réguliers<span className="tiny" style={{ fontWeight: 400 }}>c'est le cas à calculer</span>
          </Box>
        </div>
      );
    case 8:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', width: 'min(100%, 520px)' }}>
          <div style={{ position: 'relative', width: '100%', height: 70, borderRadius: 12, background: 'var(--card-2)', overflow: 'hidden' }}>
            <div className="anim-slide" style={{ position: 'absolute', top: 10, bottom: 10, left: 10, width: '60%', border: '3px solid var(--ink)', borderRadius: 10, background: 'rgba(232,118,43,.12)' }} />
            {[[6, 7, 'var(--int-3)'], [20, 5, 'var(--int-2)'], [33, 9, 'var(--int-4)'], [50, 6, 'var(--int-3)'], [64, 8, 'var(--int-2)'], [82, 6, 'var(--int-3)']].map(([l, w, c]) => (
              <div key={String(l)} style={{ position: 'absolute', top: 24, left: `${l}%`, width: `${w}%`, height: 22, borderRadius: 5, background: String(c) }} />
            ))}
          </div>
          <span className="small muted">Le cadre = les 12 derniers mois. Il avance : les vieux contrats en sortent.</span>
          <strong style={{ fontSize: 64, lineHeight: 1 }}>507 h</strong>
        </div>
      );
    case 9:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {['{ code ouvert }', '♥ gratuit', '⇄ à partager'].map((t, i) => (
              <Box key={t} bg={i === tick % 3 ? 'var(--int)' : 'var(--card-2)'} style={{ transition: 'background .4s', fontSize: 18 }}>{t}</Box>
            ))}
          </div>
          <span className="small muted" style={{ maxWidth: 360, textAlign: 'center' }}>Aucun compte, aucune publicité, aucune donnée envoyée.</span>
        </div>
      );
    default:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 'min(100%, 460px)' }}>
          <div style={{ height: 170, border: '2px dashed var(--line)', borderRadius: 16, display: 'grid', placeItems: 'center', textAlign: 'center', fontSize: 13, padding: 10 }} className="muted">[Capture annotée « Mon espace » France Travail : jours restants entourés, date en dessous]</div>
          <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
            <li>Connectez-vous sur francetravail.fr ou l'appli « Mon espace ».</li>
            <li>Page d'accueil : <strong>nombre de jours restants</strong> et sa date.</li>
            <li>Dernier relevé de situation › « Informations sur vos droits » : <strong>allocation brute d'un montant journalier</strong> (pas le montant versé, déjà diminué de la retraite complémentaire).</li>
          </ol>
        </div>
      );
  }
}

/** Petite horloge partagée par une animation. */
function useTicker(ms: number, max: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x + 1) % max), ms);
    return () => clearInterval(id);
  }, [ms, max]);
  return t;
}

const fmtE = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} €`;

/** Étape 1 : la situation, en 3 temps qui s'allument l'un après l'autre. */
function IntroStory() {
  const t = useTicker(1300, 5);
  const on = (i: number) => (t >= i ? 1 : 0.25);
  const card: React.CSSProperties = { borderRadius: 18, padding: '16px 18px', fontWeight: 800, transition: 'opacity .5s, transform .5s', textAlign: 'center' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 'min(100%, 460px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
        <div style={{ ...card, flex: 1, background: 'var(--chom-bg)', color: 'var(--chom-ink)', opacity: on(0) }}>
          <div className="jar" style={{ width: 70, height: 100, margin: '0 auto 8px', borderColor: 'var(--chom-ink)' }}><i className="anim-drain" style={{ background: 'var(--chom)' }} /></div>
          Chômage classique
        </div>
        <span style={{ fontSize: 28, opacity: on(1), transition: 'opacity .5s' }}>+</span>
        <div style={{ ...card, flex: 1, background: 'var(--int-bg)', color: 'var(--int-ink)', opacity: on(1), transform: t >= 1 ? 'none' : 'translateY(8px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 14px)', gap: 4, justifyContent: 'center', margin: '8px 0 14px' }}>
            {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ width: 14, height: 14, borderRadius: 3, background: i % 3 === 1 ? 'var(--int-4)' : 'var(--int-2)', opacity: t >= 1 ? 1 : 0, transition: `opacity .3s ${i * 0.08}s` }} />)}
          </div>
          Contrats d'intermittent
        </div>
      </div>
      <svg width="40" height="34" viewBox="0 0 40 34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ opacity: on(2), transition: 'opacity .5s' }}><path d="M20 2v26M10 18l10 10 10-10" /></svg>
      <div style={{ ...card, width: '100%', background: t >= 3 ? 'var(--ok-bg)' : 'var(--card-2)', color: t >= 3 ? 'var(--ok-ink)' : 'var(--ink)', opacity: on(2), transform: t >= 3 ? 'scale(1.04)' : 'none', fontSize: 20 }}>
        {t >= 3 ? 'Le droit d’option : quand basculer ?' : 'Devenir intermittent·e…'}
      </div>
    </div>
  );
}

/** Étape 3 : le capital baisse mois par mois, comme dans la vraie vie. */
function CapitalDrain() {
  const months: [string, number][] = [['Janvier', 31], ['Février', 28], ['Mars', 31], ['Avril', 30], ['Mai', 31], ['Juin', 30], ['Juillet', 31], ['Août', 31]];
  const t = useTicker(1500, months.length + 2);
  const k = Math.min(t, months.length);
  let days = 340;
  const done = months.slice(0, k).map(([m, n]) => {
    const paid = Math.min(n, days);
    days -= paid;
    return { m, n: paid, eur: paid * 48.7 };
  });
  const cap = days * 48.7;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap', justifyContent: 'center', width: 'min(100%, 560px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="jar"><i style={{ background: 'var(--chom)', height: `${(days / 340) * 92}%`, transition: 'height .8s ease' }} /></div>
        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtE(cap)}</strong>
        <span className="tiny muted">{days} jours restants</span>
      </div>
      <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="tiny muted" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>Chaque mois, France Travail verse…</span>
        {done.slice(-5).map((x, i, arr) => (
          <div key={x.m} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderRadius: 10, background: i === arr.length - 1 ? 'var(--chom-bg)' : 'var(--card-2)', animation: i === arr.length - 1 ? 'drop .4s ease both' : undefined }}>
            <strong>{x.m}</strong><span className="small">− {x.n} jours</span><strong style={{ color: 'var(--chom-ink)', fontVariantNumeric: 'tabular-nums' }}>{fmtE(x.eur)}</strong>
          </div>
        ))}
        {!done.length && <div className="small muted" style={{ padding: '8px 12px' }}>Capital de départ : 340 jours × 48,70 € = {fmtE(340 * 48.7)}</div>}
      </div>
    </div>
  );
}

/** Étape 4 : les jours travaillés (✕) font baisser ce qui est versé… mais le capital, lui, ne bouge pas ces jours-là. */
function PauseCalendar() {
  const worked = new Set([2, 3, 4, 5, 6, 13, 14, 20, 21, 22, 27, 28]);
  const t = useTicker(260, 40);
  const day = Math.min(t, 30);
  let x = 0;
  for (let d = 1; d <= day; d++) if (worked.has(d)) x++;
  const paid = (30 - x) * 48.7;
  const base = new Date(Date.UTC(2027, 4, 12));
  const end = new Date(base.getTime() + x * 86_400_000);
  const label = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 'min(100%, 500px)' }}>
      <div className="kv"><strong>Novembre</strong><span className="small muted">{x} jour{x > 1 ? 's' : ''} travaillé{x > 1 ? 's' : ''} ✕</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: 4 }}>
        {Array.from({ length: 30 }, (_, i) => {
          const d = i + 1;
          const isDone = d <= day;
          const w = worked.has(d);
          return (
            <div key={d} style={{ aspectRatio: '1', borderRadius: 6, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, transition: 'background .2s',
              background: isDone ? (w ? 'var(--int)' : 'var(--chom-bg)') : 'var(--card-2)', color: isDone && w ? '#16202c' : 'var(--muted)', outline: d === day ? '2px solid var(--ink)' : 'none' }}>
              {isDone && w ? '✕' : d}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="kv small"><span style={{ fontWeight: 700, color: 'var(--chom-ink)' }}>Chômage versé ce mois</span><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtE(paid)}</strong></div>
        <div style={{ height: 14, borderRadius: 99, background: 'var(--chom-bg)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${((30 - x) / 30) * 100}%`, background: 'var(--chom)', borderRadius: 99, transition: 'width .25s' }} /></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="kv small"><span style={{ fontWeight: 700 }}>Capital : jours gardés</span><strong>+ {x} jours · {fmtE(x * 48.7)}</strong></div>
        <div style={{ position: 'relative', height: 14, borderRadius: 99, background: 'var(--card-2)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, width: '70%', background: 'var(--chom)', opacity: .35 }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '70%', width: `${(x / 30) * 30}%`, background: 'repeating-linear-gradient(45deg, var(--chom) 0 4px, var(--chom-bg) 4px 8px)', transition: 'width .25s' }} />
        </div>
        <span className="tiny muted">Les jours ✕ ne sont pas versés : ils ne sont pas pris dans le capital, qui reste intact ces jours-là.</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="kv small"><span style={{ fontWeight: 700 }}>Fin de vos droits au chômage</span><strong>{label(end)}</strong></div>
        <div style={{ position: 'relative', height: 14, borderRadius: 99, background: 'var(--card-2)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '62%', background: 'var(--ink)', opacity: .7 }} />
          <div style={{ position: 'absolute', left: '62%', top: 0, bottom: 0, width: `${x * 2.6}%`, background: 'repeating-linear-gradient(45deg, var(--ink) 0 4px, transparent 4px 8px)', opacity: .6, transition: 'width .25s' }} />
        </div>
      </div>
      <span className="tiny muted">Simplifié : en réalité, le nombre de jours non versés dépend de votre salaire (70 % du brut retiré).</span>
    </div>
  );
}

/** Étape 5 : deux réservoirs. Le trait pointillé (capital + 30 %) descend chaque mois ; quand le réservoir orange le dépasse, c'est bon. */
function ThirtyRule() {
  const t = useTicker(1100, 9);
  const m = Math.min(t, 6);
  const caps = [15000, 14200, 13500, 12100, 11000, 10300, 9600];
  const cap = caps[m];
  const seuil = cap * 1.3;
  const inter = 13400;
  const scale = 21000;
  const ok = inter >= seuil;
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet'];
  const h = (v: number) => `${(v / scale) * 100}%`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div className="kv" style={{ gap: 16 }}><strong style={{ fontSize: 18 }}>Fin {months[m]}</strong><span className={`badge ${ok ? 'ok' : 'gap'}`} style={{ fontSize: 14 }}>{ok ? 'Droit d’option possible ✓' : 'Pas encore'}</span></div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div className="jar" style={{ width: 140, height: 230 }}>
            <i style={{ background: 'var(--chom)', height: h(cap), transition: 'height .7s ease' }} />
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: h(seuil), borderTop: '3px dashed var(--chom-ink)', transition: 'bottom .7s ease' }} />
            <span style={{ position: 'absolute', right: 4, bottom: `calc(${h(seuil)} + 4px)`, fontSize: 11, fontWeight: 800, color: 'var(--chom-ink)', transition: 'bottom .7s ease' }}>+30 %</span>
          </div>
          <strong>Chômage restant</strong>
          <span className="small" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtE(cap)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div className="jar" style={{ width: 140, height: 230, boxShadow: ok ? '0 0 0 4px var(--ok-bg)' : 'none', transition: 'box-shadow .4s' }}>
            <i style={{ background: ok ? 'var(--ok)' : 'var(--int)', height: h(inter), transition: 'background .4s' }} />
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: h(seuil), borderTop: '3px dashed var(--ink)', transition: 'bottom .7s ease' }} />
            <span style={{ position: 'absolute', left: 4, bottom: `calc(${h(seuil)} + 4px)`, fontSize: 11, fontWeight: 800, background: 'var(--card)', borderRadius: 6, padding: '0 4px', transition: 'bottom .7s ease' }}>seuil {fmtE(seuil)}</span>
          </div>
          <strong>Droit intermittent</strong>
          <span className="small">{fmtE(inter)} (507 h atteintes)</span>
        </div>
      </div>
      <p className="small" style={{ margin: 0, maxWidth: 440, textAlign: 'center' }}>Le pointillé = votre chômage restant + 30 %. Il descend chaque mois où vous touchez du chômage. Quand le réservoir orange passe au-dessus, le droit d'option est possible.</p>
    </div>
  );
}

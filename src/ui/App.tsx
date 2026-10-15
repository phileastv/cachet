import { APP_NAME, APP_TAGLINE, DONATE_URL, REPO_URL } from '../config';
import { BetaBanner } from './BetaBanner';
import { useStore } from '../state/store';
import { useRoute } from '../state/router';
import { Contracts } from './Contracts';
import { Dashboard } from './Dashboard';
import { HelpPage } from './HelpPage';
import { GitHub, Logo, Plus, Save, Sliders } from './Icons';
import { Onboarding } from './Onboarding';
import { SavePage } from './SavePage';
import { SettingsPage } from './SettingsPage';
import { SupportPage } from './SupportPage';

export function App() {
  const { data } = useStore();
  const route = useRoute().split('?')[0];

  if ((!data.onboarded && route !== '/sauvegarde') || route === '/bienvenue') return <><BetaBanner /><Onboarding /></>;

  let page = <Dashboard />;
  if (route === '/contrats') page = <Contracts tab="intermittence" />;
  else if (route === '/contrats/regime') page = <Contracts tab="regime" />;
  else if (route === '/sauvegarde') page = <SavePage />;
  else if (route === '/parametres') page = <SettingsPage />;
  else if (route === '/aide') page = <HelpPage />;
  else if (route === '/soutenir') page = <SupportPage />;

  return (
    <div className="wrap">
      <BetaBanner />
      <header className="topbar">
        <a className="brand" href="#/"><Logo /><strong>{APP_NAME}</strong><span className="small muted">{APP_TAGLINE}</span></a>
        <nav className="nav" aria-label="Navigation principale">
          <a className="btn primary" href="#/contrats"><Plus />Ajouter / modifier les contrats</a>
          <a className="btn" href="#/aide">Comprendre</a>
          <a className="btn" href="#/sauvegarde"><Save />Sauvegarder</a>
          <a className="btn icon" href="#/parametres" aria-label="Paramètres"><Sliders /></a>
          {DONATE_URL && <a className="btn donate" href={DONATE_URL} target="_blank" rel="noreferrer">♥ Faire un don</a>}
        </nav>
      </header>
      {page}
      <footer className="tiny muted" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <span>Logiciel libre · vos données restent dans votre navigateur · aide au calcul, pas un avis juridique.</span>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {REPO_URL && <a className="btn sm" href={REPO_URL} target="_blank" rel="noreferrer"><GitHub />Code source sur GitHub</a>}
          <a href="#/bienvenue">Revoir l'explication</a>
        </span>
      </footer>
    </div>
  );
}

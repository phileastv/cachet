import { APP_NAME, DONATE_URL, REPO_URL } from '../config';

export function SupportPage() {
  return (
    <>
      <div className="topbar"><h1>Soutenir le projet</h1><a className="btn" href="#/">Tableau de bord</a></div>
      <section className="card" style={{ maxWidth: 760 }}>
        <p style={{ margin: 0 }}>{APP_NAME} est gratuit, sans publicité et open source : son code est public, tout le monde peut vérifier les calculs, les corriger ou les améliorer.</p>
        <p style={{ margin: 0 }}>S'il vous a aidé·e, vous pouvez soutenir le projet par un don, et surtout en parler autour de vous pour que d'autres ne tombent pas dans le piège du droit d'option.</p>
        <div className="nav">
          {DONATE_URL && <a className="btn donate" href={DONATE_URL} target="_blank" rel="noreferrer">♥ Faire un don</a>}
          {REPO_URL && <a className="btn" href={REPO_URL} target="_blank" rel="noreferrer">Code source sur GitHub</a>}
        </div>
      </section>
    </>
  );
}

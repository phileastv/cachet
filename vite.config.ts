import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Site 100 % statique : aucune donnée ne quitte le navigateur.
export default defineConfig(({ mode }) => {
  // Nom et adresse du site, lus dans .env / .env.local pour le titre de la page et le lien canonique
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const name = env.VITE_APP_NAME || 'Cachet';
  const tagline = env.VITE_APP_TAGLINE || "droit d'option intermittent";
  const site = env.VITE_SITE_URL || 'https://cachet.phileas.tv';
  return {
    base: './',
    plugins: [react(), { name: 'app-title', transformIndexHtml: (html) => html.replaceAll('%APP_TITLE%', `${name} · ${tagline}`).replaceAll('%SITE_URL%', site) }],
    server: { port: Number(process.env.PORT) || 5180 },
  };
});

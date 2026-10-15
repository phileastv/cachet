import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { APP_NAME, APP_TAGLINE, SITE_URL } from './src/config';

// Site 100 % statique : aucune donnée ne quitte le navigateur.
export default defineConfig({
  base: './',
  plugins: [react(), { name: 'app-title', transformIndexHtml: (html) => html.replaceAll('%APP_TITLE%', `${APP_NAME} · ${APP_TAGLINE}`).replaceAll('%SITE_URL%', SITE_URL) }],
  server: { port: Number(process.env.PORT) || 5180 },
});

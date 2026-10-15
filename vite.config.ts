import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Site 100 % statique : aucune donnée ne quitte le navigateur.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: Number(process.env.PORT) || 5180 },
});

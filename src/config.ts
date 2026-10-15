/**
 * Configuration de l'outil, lue dans .env (valeurs publiques, versionnées) et .env.local (valeurs locales,
 * jamais versionnées). Les valeurs par défaut ci-dessous servent si une variable manque.
 */
const env = import.meta.env;
const str = (v: unknown, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

/** Nom de l'outil (titre de l'onglet, en-tête, partage, nom des sauvegardes). */
export const APP_NAME = str(env.VITE_APP_NAME, 'Cachet');
/** Sous-titre affiché à côté du nom. */
export const APP_TAGLINE = str(env.VITE_APP_TAGLINE, "droit d'option intermittent");
/** Version courte du nom pour les fichiers (sauvegardes) : minuscules, sans espace ni accent. */
export const APP_SLUG = APP_NAME.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
/** Adresse principale du site, et adresse secondaire (redirigée vers la principale par le .htaccess). */
export const SITE_URL = str(env.VITE_SITE_URL, 'https://cachet.phileas.tv');
export const ALT_URL = str(env.VITE_ALT_URL);
/** Lien de don et dépôt du code source : vides tant qu'ils n'existent pas (les boutons sont alors masqués). */
export const DONATE_URL = str(env.VITE_DONATE_URL);
export const REPO_URL = str(env.VITE_REPO_URL);
declare const __CONTACT_B64__: string;
/**
 * Adresse de contact du bandeau. Elle vient de CONTACT_EMAIL dans .env.local (jamais versionné) et n'est
 * présente qu'encodée dans le site compilé : les robots qui parcourent le code ne la lisent pas en clair.
 */
export const CONTACT_EMAIL = (() => {
  try {
    return typeof __CONTACT_B64__ === 'string' && __CONTACT_B64__ ? decodeURIComponent(escape(atob(__CONTACT_B64__))) : '';
  } catch {
    return '';
  }
})();

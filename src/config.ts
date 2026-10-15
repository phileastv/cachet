/**
 * Nom de l'outil : à changer ici seulement (titre de l'onglet, en-tête, partage, nom des sauvegardes).
 * La clé de stockage du navigateur (persistence.ts) ne dépend pas du nom, pour ne perdre aucune donnée.
 */
export const APP_NAME = 'Cachet';
/** Adresse principale du site, et adresse secondaire (à rediriger vers la principale chez l'hébergeur). */
export const SITE_URL = 'https://cachet.phileas.tv';
export const ALT_URL = 'https://intermittent.phileas.tv';
/** Sous-titre affiché à côté du nom. */
export const APP_TAGLINE = "droit d'option intermittent";
/** Version courte du nom pour les fichiers (sauvegardes) : minuscules, sans espace ni accent. */
export const APP_SLUG = APP_NAME.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** Lien de don (Liberapay, Ko-fi, Open Collective…). Laisser vide tant qu'il n'existe pas. */
export const DONATE_URL = '';

/** Dépôt du code source. Laisser vide tant qu'il n'est pas publié. */
export const REPO_URL = '';

import { APP_SLUG } from '../config';
import { emptyData } from '../domain/demo';
import { DEFAULT_RULES } from '../domain/rules';
import type { AppData } from '../domain/types';

/**
 * Sauvegarde : rien ne part sur un serveur.
 * 1. Sauvegarde automatique dans ce navigateur (localStorage).
 * 2. Export / import d'un fichier .json.
 */
// Clé fixe : elle ne suit pas le nom de l'outil, pour que les données déjà enregistrées restent lisibles.
const KEY = 'bascule:data:v1';

export function loadLocal(): AppData | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLocal(data: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearLocal() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* navigation privée */
  }
}

/** Anciennes sauvegardes : « 30 jours par mois » était la valeur par défaut, pas un choix : on passe en automatique (daté). */
function migrateRules(saved: Partial<AppData['settings']['rules']> | undefined) {
  const r = { ...DEFAULT_RULES, ...(saved ?? {}) };
  if (saved && saved.monthDays === 30) r.monthDays = null;
  return r;
}

export function normalize(input: unknown): AppData {
  const base = emptyData();
  if (!input || typeof input !== 'object') throw new Error('Fichier illisible');
  const d = input as Partial<AppData>;
  if (d.version !== 1) throw new Error('Version de sauvegarde inconnue');
  return {
    ...base,
    ...d,
    profile: { ...base.profile, ...(d.profile ?? {}) },
    settings: { ...base.settings, ...(d.settings ?? {}), rules: migrateRules(d.settings?.rules) },
    contracts: Array.isArray(d.contracts) ? d.contracts.filter((c) => Array.isArray(c.days)) : [],
  };
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportPlain(data: AppData) {
  download(`${APP_SLUG}-sauvegarde-${stamp()}.json`, JSON.stringify(data, null, 2));
}

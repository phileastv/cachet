export type Annexe = '8' | '10';

/** Un contrat d'intermittence (CDDU, cachets…). Les jours sont des dates ISO. */
export interface Contract {
  id: string;
  title: string;
  days: string[];
  /** Heures totales du contrat (1 cachet = 12 h). */
  hours: number;
  /** Salaire brut total du contrat, en euros. */
  gross: number;
  annexe: Annexe;
  /** Contrat pas encore signé : sert à simuler l'avenir. */
  simulated: boolean;
  /** Heures d'enseignement (comptent pour les 507 h, plafonnées, pas pour le montant). */
  teaching?: boolean;
  /** Heures de formation professionnelle assimilées (comptent pour les 507 h, pas pour le montant). */
  training?: boolean;
  /** Contrat fictif généré par un scénario (jamais enregistré). */
  generated?: boolean;
}

/** Ce qu'affiche l'espace France Travail à une date donnée. */
export interface Releve {
  id: string;
  date: string;
  daysLeft: number;
  /** Allocation journalière brute au régime général. */
  dailyAllowance: number;
  /** Salaire journalier de référence (même bloc du relevé). Sert à retirer la participation retraite du reliquat. */
  sjr?: number | null;
}

/** Demande de droit d'option déjà envoyée : sa fin de contrat ne peut plus resservir. */
export interface PriorRequest {
  id: string;
  /** Date d'envoi de la demande. */
  date: string;
  /** Fin de contrat examinée (sinon : la dernière fin de contrat avant la demande). */
  fct?: string | null;
}

/** Période où France Travail n'a rien versé (non inscrit, mois non actualisé, paiement suspendu…). */
export interface UnpaidPeriod {
  id: string;
  from: string;
  to: string;
  reason?: string;
}

export interface Profile {
  releves: Releve[];
  /** Salaire mensuel de référence : plafond du cumul salaire + chômage. Optionnel. */
  monthlyRefSalary: number | null;
  annexe: Annexe;
  over50: boolean;
  /** Délai d'attente de 7 jours déjà appliqué dans les 12 derniers mois (null : on ne sait pas, on le compte). */
  waitingApplied?: boolean | null;
  priorRequests?: PriorRequest[];
  unpaidPeriods?: UnpaidPeriod[];
}

export interface Rules {
  hoursRequired: number;
  threshold: number;
  deductionRate: number;
  lowAllowance: number;
  windowDays: number;
  ajMin: number;
  floor8: number;
  floor10: number;
  intermittentPeriodDays: number;
  teachingCap: number;
  teachingCap50: number;
  /** Plafond enseignement + formation (2/3 de 507 h). */
  assimilatedCap: number;
  /**
   * Jours indemnisables par mois. null = automatique (mensualisation datée : jours du mois avant avril 2025,
   * 30 jours à partir de juillet 2025) ; 0 = jours du mois ; 30 = toujours 30.
   */
  monthDays: number | null;
  /** Délai d'attente (jours), appliqué une fois par période de 12 mois. */
  waitingDays: number;
  /** SMIC horaire brut, pour la franchise salaires intermittente. */
  smicHourly: number;
  /** Participation retraite complémentaire retirée de l'AJ du reliquat (part du SJR). */
  retirementRate: number;
  /** AJ en dessous de laquelle la participation retraite n'est pas retirée. */
  retirementFloor: number;
  /** Part du reliquat versée par l'ARCE (60 % si fin de contrat au 1/07/2023 ou après, 45 % avant). */
  arceRate: number;
  /** Écart au-dessus du seuil sous lequel la marge est jugée trop faible (ex. 0,05 = 5 points). */
  safetyMargin: number;
  /** Plafond de l'allocation journalière intermittente. */
  ajMax: number;
}

export interface Settings {
  rules: Rules;
  /** Pour tester l'appli à une autre date. */
  todayOverride: string | null;
  /** Taux horaire brut utilisé si aucun contrat n'existe encore. */
  fallbackHourlyGross: number;
  /** Apparence : suit le système, ou forcée en clair / sombre. */
  theme: 'auto' | 'light' | 'dark';
}

export interface AppData {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  contracts: Contract[];
  settings: Settings;
  /** Mois (AAAA-MM) pour lequel le rappel de relevé a été masqué. */
  releveReminderDismissed: string | null;
  /** Visites guidées déjà vues (ex. « contrats », « tableau »). */
  toursSeen?: string[];
  /** Jour de la demande choisi à la main dans « Votre plan » (sinon : calculé). */
  requestDayOverride?: string | null;
}

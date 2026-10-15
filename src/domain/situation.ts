import { addMonthsDay, fmtDay, fmtMonth } from './dates';
import { contractEnd, contractStart, type Simulation } from './engine';
import type { ScenarioId, ScenarioResult } from './scenarios';
import type { Contract, Rules } from './types';

/**
 * Lecture de la situation : quel est le vrai sujet pour cette personne ?
 * Chaque cas donne un titre, une explication et les scénarios utiles.
 */
export type SituationKind =
  | 'no-contracts' // aucun contrat saisi
  | 'comfortable' // droit d'option acquis, avec de la marge : la question devient « quand demander ? »
  | 'tight' // possible bientôt, mais l'écart dépasse à peine 30 %
  | 'exhausted' // le chômage s'épuise : ouverture intermittente directe, sans droit d'option
  | 'low-allowance' // allocation < 20 €/jour : seules les 507 h comptent
  | 'later-hours' // possible plus tard ; ce qui bloque aujourd'hui : les heures
  | 'later-gap' // possible plus tard ; ce qui bloque aujourd'hui : l'écart de 30 %
  | 'never-hours' // pas de 507 h sur 12 mois glissants avec le plan actuel
  | 'never-gap' // 507 h, mais le chômage restant reste trop gros
  | 'used'; // la dernière fin de contrat a déjà servi à une demande : il en faut une nouvelle

export interface RequestCandidate {
  day: number;
  lastEnd: number;
  /** Date anniversaire : fin des droits intermittents, 12 mois après la fin de contrat retenue. */
  anniversary: number;
  hours: number;
  sr: number;
  aj: number;
  monthly: number;
  ecart: number | null;
  possible: boolean;
  /** Date déjà passée : on ne peut plus choisir cette fin de contrat-là. */
  past: boolean;
  /** Heures déjà prévues après la fin de contrat retenue : elles compteront pour le renouvellement. */
  nextYearHours: number;
}

export interface Situation {
  kind: SituationKind;
  tone: 'ok' | 'warn' | 'info' | 'bad';
  title: string;
  points: string[];
  recommended: ScenarioId[];
  candidates: RequestCandidate[];
  advice: string | null;
}

const SOON_DAYS = 62;
const COMFORT_MARGIN = 0.1;

/**
 * Dates de demande possibles = lendemain de chaque fin de contrat (jour sans contrat).
 * On donne la toute première date qui ouvrait l'accès à l'intermittence (même passée),
 * puis les prochaines fins de contrat à venir.
 */
export function requestCandidates(sim: Simulation, contracts: Contract[], today: number, rules: Rules, limit = 5): RequestCandidate[] {
  const real = contracts.filter((c) => !c.teaching && !c.training);
  const make = (t: number): RequestCandidate | null => {
    const info = sim.requestInfo(t);
    if (info.lastEnd === null || !info.presumed) return null;
    const anniversary = info.lastEnd + rules.windowDays;
    return {
      day: t, lastEnd: info.lastEnd, anniversary, hours: info.hours, sr: info.sr, aj: info.presumed.aj,
      monthly: info.presumed.monthly, ecart: info.ecart, possible: info.status === 'possible', past: t < today,
      nextYearHours: real.filter((c) => contractStart(c) > info.lastEnd! && contractEnd(c) <= anniversary).reduce((acc, c) => acc + c.hours, 0),
    };
  };
  const isCandidate = (t: number) => sim.isFree(t) && !sim.isFree(t - 1);
  const horizon = Math.min(sim.end, addMonthsDay(today, 12));
  const out: RequestCandidate[] = [];

  // 1. Première date qui donnait accès à l'intermittence (peut être déjà passée)
  for (let t = sim.start + 1; t <= horizon; t++) {
    if (!isCandidate(t)) continue;
    const c = make(t);
    if (c?.possible) {
      if (c.day < today) out.push(c);
      break;
    }
  }
  // 2. Aujourd'hui, si c'est un jour libre (la demande peut partir maintenant)
  if (sim.isFree(today)) {
    const c = make(today);
    if (c) out.push(c);
  }
  // 3. Lendemains des prochaines fins de contrat
  for (let t = today + 1; t <= horizon && out.length < limit; t++) {
    if (!isCandidate(t)) continue;
    const c = make(t);
    if (c) out.push(c);
  }
  return out;
}

const pctTxt = (v: number | null) => (v === null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)} %`);
const months = (days: number) => Math.max(1, Math.round(days / 30.4));

export function diagnose(results: ScenarioResult[], contracts: Contract[], today: number, rules: Rules): Situation {
  const plan = results[0].sim;
  const now = plan.at(today);
  const req = plan.requestDay;
  const base = { candidates: [] as RequestCandidate[], advice: null as string | null };

  if (!contracts.filter((c) => !c.generated).length) {
    return { ...base, kind: 'no-contracts', tone: 'info', title: 'Ajoutez vos contrats d’intermittence', points: ['Sans contrat, impossible de compter vos heures ni d’estimer votre droit intermittent.', 'Commencez par vos contrats des 12 derniers mois, puis ceux déjà prévus (en « simulation »).'], recommended: ['plan'] };
  }

  if (req) {
    const wait = req.day - today;
    const exhausted = req.ecart !== null && !Number.isFinite(req.ecart);
    const low = req.aj > 0 && req.aj <= rules.lowAllowance;

    if (exhausted) {
      const out = plan.months.find((M) => M.start + M.n > today && M.capStartDays >= 1 && M.capEndDays < 1);
      const when = out ? `en ${fmtMonth(out.y, out.m).toLowerCase()}` : `vers le ${fmtDay(req.day)}`;
      return { ...base, kind: 'exhausted', tone: 'info', title: `Votre chômage s’épuise ${when}`, recommended: ['plan', 'habit', 'stop'],
        points: [
          'Vous n’aurez pas besoin du droit d’option : quand le chômage du régime général est épuisé, France Travail examine directement vos droits d’intermittent.',
          `Il faudra alors avoir 507 h sur les 12 derniers mois (vous en aurez ${Math.round(req.hours)}).`,
        ] };
    }

    if (wait <= SOON_DAYS) {
      const candidates = requestCandidates(plan, contracts, today, rules);
      const comfortable = !req.tight && (low || (req.ecart ?? 0) >= rules.threshold + COMFORT_MARGIN);
      if (comfortable) {
        const first = candidates.find((c) => c.possible && !c.past);
        const later = candidates.filter((c) => c.possible && !c.past).slice(-1)[0];
        let advice: string | null = null;
        if (first && (!later || later.day === first.day)) {
          advice = `Votre prochaine date possible est le ${fmtDay(first.day)}, le lendemain de la fin de votre contrat du ${fmtDay(first.lastEnd)}. Ajoutez vos prochains contrats (même en simulation) pour comparer plusieurs dates et voir combien d’heures compteront déjà pour l’an prochain.`;
        } else if (first && later && later.day !== first.day) {
          const gain = later.monthly - first.monthly;
          const d = plan.requestInfo(first.day).presumed?.detail;
          const capped = d && d.hOver > 0 && d.srOver > 0;
          advice = capped
            ? `Attendre le ${fmtDay(later.day)} ne rapporterait que ${Math.round(gain)} € de plus par mois : vous dépassez déjà ${d.hCap} h et ${d.srCap.toLocaleString('fr-FR')} €, au-delà desquels heures et salaire comptent très peu. Demander plus tôt fait compter vos prochains contrats pour l’an prochain.`
            : `Attendre le ${fmtDay(later.day)} rapporterait environ ${Math.round(gain)} € de plus par mois, mais ces heures ne compteraient plus pour votre renouvellement l’an prochain.`;
        }
        return {
          kind: low ? 'low-allowance' : 'comfortable', tone: 'ok', candidates, advice,
          title: low ? 'Votre allocation est sous 20 €/jour : seules les 507 h comptent' : 'Le droit d’option n’est pas un obstacle pour vous',
          points: [
            low
              ? `Vous avez ${Math.round(req.hours)} h sur 12 mois : la règle des 30 % ne s’applique pas à vous.`
              : `Vous avez ${Math.round(req.hours)} h sur 12 mois et votre droit intermittent dépasse de ${pctTxt(req.ecart)} votre chômage restant (il faut 30 %).`,
            'La vraie question est donc : à quelle date faire la demande ? Elle fixe le début de vos droits d’intermittent, la fin de contrat qui sert de référence et votre date anniversaire (12 mois plus tard).',
            'Les heures faites après cette fin de contrat ne servent pas à ce droit-ci : elles commencent votre compteur pour le renouvellement de l’an prochain.',
          ],
          recommended: ['plan', 'habit'],
        };
      }
      return {
        ...base, kind: 'tight', tone: 'warn', candidates,
        title: `Possible le ${fmtDay(req.day)}, mais de justesse`,
        points: [
          `L’écart prévu est de ${pctTxt(req.ecart)}, à peine au-dessus des 30 % exigés : une petite erreur de salaire brut ou d’allocation peut faire refuser la demande.`,
          'Vérifiez vos salaires bruts sur chaque attestation employeur (AEM) et votre allocation sur le dernier relevé.',
          'Laisser passer un mois où le chômage est versé fait baisser votre capital et augmente la marge.',
        ],
        recommended: ['plan', 'minus', 'alt', 'stop'],
      };
    }

    const hoursNow = now.hours;
    const blockedByHours = hoursNow < rules.hoursRequired;
    return {
      ...base, kind: blockedByHours ? 'later-hours' : 'later-gap', tone: 'info',
      title: `Droit d’option possible le ${fmtDay(req.day)}, dans ${months(req.day - today)} mois`,
      points: blockedByHours
        ? [`Aujourd’hui il vous manque ${Math.ceil(rules.hoursRequired - hoursNow)} h pour atteindre 507 h sur 12 mois.`, 'Vos contrats prévus vous y amènent : les scénarios ci-dessous montrent comment avancer la date (plus d’heures, cours, formation).']
        : [`Vous avez déjà ${Math.round(hoursNow)} h, mais votre chômage restant est encore trop élevé : l’écart n’est que de ${pctTxt(now.ecart)} (il faut 30 %).`, 'Chaque contrat met le chômage en pause : c’est le « serpent qui se mord la queue ». Ralentir un peu laisse le capital baisser plus vite.'],
      recommended: blockedByHours ? ['plan', 'plus', 'sprint', 'cours', 'formation'] : ['plan', 'minus', 'alt', 'stop', 'arce'],
    };
  }

  if (now.status === 'used') {
    return {
      ...base, kind: 'used', tone: 'bad', title: 'Il faut une nouvelle fin de contrat',
      points: ['Votre dernière fin de contrat a déjà servi à une demande de droit d’option : France Travail ne la réexamine pas.', 'Une nouvelle demande sera possible après la fin de votre prochain contrat, si les conditions sont remplies à ce moment-là. Ajoutez vos prochains contrats (même en simulation) pour voir quand.'],
      recommended: ['plan', 'habit'],
    };
  }
  if (plan.maxHours < rules.hoursRequired) {
    return {
      ...base, kind: 'never-hours', tone: 'bad', title: 'Avec vos contrats actuels, vous n’atteignez pas 507 h',
      points: [`Au mieux ${Math.round(plan.maxHours)} h sur 12 mois glissants dans les mois à venir.`, 'Ajoutez les contrats déjà prévus, ou regardez ce que donneraient plus d’heures, des cours ou une formation.'],
      recommended: ['plan', 'habit', 'plus', 'sprint', 'cours', 'formation'],
    };
  }
  return {
    ...base, kind: 'never-gap', tone: 'bad', title: 'Vous avez les heures, mais votre chômage restant est trop gros',
    points: [`L’écart reste sous 30 % sur les 12 prochains mois (aujourd’hui : ${pctTxt(now.ecart)}).`, 'Pour que le droit d’option devienne possible, il faut que votre capital baisse : moins de contrats certains mois, un mois sur deux, ou arrêter un temps. L’ARCE est une solution radicale.'],
    recommended: ['plan', 'minus', 'alt', 'stop', 'arce'],
  };
}

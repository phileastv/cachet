# Bascule · calculateur du droit d'option intermittent

Vous êtes au chômage au régime général et vous voulez devenir intermittent·e du spectacle ?
Bascule calcule **si** et **quand** vous pourrez demander le *droit d'option*, mois par mois,
et compare plusieurs stratégies (arrêter de travailler, sprint, un mois sur deux, ARCE, cours…).

- **100 % dans le navigateur** : aucune donnée n'est envoyée à un serveur. Site statique.
- **Sauvegarde** : automatique dans le navigateur (localStorage) + export/import d'un fichier `.json`,
  éventuellement chiffré par mot de passe (AES-256-GCM, PBKDF2, via Web Crypto).
- **Logiciel libre** (AGPL-3.0-or-later).

> Aide au calcul, pas un avis juridique. Les règles sont paramétrables (Paramètres) : si la
> réglementation change, corrigez la valeur et ouvrez une issue ou une PR.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5180
npm test         # tests du moteur de calcul
npm run build    # site statique dans dist/
```

## Règles implémentées

| Règle | Où | Source |
|---|---|---|
| Chômage du mois = jours indemnisables × AJ brute − 70 % du salaire brut, jours payés arrondis à l'entier le plus proche, plafonné (SJR × 30,42) ; jours non versés reportés | `src/domain/engine.ts` | Unédic, fiche « Cumul allocation / salaire » (2025) |
| Mensualisation datée : jours du mois jusqu'au 31/03/2025, 30 jours si le mois n'a aucun contrat d'avril à juin 2025, 30 jours depuis le 1/07/2025 | `rules.ts` | Circulaire Unédic 2025-03, fiche 5 |
| Reliquat tenu en **jours entiers** (compteur France Travail), ancré sur la date « au » du relevé, valorisé à l'AJ du mois ; périodes sans indemnisation saisissables | `engine.ts` | Relevés de situation |
| 507 h d'annexes 8/10 sur les 365 jours (au jour près) précédant la **dernière fin de contrat** ; cours et formation pour les 507 h seulement, pas pour la partie B de l'AJ ; annexe choisie sur cette période | `engine.ts` | Guide France Travail « Intermittents du spectacle » ; circulaire Unédic 2018-04 |
| Droit d'option : 507 h **et** (montant global intermittent ≥ reliquat + 30 % **ou** AJ ≤ 20 €) ; demande un jour sans contrat ; une fin de contrat déjà examinée ne resert pas ; alerte « de justesse » sous 30 % + 5 points | `engine.ts` | Annexes VIII/X art. 26 §2 ; courrier de refus France Travail |
| Montant global intermittent = [365 − jours depuis la fin de contrat − délai d'attente (7 j, sauf s'il a déjà été appliqué dans les 12 mois) − franchise congés payés (jours travaillés × 2,5 / 24, 30 au plus) − franchise salaires] × AJ brute | `engine.ts`, `rules.ts` | Pôle emploi, compte rendu du CESI du 26/02/2020 ; flyer France Travail « Franchises » |
| Reliquat comparé = jours restants × (AJ brute − 3 % du SJR) quand le SJR est saisi | `rules.ts` | Annexes VIII/X art. 26 §2 → règlement général art. 14 à 19 |
| AJ intermittente = A + B + C (annexe 8 / 10), tronquée au centime, planchers 38 € / 44 €, plafond 174,80 € | `rules.ts` | Unédic, annexes 8 et 10 ; contrôlé sur deux AJ réelles (60,48 € et 57,71 €) |
| Heures d'enseignement plafonnées (70 h, 120 h à 50 ans et plus) | `engine.ts` | francetravail.fr/spectacle |
| ARCE : part du reliquat (60 % si fin de contrat au 1/07/2023 ou après, 45 % avant — paramètre), arrêt du versement mensuel | `engine.ts` | Décret 2023-33 |

Limites connues : plafond mensuel de 208 h, salaires hors spectacle (« déduits seulement »), carence et
différés du régime général, module d'indemnisation intermittente après l'ouverture, neutralisation maladie
et heures de formation non modélisés (documentés dans « Comprendre »).

## Architecture

```
src/domain/   moteur pur, testé (dates, règles, simulation, scénarios, données d'exemple)
src/state/    store React, routage par #, persistance locale et chiffrée
src/ui/       écrans : onboarding, tableau de bord, contrats, sauvegarde, paramètres, aide
```

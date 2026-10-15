# Fin des AEM et conséquences pour Cachet (état au 7 octobre 2026)

Convention de citation :
- **[O…]** : source officielle (France Travail, Unédic, GIP-MDS/net-entreprises, Légifrance, ministères).
- **[G1]** : organisme gestionnaire non étatique (Audiens).
- **[A…]** : éditeur de paie, presse, blog, association ou syndicat.

Toutes les URL sont listées en fin de document.

## 1. Ce qui change concrètement

- **Le principe (certitude haute).** Les employeurs du cinéma-spectacle cessent de produire l'AEM. Ils déclarent les contrats de leurs intermittents dans la DSN, qu'ils utilisent déjà pour les contributions chômage depuis janvier 2022 [O13]. À partir de cette DSN, France Travail produit une « Attestation employeur pour les activités relevant des annexes 8 et 10 ». C'est un modèle Unédic, « à signer par l'employeur et à remettre au salarié » [O1][O4].
- **Le nom du document.** France Travail emploie deux sigles :
  - « AE-CS » sur les pages destinées aux salariés et dans le flyer [O1][O2][O3] ;
  - « AER CS (Attestation Employeur Rematérialisée Cinéma Spectacle) » sur une page destinée aux employeurs [O5].
  « AER CS » n'est donc pas seulement un terme d'éditeur. Cachet doit reconnaître les trois formes : AE-CS, AER CS et AE CS.
- **Le calendrier officiel (certitude moyenne).**
  - L'expérimentation a commencé en juillet 2025 [O8][O9].
  - France Travail annonce un déploiement « par vagues jusqu'à fin mars 2027 », avec coexistence des AEM et des AE-CS d'ici là [O1][O2][O3]. Ce n'est pas janvier 2027, comme le dit l'article Movinmotion.
  - L'Unédic écrit « bascule complète prévue début 2027 » [O10].
  - Chaque employeur bascule séparément, sur autorisation de France Travail [O8]. Aucune liste des vagues n'est publiée. Au CESI de mars 2026, 17 000 contrats avaient déjà été déclarés en DSN [O18].
- **Les calendriers non officiels se contredisent.**
  - Janvier 2027 [A1][A2] ; fin 2026 [A3] ; « objectif 2026 » [A4].
  - Selon un éditeur de paie, les employeurs pilotes sont passés en production le 1er juin 2026 [A5].
  - L'échéance a déjà glissé : en 2023, l'Unédic visait 2024 [O11]. Il faut retenir **fin mars 2027 comme cible, sans garantie**.
- **L'AEM reste en service.**
  - Elle reste obligatoire pour les employeurs qui n'ont pas basculé, avec un dépôt avant le 15 du mois suivant.
  - Depuis le 20/07/2026, il faut un compte entreprise certifié pour y accéder [O6][O7].
  - Le cahier technique DSN 2027.1.2 (09/09/2026) garde les motifs d'exclusion 05/06, « contrat faisant l'objet d'une AEM » [O12]. La coexistence durera donc probablement au-delà de mars 2027.
- **Le périmètre.**
  - Le Guso n'est pas concerné : la DUS ne change pas et le salarié reçoit toujours une AME mensuelle [O1][O14].
  - Les bulletins de paie ne changent pas [O1].
  - Le certificat d'emploi Congés Spectacles passe déjà par la DSN [O15] et reste remis au salarié [G1]. Le maintien des « bordereaux » n'est affirmé que par [A1].
- **La base juridique.** Je n'ai trouvé aucun décret ni arrêté sur cette bascule, et il n'en faut pas. Le modèle d'attestation est fixé par l'Unédic (art. R.1234-10 du Code du travail) [O16]. La DSN vaut fourniture des éléments de l'attestation (art. R.133-14 du Code de la sécurité sociale) [O17].
- **Deux changements de fond.**
  - Pour le cumul ARE/salaire, la DSN retient la rémunération brute non plafonnée, et non plus les sommes soumises à contributions [O18]. On ne sait pas si le SJR est aussi concerné.
  - Pour les arrêts maladie, c'est désormais l'arrêt déclaré par l'employeur en DSN qui compte, à raison de 5 h par jour [O19][O5].

## 2. Le salarié aura-t-il un document simple et standardisé ?

**Pas de façon garantie.** Le meilleur candidat est l'AE-CS. Mais le salarié ne peut pas la récupérer lui-même, et sa mise en page n'est publiée nulle part.

- **Ce qui joue en faveur de l'AE-CS.** Un seul émetteur (France Travail), un modèle Unédic unique, et un PDF généré automatiquement. Sa mise en page devrait donc être bien plus stable que celle des bulletins de paie.
- **Ce qui la limite.**
  - **Remise.** L'employeur la remet signée, « uniquement à la fin du contrat » [O1][O2]. Il la télécharge sur son tableau de bord DSN : une archive `AER_MENSUELLE_…zip`, code retour 46 [O20]. Le canal vers le salarié dépend de l'employeur : portail de l'éditeur de paie, Digiposte, etc. [A5][A6].
  - **Accès par le salarié.** Aucune source officielle ne dit qu'elle sera téléchargeable dans l'espace France Travail. France Travail précise seulement qu'il est inutile de la lui envoyer, car elle est « déjà enregistrée dans votre dossier » [O1]. Selon [A3], elle ne serait « vraisemblablement » pas dans « Mes attestations ».
  - **Fréquence.** L'Unédic a validé deux modèles [O20][O11][O21] :
    - « mono-contrat », pour un contrat de plus de 30 jours ou après un signalement de fin de contrat (FCTU) ;
    - « multi-contrats », pour les CDD d'usage déclarés en circuit dérogatoire, produit après chaque DSN mensuelle.
    - En pratique, cela donnerait pour les contrats courts une AE-CS par employeur (par SIRET) et par mois, qui regroupe N contrats [A1]. Pour un contrat long, une seule AE-CS à la fin, et rien d'autre que les bulletins entre-temps.
    - Aucun texte de 2026 ne confirme cette lecture.
  - **Champs.** Il n'existe aucun spécimen public. La table de correspondance DSN → AE-CS, annoncée « à venir » en 2023, n'a jamais été publiée [O20]. Le contenu probable se déduit des données DSN [O8][O12] :
    - employeur et SIRET ;
    - dates du contrat ;
    - jours (unité 12, obligatoire pour chaque contrat) ;
    - heures (unité 35) ou cachets (unités 36, 37 ou 39) ;
    - « salaire brut servant au calcul des droits » (rémunération de type 002) ;
    - numéro d'objet et emploi (code PCS-ESE).
  - **Annexe 8 ou 10.** Ce n'est pas un champ de la DSN. Elle se déduit :
    - du code PCS et de son complément ART : codes 354a à 354f → artistes, annexe 10 ; codes 637c et 465b → techniciens, annexe 8 [O20] ;
    - et de la convention collective (IDCC) [A7].
  - **Mention « spécimen ».** Elle aurait figuré sur les attestations pendant les pilotes [A4][A8]. Aucune source officielle ne le confirme.
- **L'espace France Travail.**
  - « Mes 2 dernières années » se consulte seulement. On y voit les périodes reçues : dates, employeur, motif de rupture, heures. Ni salaire, ni export [O22][O2].
  - « Mes attestations » ne concerne que l'indemnisation [O23].
  - Côté droits, la notification indique l'AJ, la date de début et la date anniversaire [O24].
  - Pour le droit d'option, France Travail envoie un tableau comparatif. Il faut répondre sous 21 jours et le choix est irrévocable [O25]. Le format de ce tableau n'est pas public.
- **Les autres canaux.**
  - mesdroitssociaux.gouv.fr : 12 derniers mois, montant net social, aucun export [O26].
  - info-retraite.fr : relevé de carrière annuel [O27].
  - Audiens : attestation de paiement Congés Spectacles annuelle [G1].
- **Les API ne sont pas accessibles à Cachet.**
  - France Travail Connect, API « Expériences déclarées par l'employeur » : elle renvoie les dates, la quantité de travail et l'employeur, mais ni salaire, ni cachets, ni annexe. L'échange du jeton exige un serveur avec un `client_secret`, localhost est interdit, et l'accès passe par un audit [O28][O29].
  - API « Indemnisations » : elle ne renvoie que deux booléens [O30].
  - API Particulier et FranceConnect ne sont pas ouverts à un outil privé comme Cachet [O31][O32].
- **Le bulletin de paie.**
  - Il existe toujours, mais seule la partie basse est normalisée : à partir de « MONTANT BRUT », les cotisations, le net social et le net à payer.
  - La partie haute (période, heures, cachets, éléments de salaire) est de présentation libre [O33][O35].
  - L'équivalence horaire du cachet n'a pas à y figurer [O34]. L'annexe n'est pas obligatoire non plus, contrairement à ce qu'affirme [A9].
  - Deux maquettes légales coexistent jusqu'au 31/12/2026 [O36].
  - Le code du travail exige un « format structuré » pour les bulletins électroniques, sans définir de schéma. En pratique, c'est un PDF [O37].

## 3. Conséquences pour Cachet

**Faut-il faire de l'AEM la source principale ? Non. Mais c'est le bon premier format à importer.**
- Elle couvre l'essentiel de l'historique 2025-2026 et suit un modèle Unédic unique.
- Les nouvelles AEM disparaîtront vers le printemps 2027. La période de référence de 12 mois les gardera pourtant utiles jusqu'en 2028 environ.

Le centre du système doit être un modèle de période normalisé. Chaque format de document n'est qu'un adaptateur vers ce modèle :

```ts
type Source = 'AEM' | 'AE_CS' | 'BULLETIN' | 'GUSO_AME' | 'SAISIE';
type Origine = 'lu' | 'deduit' | 'saisi' | 'corrige';
interface PeriodeEmploi {
  employeur: { nom: string; siret?: string }; numeroObjet?: string;
  debut: string; fin: string; joursTravailles?: string[]; moisRattachement: string; // AAAA-MM
  heures?: number; cachets?: number;                 // valeurs brutes, jamais converties ici
  brut?: number; baseAC?: { montant: number; nature: 'soumis_AEM' | 'dsn_type002' | 'inconnue' };
  annexe?: 8 | 10;
  provenance: { source: Source; docHash?: string; gabarit?: string;
                champs: Partial<Record<keyof PeriodeEmploi, Origine>> };
  statut: 'brouillon' | 'valide' | 'conflit';
}
interface EtatDroitsFT {                                // vérité terrain France Travail
  source: 'notification' | 'tableau_comparatif' | 'mes_2_ans' | 'saisie';
  dateAnniversaire?: string; ajBrute?: number; sjr?: number;
  joursRestants?: number; joursPayesParMois?: Record<string, number>;
}
```

- **Un document donne de 0 à N périodes.**
  - AEM : un employeur, un mois.
  - AE-CS multi-contrats : N contrats.
  - Bulletin : une période de paie, qui peut couvrir plusieurs contrats.
- **La provenance est suivie champ par champ** : lu, déduit, saisi ou corrigé. On garde aussi l'empreinte du document et la version du gabarit, et l'interface les affiche.
- **Les données brutes restent séparées des règles de calcul.**
  - Heures et cachets sont stockés tels quels.
  - Les heures retenues sont calculées par un module de règles versionné : 12 h par cachet, plafond de 28 cachets par mois [O38][O39].
  - Le brut et la base de contributions sont stockés séparément, avec la nature de la base, car cette base change avec la DSN [O18].
  - L'annexe est déduite (code PCS, emploi) puis confirmée par l'utilisateur.
- **Aucune fusion ne se fait en silence.**
  - Clé de rapprochement : SIRET (ou nom normalisé) + numéro d'objet + dates.
  - Ordre de priorité : attestation employeur (AE-CS, AEM), puis bulletin, puis saisie.
  - Toute divergence passe en statut « conflit ». Des écarts entre AEM et DSN sont déjà signalés chez certains employeurs [A10].
- **France Travail sert de vérité terrain.**
  - AJ, SJR, jours restants et jours payés par mois sont saisis depuis la notification, le tableau comparatif ou les paiements.
  - « Mes 2 dernières années » sert à vérifier qu'aucune période ne manque, d'un côté comme de l'autre.
  - Cachet affiche son propre calcul à côté de celui de France Travail et signale l'écart.
- **Les importeurs sont des plugins.**
  - Interface : `detect(texte) → score`, puis `parse(texte) → périodes + alertes`.
  - Signature de l'AE-CS : « annexes 8 et 10 » + « R.133-14 » dans l'en-tête [O4].
  - Chaque importeur a ses fixtures anonymisées et ses tests de non-régression.
  - Si le format est inconnu ou porte la mention « spécimen », l'import n'échoue jamais en silence : il ouvre un formulaire prérempli, avec le texte extrait affiché à côté.
- **Les données restent locales et portables.** Tout reste dans le navigateur. Un export/import JSON avec `schemaVersion` permet aux données de survivre aux changements de format.

**Priorités d'implémentation**
1. Une saisie assistée solide : périodes, Guso/AME, report depuis « Mes 2 dernières années », et saisie de l'`EtatDroitsFT`. C'est le seul chemin qui couvre tous les cas.
2. L'import des PDF d'AEM.
3. L'import des AE-CS, dès qu'on aura réuni 3 à 5 vrais spécimens anonymisés (mono et multi-contrats). Le modèle de données doit dès maintenant accepter N périodes par document.
4. Les bulletins : extraction du texte avec pdf.js et suggestions (« MONTANT BRUT », numéro d'objet, période), toujours validées par l'utilisateur. Un gabarit par éditeur seulement si la demande le justifie. Les scans restent en saisie manuelle.
5. À écarter : France Travail Connect, API Particulier et FranceConnect.

## 4. Questions ouvertes à surveiller

- **Un vrai spécimen d'AE-CS.** Quels champs ? Y a-t-il une couche texte ? Un identifiant AER visible, utile pour dédoublonner ? L'annexe est-elle affichée ? Le montant indiqué est-il le brut ou la base de contributions ?
- **La règle d'émission réelle.** En fin de contrat, ou chaque mois par SIRET ? Le seuil de 30 jours s'applique-t-il toujours ?
- **La fin effective des AEM.** Calendrier des vagues, mise à jour du cahier technique DSN (codes 05/06), éventuelle circulaire Unédic.
- **La base « brut non plafonné ».** S'applique-t-elle aussi au salaire de référence et au SJR ?
- **L'espace France Travail.** L'AE-CS y deviendra-t-elle téléchargeable ? « Mes 2 dernières années » affichera-t-il un jour les salaires et les cachets ?
- **Le tableau comparatif du droit d'option.** Son format est inconnu. Avec un émetteur unique, c'est un bon candidat à l'import.
- **Le Guso.** Une bascule est-elle prévue plus tard ? Le format de l'AME va-t-il évoluer ?
- **Le renvoi « R.133-14 II 1° » de l'en-tête.** Il ne correspond pas à la structure actuelle de l'article (alinéa IV 2°) [O17] : coquille ou autre version ?
- **Le prorata des 28 cachets pour un mois incomplet.** La formule est à revérifier sur le texte intégral de l'annexe X avant de la coder [O39].
- **Pages à surveiller :** [O1], [O6], [O8], [O12] et les circulaires Unédic.

## Sources

**Officielles**
- [O1] France Travail, « Intermittents du spectacle : ce qui change pour vos déclarations avec la DSN », publiée le 22/09/2026, modifiée le 24/09/2026 : https://www.francetravail.fr/spectacle/spectacle--intermittents/intermittents-du-spectacle-ce-qu.html
- [O2] France Travail, flyer « Version de septembre 2026 » (PDF du 23/09/2026) : https://www.francetravail.fr/files/live/sites/PE/files/spectacle/flyer-dsn-spectacle-2026
- [O3] France Travail, « Quels justificatifs adresser » (métadonnées du 22/09/2026) : https://www.francetravail.fr/spectacle/spectacle--intermittents/justificatif-a-fournir.html
- [O4] En-tête du modèle AE-CS, image non datée, intégrée à [O1] : https://www.francetravail.fr/files/live/sites/PE/files/ae-cs.jpg
- [O5] France Travail employeurs, « Arrêt maladie », publiée le 20/04/2026, modifiée le 24/07/2026 : https://www.francetravail.fr/spectacle/spectacle--employeur-dintermitte/arret-maladie-employeur.html
- [O6] France Travail, « AEM et intermittents du spectacle », publiée le 23/07/2026, modifiée le 28/07/2026 : https://www.francetravail.fr/spectacle/spectacle--employeur-dintermitte/aem-et-intermittents-pectacle.html
- [O7] France Travail, « L'attestation employeur destinée à France Travail », publiée le 13/12/2024, modifiée le 01/09/2026 : https://www.francetravail.fr/employeur/vos-declarations-et-cotisations/la-fin-de-vos-contrats-de-travai/lattestation-employeur-destinee.html
- [O8] GIP-MDS/net-entreprises, fiche DSN 3344, 13/11/2025 : https://net-entreprises.custhelp.com/app/answers/detail_dsn/a_id/3344/
- [O9] Flyer France Travail « juin 2025 » (PDF du 17/06/2025), hébergé par l'éditeur DV-LOG : https://dvlog.fr/pdf/articles/flyer_dsn_ft_a4_juin26.pdf
- [O10] Unédic, « Les intermittents du spectacle couverts par l'assurance chômage en 2025 », 01/09/2026 (lu par un seul vérificateur) : https://www.unedic.org/publications/les-intermittents-du-spectacle-couverts-par-lassurance-chomage-en-2025
- [O11] Unédic, synthèse du Bureau du 13/06/2023, publiée le 21/06/2023 : https://www.unedic.org/actualites/synthese-du-bureau-de-lunedic-du-13-juin-2023
- [O12] GIP-MDS, cahier technique DSN 2027.1.2, 09/09/2026 : https://www.net-entreprises.fr/media/documentation/dsn-cahier-technique-2027.1.pdf
- [O13] Unédic, circulaire 2022-07, 19/05/2022 : https://www.unedic.org/ged/documents/circulars/pdf/PRE-CIRC-Circulaire_n_2022-07_du_19_mai_2022.pdf
- [O14] Guso, brochure (pied de page mars 2026) : https://www.guso.fr/files/live/sites/guso_v2/files/Pdf/Brochure_Guso_fevr2025_web.pdf
- [O15] GIP-MDS, « La simplification apportée par la DSN 2024-2025 », 06/01/2025 : https://www.net-entreprises.fr/media/documentation/fonctionnalites-dsn.pdf
- [O16] Code du travail, art. R.1234-10 : https://code.travail.gouv.fr/code-du-travail/r1234-10
- [O17] Code de la sécurité sociale, art. R.133-14, version du 01/07/2026 : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039222527
- [O18] France Travail, compte rendu du CESI du 13/03/2026 : https://www.francetravail.org/files/live/sites/peorg/files/documents/CESI/2026_compte%20rendu%20CESI%20du%2013032026.pdf
- [O19] France Travail, compte rendu du CESI du 14/01/2025 : https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/2025_compte%20rendu%20CESI%20du%2014%20janvier.pdf
- [O20] GIP-MDS, guide « De la DSN à l'attestation employeur » V3.2, 28/03/2023 : https://www.net-entreprises.fr/media/documentation/correspondances-dsn-ae.pdf
- [O21] Pôle emploi, « Dossier déclarant », août 2021 : https://www.francetravail.fr/files/live/sites/PE/files/fichiers-en-telechargement/fichiers-en-telechargement---emp/Dossier-Declarant.pdf
- [O22] France Travail, « Mes 2 dernières années », février 2024 : https://www.francetravail.fr/files/live/sites/PE/files/masters/spectacle/com7039---passe-professionnel-in
- [O23] France Travail, FAQ « Mes attestations » (non datée) : https://www.francetravail.fr/faq/candidat/ma-recherche-demploi/laccompagnement-par-le-reseau-fr/lespace-personnel/attestation-france-travail.html
- [O24] France Travail, livret « premiers pas », février 2026 : https://www.francetravail.fr/files/live/sites/PE/files/fichiers-en-telechargement/spectacle/Doc_Primo_Entrants.pdf
- [O25] France Travail, Guide intermittents, juillet 2026 : https://www.francetravail.fr/files/live/sites/PE/files/fichiers-en-telechargement/fichiers-en-telechargement---dem/GUIDE-INTERMITTENT.pdf
- [O26] Urssaf, page mise à jour le 25/03/2026 : https://www.urssaf.fr/accueil/salarie/savoir-si-je-suis-bien-declare.html
- [O27] info-retraite (non datée) : https://www.info-retraite.fr/portail-info/sites/PortailInformationnel/home/voir-ma-carriere.html
- [O28] francetravail.io, « Expériences déclarées par l'employeur », modifiée le 31/12/2025 : https://francetravail.io/produits-partages/catalogue/france-travail-connect/experiences-declarees-employeur
- [O29] francetravail.io, OAuth « Authorization Code with PKCE » (non datée) : https://francetravail.io/produits-partages/documentation/utilisation-api-france-travail/authorization-code-with-pkce
- [O30] francetravail.io, « Indemnisations », modifiée le 30/12/2025 : https://francetravail.io/produits-partages/catalogue/france-travail-connect/indemnisations
- [O31] API Particulier, CGU du 17/03/2022 : https://particulier.api.gouv.fr/cgu
- [O32] FranceConnect, éligibilité (non datée) : https://docs.partenaires.franceconnect.gouv.fr/fs/devenir-fs/pilotage-eligibilite/
- [O33] Code du travail, art. R.3243-1, version du 01/01/2024 : https://code.travail.gouv.fr/code-du-travail/r3243-1
- [O34] Ministère de la Culture/DGCA, guide des obligations sociales, février 2016 : https://normandie.dreets.gouv.fr/sites/normandie.dreets.gouv.fr/IMG/pdf/guide_des_obligations_sociales_du_spectacle_vivant_et_enregistre_fevrier_2016_.pdf
- [O35] BOSS, règles du bulletin de paie, mise à jour le 29/09/2025 : https://boss.gouv.fr/portail/accueil/bulletin-de-paie/regles-generales-relatives-au-bu.html
- [O36] Service-public Entreprendre, report du modèle de bulletin (arrêté du 11/08/2025) : https://entreprendre.service-public.gouv.fr/actualites/A18500
- [O37] Code du travail, art. D.3243-8, version du 01/01/2017 : https://code.travail.gouv.fr/code-du-travail/d3243-8
- [O38] Unédic, circulaire 2016-25, 21/07/2016 : https://www.unedic.org/la-reglementation/circulaires/circulaire-no-2016-25-du-21-juillet-2016
- [O39] Annexe X, art. 3, version du 01/07/2024 : https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049820192

**Organisme gestionnaire (non étatique)**
- [G1] Audiens, « Congés Spectacles employeur – Mode d'emploi », avril 2023 : https://www.audiens.org/files/live/sites/siteAudiens/files/03_documents/entreprise/Fiches-techniques/Conges-Spectacles-Mode-d-emploi-employeur.pdf

**Autres (éditeurs, presse, blogs, associations, syndicats)**
- [A1] Movinmotion, éditeur de paie, 01/06/2026 (modifié le 07/08/2026) : https://www.movinmotion.com/blog/actualites-intermittents/intermittent-du-spectacle-la-fin-des-aem/
- [A2] MesCachets, 03/09/2026 : https://www.mescachets.com/aem-intermittent-role-fin-des-aem-et-arrivee-de-laer-cs-en-2027
- [A3] Être Intermittent, 07/05/2026 (modifié le 04/06/2026) : https://www.etreintermittent.com/attestations-aem-aer-cs/
- [A4] AAPCA, association, 22/09/2025 : https://www.aapca.fr/actus-infos.php?id=149
- [A5] DV-LOG/Interpaye, éditeur de paie, 28/05/2026 : https://dvlog.fr/php/article.php?slug=mise-en-production-des-aer-intermittents
- [A6] CFDT FTV, syndicat, 27/09/2026 : https://www.cfdt-ftv.fr/2026/09/27/le-petit-mensuel-des-elus-septembre-2026/
- [A7] SFA-CGT, syndicat, 05/06/2025 : https://sfa-cgt.fr/presse/2226
- [A8] Comenolo, blog (04/06/2026 selon un vérificateur) : https://comenolo.fr/aer-cs-attestation-employeur/
- [A9] Hayot Expertise, cabinet comptable, 03/02/2026 : https://hayot-expertise.fr/blog/paie-intermittent-spectacle-annexes-8-10-cachet-guso-2026
- [A10] DV-LOG, éditeur de paie, 15/01/2026 : https://dvlog.fr/php/article.php?slug=erreur-de-relance-de-france-travail


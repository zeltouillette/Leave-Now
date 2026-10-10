# Feuille de route

Ce document liste les évolutions prévues pour Leave Now. Il est mis à jour au fur et à mesure :
- une case est cochée quand une étape est terminée ;
- les nouvelles idées sont ajoutées dans [Idées à trier](#idées-à-trier) ;
- les décisions importantes sont notées dans le [Journal](#journal).

## Vue d'ensemble

| Phase | Sujet | Difficulté | Prérequis | État |
|---|---|---|---|---|
| 1 | [Langues : anglais et allemand](#phase-1--langues-anglais-et-allemand) | Faible | aucun | À faire |
| 2 | [Retards : affichage plus clair](#phase-2--retards) | Faible | aucun | À faire |
| 3 | [Source des données (API)](#phase-3--source-des-données-api) | Moyenne | aucun | À faire |
| 4 | [Courses supprimées](#phase-4--courses-supprimées) | Moyenne | phase 3 | À faire |
| 5 | [Temps de marche automatique](#phase-5--temps-de-marche-automatique) | Élevée | aucun | À faire |

Les phases sont classées de la plus simple à la plus complexe :
- les phases 1 et 2 s'appuient sur ce qui existe déjà ;
- la phase 3 détermine ce qui est possible pour la phase 4 ;
- la phase 5 est la plus grosse, car elle ajoute la localisation et de nouveaux services.

### Règles pour chaque étape

- La logique va dans `core/` avec ses tests, l'affichage dans `ui/`.
- Aucune bibliothèque externe.
- Tout nouveau texte est ajouté dans `i18n/`, pour toutes les langues.
- Le README est mis à jour si l'utilisation change.
- Le numéro `CACHE` de `sw.js` est incrémenté, et la liste `FILES` est mise à jour si des fichiers sont ajoutés ou supprimés.
- Chaque nouvelle version est testée sur téléphone après sa mise en ligne.

---

## Phase 1 : langues (anglais et allemand)

Le système de langues existe déjà :
- les textes sont dans `i18n/` ;
- la langue du navigateur est choisie automatiquement ;
- un sélecteur apparaît dans les réglages dès que deux langues sont disponibles.

- [ ] Créer `i18n/en.js` et `i18n/de.js` à partir de `i18n/fr.js`.
- [ ] Activer les deux langues dans `LANGUAGES` (`i18n/index.js`) et les ajouter à `FILES` dans `sw.js`.
- [ ] Ajouter un test qui vérifie que chaque langue a exactement les mêmes clés et les mêmes variables (`{n}`, `{name}`, `{p}`) que le français.
- [ ] Vérifier la mise en page avec les textes allemands, souvent plus longs : barre d'avance, boutons, badges des cartes.
- [ ] Faire relire chaque traduction par une personne dont c'est la langue maternelle.
- [ ] Facultatif : traduire le README (`README.en.md`, `README.de.md`).

**Points d'attention**
- Vocabulaire suisse :
  - en allemand, « Gleis » désigne la voie d'un train et « Kante » le quai d'un bus ;
  - en anglais, « platform » couvre les deux.
- Les noms d'arrêts et de destinations viennent de l'API et ne se traduisent pas.
- Le manifeste ne peut porter qu'un seul nom. « Leave Now » convient à toutes les langues.
- L'italien pourra être ajouté plus tard de la même façon.

**Terminé quand** l'application est entièrement utilisable en anglais et en allemand, et que le test des traductions passe.

---

## Phase 2 : retards

Déjà en place :
- le retard annoncé s'affiche en orange (« +3 ») à côté de l'heure prévue, et il est compté dans le calcul ;
- un changement de quai ou de voie s'affiche en orange.

- [ ] Signaler les départs sans temps réel (l'API ne donne alors aucun retard). Une mention discrète « horaire prévu » indique que le compte à rebours n'est pas confirmé par le temps réel.
- [ ] Mettre davantage en évidence les gros retards (seuil à définir, par exemple 5 min).
- [ ] Afficher les départs annoncés en avance sur l'horaire (retard négatif). Cette avance est déjà comptée dans le calcul, mais elle n'est pas indiquée à l'écran.
- [ ] Tests : départ à l'heure, en retard, en avance et sans temps réel.

**Terminé quand** on distingue d'un coup d'œil un départ à l'heure, un départ en retard et un départ sans information en temps réel.

---

## Phase 3 : source des données (API)

**Constat.** L'API actuelle, transport.opendata.ch, reçoit les suppressions de courses dans ses données temps réel. Sa réponse ne contient cependant aucun champ pour les signaler.

**Comparatif** (vérifié le 10.10.2026) :

| API | Clé | Limites | Retards | Suppressions | Remarques |
|---|---|---|---|---|---|
| [transport.opendata.ch](https://transport.opendata.ch/docs.html) (actuelle) | non | pas de limite fixe, mais les appels trop fréquents sont ralentis | oui | non signalées | JSON, accessible depuis le navigateur |
| [search.ch](https://search.ch/timetable/api/help) | non | 10 080 tableaux de départs par jour | oui | à vérifier | JSON, accessible depuis le navigateur, peut changer sans préavis, conditions d'utilisation à lire |
| [OJP 2.0](https://opentransportdata.swiss/en/cookbook/open-journey-planner-ojp-landing-page/) (officielle, opentransportdata.swiss) | oui, gratuite | [50 requêtes/min et 20 000/jour par clé](https://opentransportdata.swiss/en/limits-and-costs/) | oui | oui, à confirmer sur un cas réel | XML, accessible depuis le navigateur |

**Étapes**

- [ ] Observer le comportement actuel lors d'une vraie suppression, en comparant avec l'application CFF un jour de perturbation : le départ disparaît-il, ou reste-t-il affiché comme un départ normal ?
- [ ] Demander aux mainteneurs de transport.opendata.ch d'ajouter un champ « supprimé », par un ticket sur leur dépôt GitHub. C'est la solution la plus simple si elle est acceptée.
- [ ] Tester search.ch sur des suppressions réelles.
- [ ] Séparer le code par fournisseur, par exemple `core/providers/opendata.js` et `core/providers/searchch.js` :
  - chaque fichier renvoie exactement le format de départ actuel, avec en plus le champ `cancelled` ;
  - `core/api.js` choisit le fournisseur.
- [ ] Garder les numéros d'arrêt actuels (par exemple `8570593`). Ce sont les mêmes dans les trois API, donc les réglages enregistrés et les liens de partage restent valables.
- [ ] Écrire des tests à partir de réponses réelles enregistrées pour chaque fournisseur.
- [ ] Décider s'il faut un fournisseur principal avec un secours automatique en cas de panne.

**Point de vigilance pour OJP.** Avec une seule clé partagée par tous les utilisateurs, la clé serait visible dans le code et la limite de 20 000 requêtes par jour serait vite atteinte. Une personne qui suit 2 arrêts consomme environ 160 requêtes par heure d'ouverture de l'appli. Il y a deux solutions :
- chaque utilisateur saisit sa propre clé gratuite dans les réglages ;
- un petit relais garde la clé et met les réponses en cache (par exemple avec l'offre gratuite de Cloudflare Workers). Il faut alors maintenir un serveur, donc cette option n'est à envisager que si les autres ne conviennent pas.

**Terminé quand** changer de fournisseur ne touche qu'un seul fichier, et que le choix est noté dans le journal.

---

## Phase 4 : courses supprimées

Cette phase demande une source qui signale les suppressions (phase 3).

- [ ] `core/` : ajouter le champ `cancelled`. Une course supprimée ne déclenche jamais « Partez ! », et le calcul passe au prochain départ réellement assuré.
- [ ] Affichage : ligne barrée et mention « Supprimé » en rouge, sans compte à rebours, visible jusqu'à l'heure prévue du départ.
- [ ] Décider si une course supprimée compte parmi les 4 départs affichés.
- [ ] Ajouter les textes dans toutes les langues.
- [ ] Écrire les tests.
- [ ] Mettre à jour la section « Bon à savoir » du README.
- [ ] Facultatif, plus tard : afficher les messages de perturbation (travaux, ligne interrompue) grâce au flux SIRI-SX d'opentransportdata.swiss (clé requise).

**Terminé quand** une course supprimée est clairement signalée, et que l'heure à laquelle partir correspond au prochain départ réellement assuré.

---

## Phase 5 : temps de marche automatique

Deux nouveaux modes s'ajoutent au réglage manuel actuel. Le réglage manuel reste disponible, par exemple pour un raccourci que les cartes ne connaissent pas.
- **Depuis une adresse fixe** : l'adresse de la maison est saisie une fois dans les réglages.
- **Depuis la position actuelle** : le téléphone utilise sa position quand l'appli est ouverte.

**Services possibles.** Tous sont gratuits, sans clé et accessibles depuis le navigateur (vérifié le 10.10.2026).

| Besoin | Service | Remarques |
|---|---|---|
| Adresse vers coordonnées | Recherche de [geo.admin.ch](https://api3.geo.admin.ch/) (Confédération) | Adresses officielles suisses |
| Coordonnées des arrêts | transport.opendata.ch | Déjà disponibles dans l'API utilisée |
| Temps de marche réel | Itinéraires piétons de [routing.openstreetmap.de](https://routing.openstreetmap.de/about.html) (FOSSGIS) | Données OpenStreetMap. Usage modéré exigé, mention d'OpenStreetMap obligatoire |
| Secours sans réseau | Estimation locale | Distance à vol d'oiseau × 1,3 pour les détours, à 5 km/h |

**Étapes**

- [ ] `core/` : enregistrer les coordonnées de chaque arrêt, et les compléter automatiquement pour les arrêts déjà configurés.
- [ ] `core/` : écrire la fonction d'estimation locale, avec tests.
- [ ] Réglages : ajouter un champ « Adresse de la maison » avec recherche.
- [ ] Pour chaque arrêt : proposer le choix « manuel », « depuis la maison » ou « depuis ma position », avec un ajustement en minutes (escaliers, attente aux feux, etc.).
- [ ] Mode adresse : calculer l'itinéraire piéton une seule fois, à l'enregistrement, et pas à chaque rafraîchissement.
- [ ] Mode position :
  - demander l'autorisation de localisation seulement quand ce mode est choisi ;
  - recalculer l'estimation locale à chaque nouvelle position ;
  - demander un itinéraire précis seulement si la position a changé de plus de 100 m, au plus une fois par minute ;
  - couper la localisation quand l'appli passe en arrière-plan.
- [ ] Bonus : proposer les arrêts les plus proches de l'adresse ou de la position (transport.opendata.ch peut chercher des arrêts autour de coordonnées).
- [ ] Ajouter OpenStreetMap et geo.admin.ch dans les crédits de l'appli et du README.
- [ ] Expliquer dans le README où vont les données :
  - l'adresse et la position sont enregistrées uniquement sur l'appareil ;
  - l'adresse est envoyée à geo.admin.ch, seulement pour la recherche ;
  - seules des coordonnées sont envoyées pour le calcul d'itinéraire.

**Points d'attention**
- La localisation ne fonctionne qu'en HTTPS. C'est le cas sur GitHub Pages.
- Sur iPhone, l'autorisation de localisation peut être redemandée à chaque ouverture de l'appli installée.
- À l'intérieur, la position peut être imprécise de quelques dizaines de mètres. Cela change peu le temps de marche.

**Terminé quand**, à partir d'une adresse ou de la position, le temps de marche se remplit tout seul et reste modifiable.

---

## Idées à trier

Nouvelles idées, à placer plus tard dans une phase :

- Ajouter l'italien.
- Créer une version pour Raspberry Pi avec un écran e-ink. La logique de `core/` est déjà réutilisable, voir le README.

## Journal

| Date | Décision ou avancement |
|---|---|
| 10.10.2026 | Version 1.0 en ligne sur GitHub Pages. Licence GPL v3. Création de cette feuille de route. |

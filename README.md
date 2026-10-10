# Départs

Prochains départs des transports publics suisses, avec l'heure à laquelle quitter la maison :

> heure de départ maison = départ réel − temps de marche − avance choisie

Données : [transport.opendata.ch](https://transport.opendata.ch) (gratuit, sans clé). Aucun serveur, aucun compte :
tout est enregistré sur l'appareil.

## Essayer en local

Les modules JavaScript ne fonctionnent pas en ouvrant `index.html` directement (`file://`) : il faut un petit serveur.

```bash
python -m http.server 8000
```

Puis ouvrir <http://localhost:8000>. Pour charger les 4 arrêts de Vouvry : **⚙ Réglages → Importer un fichier →
`exemple-vouvry.json`**.

## Structure

| Dossier | Rôle |
|---|---|
| `core/` | Logique pure, sans DOM : appels API, calculs, regroupement des appels, format de la config. Réutilisable avec Node. |
| `ui/` | Affichage navigateur : tableau, réglages, sauvegarde. |
| `i18n/` | Textes de l'interface. |
| `tests/` | Tests de `core/`. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation comme application (PWA) et fonctionnement hors ligne. |

Réglages faciles à changer :
- couleurs et tailles : variables en haut de `css/style.css` ;
- 4 départs par arrêt, seuil orange à 3 min : `core/departures.js` ;
- cadence 45 s / 5 min, seuil de 30 min : `core/scheduler.js` ;
- choix rapides d'avance (2 / 5 / 10 min) : `core/config.js`.

## Tests

Avec [Node.js](https://nodejs.org) 18 ou plus récent (rien d'autre à installer) :

```bash
node --test
```

## Mise en ligne sur GitHub Pages

1. Créer un dépôt sur GitHub et y envoyer tous les fichiers de ce dossier.
2. Dans le dépôt : **Settings → Pages → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. L'application est disponible après une minute à `https://<utilisateur>.github.io/<dépôt>/`.

Sur téléphone, l'ouvrir puis **Ajouter à l'écran d'accueil** pour l'installer.

**Après une modification**, le service worker sert d'abord l'ancienne version et télécharge la nouvelle en arrière-plan :
elle apparaît au 2e rechargement. Si vous ajoutez ou supprimez un fichier, mettez à jour la liste `FILES` et le
numéro `CACHE` dans `sw.js`.

## Ajouter une langue

1. Copier `i18n/fr.js` en `i18n/de.js` (ou `it.js`, `en.js`) et traduire les textes, en gardant `{n}`, `{name}`, `{p}`.
2. Décommenter la langue dans `LANGUAGES` (`i18n/index.js`).
3. Ajouter `'i18n/de.js'` à `FILES` dans `sw.js`.

Le choix de la langue apparaît alors dans les réglages. Au premier lancement, la langue du navigateur est utilisée si
elle est disponible.

## Réutiliser la logique (Raspberry Pi, écran e-ink)

`core/` fonctionne tel quel avec Node 18+. Exemple : afficher l'heure à laquelle partir pour chaque arrêt d'une
config exportée.

```js
import { readFileSync } from 'node:fs';
import { importJSON, effectiveMargin } from './core/config.js';
import { fetchBoard } from './core/api.js';
import { planStop, visible } from './core/departures.js';

const config = importJSON(readFileSync('departs-config.json', 'utf8'));
const time = ms => new Date(ms).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });

for (const stop of config.stops) {
  const departures = await fetchBoard(stop.stationId, stop.types);
  const plans = visible(planStop(departures, stop, effectiveMargin(stop, config)), Date.now());
  console.log(stop.label || stop.stationName);
  for (const p of plans) console.log(`  ${p.line} ${p.to} : pars à ${time(p.leaveAt)}`);
}
```

Un écran e-ink ne peut pas se rafraîchir chaque seconde : afficher l'heure absolue (`leaveAt`) plutôt qu'un compte à
rebours, et utiliser `createScheduler` (`core/scheduler.js`) pour regrouper les appels.

## Limites connues de l'API

- Aucune information d'annulation : un bus supprimé s'affiche comme un bus normal.
- Le temps réel n'existe que pour les départs proches (environ 30 min pour les bus, plusieurs heures pour les trains).
- « Direction » = terminus : une ligne peut avoir plusieurs terminus (ex. 120 vers Lavey ou Monthey). Pour un bus,
  filtrer par quai est souvent le plus simple.
- Les lignes, destinations et quais proposés viennent des départs des prochaines heures : une ligne rare (bus de nuit,
  ligne du week-end) peut manquer au moment du réglage.

# Départs (Leave Now)

**Départs** affiche les prochains bus, trains, trams et bateaux de tes arrêts, partout en Suisse. Il te dit aussi
**quand quitter la maison** pour arriver à l'arrêt avec l'avance que tu as choisie.

> heure de départ de la maison = départ réel (retards compris) − temps de marche − avance choisie

👉 **Ouvrir l'application : <https://zeltouillette.github.io/Leave-Now/>**

L'application est gratuite, sans compte et sans publicité. Il n'y a rien à installer : un navigateur suffit, sur
téléphone, tablette ou ordinateur. Tes réglages restent sur ton appareil.

---

## Sommaire

- [Installer sur ton téléphone](#installer-sur-ton-téléphone)
- [Ajouter un arrêt](#ajouter-un-arrêt)
- [Lire l'écran](#lire-lécran)
- [Choisir ton avance](#choisir-ton-avance)
- [Gérer tes arrêts](#gérer-tes-arrêts)
- [Sauvegarder et changer d'appareil](#sauvegarder-et-changer-dappareil)
- [Bon à savoir](#bon-à-savoir)
- [Héberger ta propre copie](#héberger-ta-propre-copie)
- [Pour les développeurs](#pour-les-développeurs)

---

## Installer sur ton téléphone

Pour l'avoir comme une vraie application, avec une icône et en plein écran :

| Téléphone | Marche à suivre |
|---|---|
| **iPhone / iPad** | Ouvre le lien dans **Safari** → bouton **Partager** (carré avec une flèche) → **Sur l'écran d'accueil**. |
| **Android** | Ouvre le lien dans **Chrome** → menu **⋮** → **Installer l'application** (ou **Ajouter à l'écran d'accueil**). |

Tu peux aussi garder simplement le lien dans tes favoris.

## Ajouter un arrêt

1. Au premier lancement, touche **Ajouter un arrêt**. Plus tard, l'option se trouve dans **⚙ Réglages → Mes arrêts**.
2. Tape le nom de l'arrêt (par ex. `Lausanne, Flon` ou `Genève`) et choisis-le dans la liste.
3. Règle-le à ta convenance :
   - **Nom affiché** (facultatif), par exemple « Bus pour le travail ».
   - **Type de transport** : train, bus, tram / métro, bateau ou remontée mécanique.
   - **Lignes**, **Destinations** et **Quai / voie** : coche seulement ce qui t'intéresse. Si tu ne coches rien,
     tout est gardé. Les choix proposés viennent des vrais départs de l'arrêt.
   - **Temps de marche** entre chez toi et l'arrêt, en minutes.
   - **Avance pour cet arrêt** : laisse « Globale » pour utiliser l'avance choisie en haut de l'écran.
4. Touche **Enregistrer**.

> **Astuce :** une même ligne peut avoir plusieurs terminus (par ex. une ligne qui va tantôt jusqu'à A, tantôt
> jusqu'à B). Pour ne garder qu'un sens, il est souvent plus simple de choisir le **quai** que de cocher toutes les
> destinations.

Tu peux ajouter autant d'arrêts que tu veux : la maison, le travail, la gare, etc.

## Lire l'écran

Chaque arrêt montre au maximum **4 départs**, et seulement ceux que tu peux encore attraper.

| Affichage | Signification |
|---|---|
| 🟢 **pars dans 12 min** | Tu as le temps. |
| 🟠 **pars dans 3 min** | Prépare-toi : il reste 3 minutes ou moins. |
| 🔴 **Pars !** | C'est le moment de partir. Le petit texte en dessous indique combien de minutes de ton avance il te reste (« 2 min d'avance ») ou s'il faut te dépêcher (« de justesse »). |
| **+3** en orange | Retard annoncé. Il est déjà compté dans le calcul. |
| Quai en orange | Changement de quai ou de voie. |
| **⚠ Hors ligne** | Pas de réseau : les derniers horaires connus restent affichés. Ils se mettent à jour dès le retour du réseau. |

Un départ disparaît quand il n'est plus possible de l'attraper, même en marchant directement à l'arrêt sans avance.

Sous le nom de chaque arrêt, tu vois le temps de marche (🚶) et l'avance utilisée (⏱).

## Choisir ton avance

L'avance est le temps que tu veux avoir à l'arrêt avant le départ. Change-la à tout moment avec la barre en haut de
l'écran :

| Choix | Avance |
|---|---|
| Juste à temps | 2 min |
| Tranquille | 5 min |
| En avance | 10 min |
| Perso | la valeur que tu tapes |

Pour donner à un arrêt sa propre avance, touche le badge **⏱** de sa carte. Le badge devient bleu quand l'arrêt n'utilise
pas l'avance globale.

## Gérer tes arrêts

- **Modifier un arrêt** : touche son nom sur l'écran principal, ou **✎** dans **⚙ Réglages → Mes arrêts**.
- **Changer l'ordre** : flèches **↑** et **↓** dans **⚙ Réglages → Mes arrêts**.
- **Supprimer un arrêt** : ouvre-le, puis touche **Supprimer**.
- **Garder l'écran allumé** (dans **⚙ Réglages**) : pratique pour une tablette posée dans l'entrée ou fixée au mur.

## Sauvegarder et changer d'appareil

Tes réglages sont enregistrés dans le navigateur de ton appareil. Si tu effaces les données du navigateur, ils sont
perdus. Dans **⚙ Réglages → Sauvegarde**, tu peux :

- **Exporter un fichier** : télécharge tes réglages dans un petit fichier `.json`.
- **Importer un fichier** : recharge ce fichier, sur le même appareil ou sur un autre.
- **Partager un lien** : crée un lien qui contient tous tes arrêts. Ouvre-le sur ton autre téléphone, ou envoie-le à
  un proche qui prend les mêmes bus : il retrouvera exactement les mêmes réglages.

Avant de remplacer quoi que ce soit, l'application te demande toujours une confirmation.

## Bon à savoir

- **Données** : horaires et temps réel de [transport.opendata.ch](https://transport.opendata.ch), le service ouvert des
  transports publics suisses. La couverture est donc limitée à la Suisse.
- **Suppressions** : l'API n'indique pas les courses annulées. Un bus supprimé s'affiche comme un bus normal.
- **Temps réel** : les retards ne sont connus que pour les départs proches, environ 30 min pour les bus et plusieurs
  heures pour les trains. Au-delà, c'est l'horaire prévu.
- **Lignes rares** : les lignes et quais proposés viennent des prochains départs. Une ligne qui ne circule pas en ce
  moment (bus de nuit, ligne du week-end) peut manquer lors du réglage. Il suffit de revenir la cocher quand elle
  circule.
- **Économe** : les horaires sont actualisés environ toutes les 45 secondes, et moins souvent si le prochain départ est
  loin. Tout s'arrête quand l'application n'est pas à l'écran.

---

## Héberger ta propre copie

Tu veux modifier l'application (couleurs, textes, langue…) ou avoir ta propre adresse ? C'est gratuit avec GitHub
Pages :

1. Clique sur **Fork** en haut de cette page pour copier le dépôt sur ton compte GitHub.
2. Dans ta copie : **Settings → Pages → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`, puis
   **Save**.
3. Après une minute, ton application est en ligne à `https://<ton-pseudo>.github.io/Leave-Now/`.

Il n'y a ni compilation ni dépendance : les fichiers du dépôt sont servis tels quels.

## Pour les développeurs

Le code est en JavaScript sans framework ni bibliothèque. C'est une application web installable (PWA) qui fonctionne
hors ligne.

### Lancer en local

Ouvrir `index.html` directement (`file://`) ne fonctionne pas, car les modules JavaScript ont besoin d'un serveur.
N'importe quel petit serveur statique convient, par exemple :

```bash
python -m http.server 8000
```

L'application est ensuite accessible sur <http://localhost:8000>.

### Structure

| Dossier / fichier | Rôle |
|---|---|
| `core/` | Logique pure, sans DOM : appels à l'API, calcul de l'heure de départ, regroupement des appels, format de la config. Fonctionne aussi avec Node. |
| `ui/` | Affichage dans le navigateur : tableau des départs, réglages, sauvegarde locale. |
| `i18n/` | Textes de l'interface. |
| `css/style.css` | Styles. Les couleurs et les tailles sont regroupées en haut du fichier. |
| `tests/` | Tests de `core/`. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation comme application et fonctionnement hors ligne. |

Réglages faciles à modifier :

- nombre de départs affichés (4) et seuil orange (3 min) : `core/departures.js` ;
- fréquence d'actualisation (45 s / 5 min) et seuil « départ lointain » (30 min) : `core/scheduler.js` ;
- choix rapides d'avance (2 / 5 / 10 min) : `core/config.js`.

### Tests

Ils nécessitent [Node.js](https://nodejs.org) 18 ou plus récent, sans rien d'autre à installer :

```bash
node --test
```

### Publier une modification

Le service worker affiche d'abord la version en cache, puis télécharge la nouvelle en arrière-plan. Les changements
apparaissent donc au **2e rechargement**. Si tu ajoutes ou supprimes un fichier, mets à jour la liste `FILES` et
incrémente le numéro `CACHE` dans `sw.js`.

### Ajouter une langue

L'interface est en français, mais tout est prêt pour l'allemand, l'italien ou l'anglais :

1. Copie `i18n/fr.js` en `i18n/de.js` (ou `it.js`, `en.js`) et traduis les textes. Garde tels quels `{n}`, `{name}` et
   `{p}`.
2. Décommente la langue dans `LANGUAGES` (`i18n/index.js`).
3. Ajoute `'i18n/de.js'` à la liste `FILES` dans `sw.js`.

Un choix de langue apparaît alors dans les réglages. Au premier lancement, la langue du navigateur est choisie si elle
est disponible.

### Réutiliser la logique ailleurs (Raspberry Pi, écran e-ink…)

`core/` fonctionne tel quel avec Node 18 ou plus récent. Cet exemple affiche, pour chaque arrêt d'une config exportée
depuis l'application, l'heure à laquelle partir :

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

Un écran e-ink ne peut pas se rafraîchir chaque seconde. Affiche plutôt l'heure de départ (`leaveAt`) qu'un compte à
rebours, et utilise `createScheduler` (`core/scheduler.js`) pour regrouper les appels.

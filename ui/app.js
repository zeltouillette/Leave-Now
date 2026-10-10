/**
 * Point d'entrée de l'interface : charge la config, démarre le rafraîchissement des données
 * et la boucle d'affichage (chaque seconde), met tout en pause quand l'onglet est caché.
 */
import { t, setLang, lang } from '../i18n/index.js';
import { decodeConfig } from '../core/config.js';
import { createScheduler } from '../core/scheduler.js';
import { load, save } from './storage.js';
import * as board from './board.js';
import * as settings from './settings.js';

let config = load();
const getConfig = () => config;
const scheduler = createScheduler({ onUpdate: key => board.dataChanged(key) });

/** Seul point de modification de la config : sauvegarde, puis mise à jour de l'affichage. */
async function setConfig(next) {
  const langChanged = next.lang !== config.lang;
  config = next;
  save(config);
  if (langChanged) await applyLang();
  apply();
}

function apply() {
  scheduler.setStops(config.stops);
  board.render();
  settings.refresh();
  keepAwake();
}

/** Charge la langue et traduit les textes fixes de la page (attributs data-i18n…). */
async function applyLang() {
  await setLang(config.lang);
  document.documentElement.lang = lang();
  document.title = t('appName');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll('[data-i18n-label]')) {
    el.title = t(el.dataset.i18nLabel);
    el.setAttribute('aria-label', el.title);
  }
}

/* ---------- Boucle d'affichage et pause ---------- */

let tickTimer;

function tick() {
  board.update(Date.now());
  tickTimer = setTimeout(tick, 1000 - (Date.now() % 1000)); // calé sur le début de chaque seconde
}

function start() {
  scheduler.start(); // ne rappelle l'API que pour les données trop anciennes
  clearTimeout(tickTimer);
  tick();
  keepAwake();
}

function pause() {
  scheduler.stop();
  clearTimeout(tickTimer);
}

/* ---------- Écran toujours allumé (option, utile pour un affichage permanent) ---------- */

let wakeLock = null; // promesse du verrou (évite d'en demander deux à la fois)

async function keepAwake() {
  if (!('wakeLock' in navigator)) return;
  const wanted = config.keepAwake && !document.hidden;
  if (wanted && !wakeLock) {
    wakeLock = navigator.wakeLock.request('screen').catch(() => null); // null : refusé (batterie faible…)
    const lock = await wakeLock;
    if (!lock) wakeLock = null;
    else lock.addEventListener('release', () => { wakeLock = null; }); // relâché aussi quand l'onglet est caché
  } else if (!wanted && wakeLock) {
    (await wakeLock)?.release();
  }
}

/* ---------- Lien de partage : …/#import=… ---------- */

async function importFromLink() {
  const code = location.hash.match(/^#import=([\w-]+)$/)?.[1];
  if (!code) return;
  history.replaceState(null, '', location.pathname + location.search); // retire le code de l'adresse
  try {
    settings.confirmImport(await decodeConfig(code));
  } catch {
    alert(t('importError'));
  }
}

/* ---------- Démarrage ---------- */

async function main() {
  await applyLang();
  board.init(document.querySelector('#board'), {
    getConfig,
    scheduler,
    editStop: settings.openStopEditor,
    editMargin: settings.openMarginDialog,
  });
  settings.init({ getConfig, setConfig });
  await importFromLink();
  apply();
  start();
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : start()));
  addEventListener('online', () => scheduler.refreshNow()); // retour du réseau : données fraîches tout de suite
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
}

main();

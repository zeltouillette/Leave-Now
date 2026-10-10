/**
 * Réglages :
 * - sélecteur d'avance (barre du haut, et par arrêt) ;
 * - ajout / modification d'un arrêt : recherche avec autocomplétion, puis lignes, destinations
 *   et quais proposés d'après les départs réels ;
 * - liste des arrêts (réordonner), langue, écran allumé, export / import.
 */
import { t, LANGUAGES } from '../i18n/index.js';
import { searchStations, fetchBoard } from '../core/api.js';
import {
  TRANSPORT_TYPES, MARGIN_PRESETS, createStop, normalizeConfig, exportJSON, importJSON, encodeConfig,
} from '../core/config.js';
import { lineLabel } from './board.js';

const CHOICES_LIMIT = 100;   // départs chargés pour proposer les choix (l'API en renvoie ~60 au plus)
const SEARCH_DELAY_MS = 250; // attend la fin de la frappe avant de chercher : moins d'appels
const MAX_MARGIN = 180;

const $ = selector => document.querySelector(selector);
const collator = new Intl.Collator(undefined, { numeric: true }); // tri naturel : 2 avant 10

let ctx;          // { getConfig, setConfig }
let draft = null; // arrêt en cours d'édition (copie, enregistrée seulement avec « Enregistrer »)
let results = []; // derniers résultats de recherche
let searchTimer, searchCtrl, choicesCtrl;

export function init(context) {
  ctx = context;

  // Boutons « Annuler », « Fermer », « OK »
  for (const button of document.querySelectorAll('[data-close]')) {
    button.addEventListener('click', () => button.closest('dialog').close());
  }

  // Réglages
  $('#open-settings').addEventListener('click', openSettings);
  $('#add-stop').addEventListener('click', () => openStopEditor(null));
  $('#empty-add').addEventListener('click', () => openStopEditor(null));
  $('#lang-select').append(...Object.entries(LANGUAGES).map(([code, name]) => new Option(name, code)));
  $('#lang-row').hidden = Object.keys(LANGUAGES).length < 2;
  $('#lang-select').addEventListener('change', e => update({ lang: e.target.value }));
  $('#wake-row').hidden = !('wakeLock' in navigator);
  $('#keep-awake').addEventListener('change', e => update({ keepAwake: e.target.checked }));
  $('#export-file').addEventListener('click', exportFile);
  $('#import-file').addEventListener('click', () => $('#import-input').click());
  $('#import-input').addEventListener('change', importFile);
  $('#share-link').addEventListener('click', shareLink);

  // Éditeur d'arrêt
  $('#station-input').addEventListener('input', onSearchInput);
  $('#station-input').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault(); // sinon le formulaire serait envoyé
    if (results[0]) selectStation(results[0]);
  });
  $('#stop-form').addEventListener('submit', saveDraft);
  $('#stop-delete').addEventListener('click', deleteDraft);
  $('#stop-dialog').addEventListener('close', () => {
    clearTimeout(searchTimer);
    searchCtrl?.abort();
    choicesCtrl?.abort();
  });
}

/** Met à jour ce qui dépend de la config (appelé après chaque modification). */
export function refresh() {
  marginPicker($('#global-margin'), ctx.getConfig().margin, margin => update({ margin }));
  if ($('#settings-dialog').open) renderSettings();
}

const update = changes => ctx.setConfig({ ...ctx.getConfig(), ...changes });

/* ---------- Sélecteur d'avance ---------- */

/**
 * Choix rapides + champ « Perso ».
 * Si globalMargin est fourni (réglage d'un arrêt), ajoute le choix « Globale » (valeur null).
 */
function marginPicker(el, value, onChange, globalMargin) {
  const choices = globalMargin == null ? MARGIN_PRESETS : [{ key: 'global', minutes: null }, ...MARGIN_PRESETS];
  const buttons = choices.map(({ key, minutes }) => {
    const button = Object.assign(document.createElement('button'), { type: 'button', className: 'seg' });
    const [main, sub] = minutes == null ? [t('global'), t('min', { n: globalMargin })] : [t('min', { n: minutes }), t(key)];
    button.append(tag('strong', main), tag('small', sub));
    button.addEventListener('click', () => select(minutes));
    return button;
  });

  const input = Object.assign(document.createElement('input'), {
    type: 'number', min: 0, max: MAX_MARGIN, inputMode: 'numeric', placeholder: '…',
  });
  input.setAttribute('aria-label', t('custom'));
  input.addEventListener('change', () => {
    if (input.value !== '') select(Math.min(MAX_MARGIN, Math.max(0, Math.round(input.valueAsNumber))));
  });
  const custom = Object.assign(document.createElement('label'), { className: 'seg' });
  custom.append(input, tag('small', t('custom')));
  el.replaceChildren(...buttons, custom);

  function select(minutes) {
    paint(minutes);
    onChange(minutes);
  }
  function paint(minutes) {
    const isPreset = choices.some(choice => choice.minutes === minutes);
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', choices[i].minutes === minutes));
    custom.classList.toggle('active', !isPreset);
    input.value = isPreset ? '' : minutes;
  }
  paint(value);
}

/** Avance d'un arrêt, depuis l'écran principal. Appliquée immédiatement. */
export function openMarginDialog(stopId) {
  const config = ctx.getConfig();
  const stop = config.stops.find(s => s.id === stopId);
  $('#margin-title').textContent = stop.label || stop.stationName;
  marginPicker($('#margin-picker'), stop.margin, margin => {
    const current = ctx.getConfig();
    ctx.setConfig({ ...current, stops: current.stops.map(s => (s.id === stopId ? { ...s, margin } : s)) });
  }, config.margin);
  $('#margin-dialog').showModal();
}

/* ---------- Fenêtre des réglages ---------- */

function openSettings() {
  renderSettings();
  $('#settings-dialog').showModal();
}

function renderSettings() {
  const config = ctx.getConfig();
  $('#stop-list').replaceChildren(...config.stops.map((stop, i) => {
    const item = $('#stop-item-tpl').content.firstElementChild.cloneNode(true);
    item.querySelector('.name').textContent = stop.label || stop.stationName;
    const actions = { up: () => move(i, -1), down: () => move(i, 1), edit: () => openStopEditor(stop.id) };
    for (const [name, action] of Object.entries(actions)) {
      const button = item.querySelector(`.${name}`);
      button.title = t(name);
      button.setAttribute('aria-label', t(name));
      button.addEventListener('click', action);
    }
    item.querySelector('.up').disabled = i === 0;
    item.querySelector('.down').disabled = i === config.stops.length - 1;
    return item;
  }));
  $('#lang-select').value = config.lang in LANGUAGES ? config.lang : 'fr';
  $('#keep-awake').checked = config.keepAwake;
}

/** Échange un arrêt avec son voisin (delta = -1 : monter, +1 : descendre). */
function move(index, delta) {
  const stops = [...ctx.getConfig().stops];
  [stops[index], stops[index + delta]] = [stops[index + delta], stops[index]];
  update({ stops });
}

/* ---------- Ajout / modification d'un arrêt ---------- */

/** stopId = null pour un nouvel arrêt. */
export function openStopEditor(stopId) {
  const stop = ctx.getConfig().stops.find(s => s.id === stopId);
  draft = stop ? structuredClone(stop) : null;
  $('#stop-title').textContent = t(stop ? 'editStop' : 'addStop');
  $('#station-input').value = stop?.stationName ?? '';
  $('#stop-delete').hidden = !stop;
  showResults([]);
  renderDraft();
  $('#stop-dialog').showModal();
  if (stop) document.activeElement.blur(); // pas de clavier qui surgit en modification
}

/** Affiche les options de l'arrêt en cours (cachées tant qu'aucun arrêt n'est choisi). */
function renderDraft() {
  $('#stop-options').hidden = !draft;
  $('#stop-save').disabled = !draft;
  if (!draft) return;
  $('#stop-label').value = draft.label;
  $('#stop-label').placeholder = draft.stationName;
  $('#stop-walk').value = draft.walk;
  chips($('#type-chips'), TRANSPORT_TYPES, draft.types, type => t(`type_${type}`), types => {
    // autre type de transport : les lignes, destinations et quais proposés changent
    Object.assign(draft, { types, lines: [], destinations: [], platform: '' });
    loadChoices();
  });
  marginPicker($('#stop-margin'), draft.margin, margin => { draft.margin = margin; }, ctx.getConfig().margin);
  loadChoices();
}

/** Charge les départs réels de l'arrêt pour proposer lignes, destinations et quais. */
async function loadChoices() {
  choicesCtrl?.abort();
  choicesCtrl = new AbortController();
  const hint = $('#choices-hint');
  hint.textContent = t('choicesLoading');
  let departures = [];
  try {
    departures = await fetchBoard(draft.stationId, draft.types, CHOICES_LIMIT, choicesCtrl.signal);
    hint.textContent = departures.length ? '' : t('choicesEmpty');
  } catch (err) {
    if (err.name === 'AbortError') return; // remplacé par un chargement plus récent
    hint.textContent = t('choicesError');
  }
  // valeurs vues dans les départs + valeurs déjà choisies (gardées même si absentes en ce moment)
  const options = (field, chosen) =>
    [...new Set([...departures.map(dep => dep[field]).filter(Boolean), ...chosen])].sort(collator.compare);

  chips($('#line-chips'), options('line', draft.lines), draft.lines, lineLabel, lines => { draft.lines = lines; });
  chips($('#dest-chips'), options('to', draft.destinations), draft.destinations, String, destinations => {
    draft.destinations = destinations;
  });
  chips($('#platform-chips'), ['', ...options('platform', draft.platform ? [draft.platform] : [])], [draft.platform],
    platform => platform || t('all'), ([platform]) => { draft.platform = platform; }, 'radio');
}

/**
 * Pastilles à cocher (type 'radio' : un seul choix). onChange reçoit les valeurs cochées.
 * Le groupe entier est masqué s'il n'y a rien à proposer.
 */
function chips(el, values, selected, labelOf, onChange, type = 'checkbox') {
  el.replaceChildren(...values.map(value => {
    const label = Object.assign(document.createElement('label'), { className: 'chip' });
    const input = Object.assign(document.createElement('input'), { type, name: el.id, value, checked: selected.includes(value) });
    label.append(input, tag('span', labelOf(value)));
    return label;
  }));
  el.closest('fieldset').hidden = !values.some(Boolean);
  el.onchange = () => onChange([...el.querySelectorAll('input:checked')].map(input => input.value));
}

function onSearchInput() {
  clearTimeout(searchTimer);
  searchCtrl?.abort();
  const query = $('#station-input').value.trim();
  if (query.length < 2) return showResults([]);
  searchTimer = setTimeout(() => search(query), SEARCH_DELAY_MS);
}

async function search(query) {
  searchCtrl = new AbortController();
  try {
    showResults(await searchStations(query, searchCtrl.signal), t('noResults'));
  } catch (err) {
    if (err.name !== 'AbortError') showResults([], t('searchError'));
  }
}

/** Liste des résultats ; `emptyText` est affiché s'il n'y en a aucun. */
function showResults(list, emptyText = '') {
  results = list;
  const items = list.map(station => {
    const button = Object.assign(document.createElement('button'), {
      type: 'button',
      // le type aide à distinguer une gare d'un arrêt de bus du même nom
      textContent: TRANSPORT_TYPES.includes(station.icon) ? `${station.name} · ${t(`type_${station.icon}`)}` : station.name,
    });
    button.addEventListener('click', () => selectStation(station));
    const item = document.createElement('li');
    item.append(button);
    return item;
  });
  if (!list.length && emptyText) items.push(Object.assign(document.createElement('li'), { className: 'hint', textContent: emptyText }));
  $('#station-results').replaceChildren(...items);
  $('#station-results').hidden = !items.length;
}

function selectStation(station) {
  // en remplaçant l'arrêt d'une carte existante, on garde sa place, son temps de marche et son avance
  const kept = draft ? { id: draft.id, walk: draft.walk, margin: draft.margin } : {};
  draft = { ...createStop(station), ...kept };
  $('#station-input').value = station.name;
  showResults([]);
  renderDraft();
}

/** « Enregistrer » (le dialogue se ferme tout seul : formulaire en method="dialog"). */
function saveDraft() {
  if (!draft) return;
  draft.label = $('#stop-label').value.trim();
  draft.walk = $('#stop-walk').valueAsNumber;
  const config = ctx.getConfig();
  const exists = config.stops.some(s => s.id === draft.id);
  const stops = exists ? config.stops.map(s => (s.id === draft.id ? draft : s)) : [...config.stops, draft];
  ctx.setConfig(normalizeConfig({ ...config, stops }));
}

function deleteDraft() {
  if (!confirm(t('confirmDelete', { name: draft.label || draft.stationName }))) return;
  update({ stops: ctx.getConfig().stops.filter(s => s.id !== draft.id) });
  $('#stop-dialog').close();
}

/* ---------- Export / import ---------- */

function exportFile() {
  const url = URL.createObjectURL(new Blob([exportJSON(ctx.getConfig())], { type: 'application/json' }));
  Object.assign(document.createElement('a'), { href: url, download: 'leave-now-config.json' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importFile(e) {
  const [file] = e.target.files;
  e.target.value = ''; // permet de réimporter le même fichier
  if (!file) return;
  try {
    confirmImport(importJSON(await file.text()));
  } catch {
    alert(t('importError'));
  }
}

/** Demande confirmation puis remplace la config (fichier ou lien). */
export function confirmImport(imported) {
  if (confirm(t('confirmImport', { n: imported.stops.length }))) ctx.setConfig(imported);
}

/** Lien contenant toute la config après le « # » (jamais envoyé à un serveur). */
async function shareLink() {
  const url = `${location.origin}${location.pathname}#import=${await encodeConfig(ctx.getConfig())}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: t('appName'), url });
    } catch {
      // partage annulé
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    alert(t('linkCopied'));
  } catch {
    prompt(t('shareLink'), url); // copie manuelle
  }
}

const tag = (name, text) => Object.assign(document.createElement(name), { textContent: text });

/**
 * Tableau principal : une carte par arrêt, 4 départs maximum, compte à rebours chaque seconde.
 * Pour rester léger : la liste d'une carte n'est reconstruite que si les départs affichés changent,
 * et chaque seconde seuls les textes qui ont changé sont réécrits.
 */
import { t, lang } from '../i18n/index.js';
import { effectiveMargin } from '../core/config.js';
import { planStop, visible, status, MIN } from '../core/departures.js';
import { groupKey } from '../core/scheduler.js';

/** "B 120" -> "120", "M m2" -> "m2" (le type est évident) ; les trains gardent leur catégorie : "R 91", "IC 1". */
export const lineLabel = line => line.replace(/^(B|T|M) /, '');

let ctx;          // { getConfig, scheduler, editStop(id), editMargin(id) }
let root, emptyEl, netEl;
let timeFormat;   // affichage « 11:18 »
const cards = new Map(); // id de l'arrêt -> { stop, rowsEl, msgEl, plans, shownKey, rows }

export function init(container, context) {
  root = container;
  ctx = context;
  emptyEl = document.querySelector('#empty');
  netEl = document.querySelector('#net-status');
}

/** Reconstruit toutes les cartes (après un changement de config ou de langue). */
export function render() {
  const config = ctx.getConfig();
  timeFormat = new Intl.DateTimeFormat(`${lang()}-CH`, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
  cards.clear();
  root.replaceChildren(...config.stops.map(stop => buildCard(stop, config)));
  emptyEl.hidden = config.stops.length > 0;
  update(Date.now());
}

/** Nouvelles données reçues pour un groupe d'arrêts. */
export function dataChanged(key) {
  const config = ctx.getConfig();
  for (const card of cards.values()) if (groupKey(card.stop) === key) computePlans(card, config);
  update(Date.now());
}

/** Appelé chaque seconde. */
export function update(now) {
  for (const card of cards.values()) {
    const shown = visible(card.plans, now);
    const shownKey = shown.map(plan => plan.key).join();
    if (shownKey !== card.shownKey) {
      card.shownKey = shownKey;
      card.rows = shown.map(plan => buildRow(plan, card.stop));
      card.rowsEl.replaceChildren(...card.rows.map(row => row.el));
    }
    for (const row of card.rows) paintRow(row, now);
    setText(card.msgEl, shown.length ? '' : emptyMessage(ctx.scheduler.get(groupKey(card.stop))));
  }
  paintNetStatus(now);
}

function buildCard(stop, config) {
  const el = clone('card-tpl');
  const title = el.querySelector('.card-title');
  title.textContent = stop.label || stop.stationName;
  title.addEventListener('click', () => ctx.editStop(stop.id));
  el.querySelector('.card-sub').textContent = [
    stop.label && stop.stationName,
    stop.platform && platformText(stop, stop.platform),
    t('walkBadge', { n: stop.walk }),
  ].filter(Boolean).join(' · ');
  const marginButton = el.querySelector('.margin-btn');
  marginButton.textContent = t('marginBadge', { n: effectiveMargin(stop, config) });
  marginButton.classList.toggle('custom', stop.margin != null); // avance propre à cet arrêt
  marginButton.addEventListener('click', () => ctx.editMargin(stop.id));

  const card = { stop, rowsEl: el.querySelector('.rows'), msgEl: el.querySelector('.card-msg'), plans: [], shownKey: null, rows: [] };
  cards.set(stop.id, card);
  computePlans(card, config);
  return el;
}

/** Filtre les départs d'une carte et calcule leurs heures (seulement quand données ou config changent). */
function computePlans(card, config) {
  const group = ctx.scheduler.get(groupKey(card.stop));
  card.plans = planStop(group?.departures ?? [], card.stop, effectiveMargin(card.stop, config));
  card.shownKey = null; // heures ou retards peut-être modifiés : la liste sera reconstruite
}

function buildRow(plan, stop) {
  const el = clone('row-tpl');
  el.querySelector('.line').textContent = lineLabel(plan.line);
  el.querySelector('.dest').textContent = plan.to;
  el.querySelector('.time').textContent = timeFormat.format(plan.planned);
  if (plan.delay > 0) el.querySelector('.delay').textContent = `+${plan.delay}`;
  // quai affiché s'il a changé, ou si l'arrêt n'est pas déjà filtré par quai
  const platform = plan.newPlatform ?? (stop.platform ? '' : plan.platform);
  const platformEl = el.querySelector('.plat');
  platformEl.textContent = platform && platformText(stop, platform);
  platformEl.classList.toggle('changed', Boolean(plan.newPlatform));
  return {
    el,
    plan,
    label: el.querySelector('.cd-label'),
    value: el.querySelector('.cd-value'),
    unit: el.querySelector('.cd-unit'),
    note: el.querySelector('.cd-note'),
    painted: '', // dernier état affiché
  };
}

/** Compte à rebours et couleur d'une ligne. */
function paintRow(row, now) {
  const { state, minutes, spare } = status(row.plan, now);
  const go = state === 'go';
  const painted = go ? `go${spare}` : `${state}${minutes}`;
  if (painted === row.painted) return; // rien de changé depuis la dernière seconde
  row.painted = painted;
  row.el.className = `row ${state}`;
  row.label.textContent = go ? '' : t('leaveIn');
  row.value.textContent = go ? t('go') : minutes;
  row.unit.textContent = go ? '' : t('minUnit');
  row.note.textContent = !go ? '' : spare ? t('spare', { n: spare }) : t('spareNone');
}

function emptyMessage(group) {
  if (group?.fetchedAt) return t('noDepartures');
  return group?.error ? t('unavailable') : t('loading');
}

/** Indication discrète en cas de problème réseau (les dernières données restent affichées). */
function paintNetStatus(now) {
  const failed = [...cards.values()]
    .map(card => ctx.scheduler.get(groupKey(card.stop)))
    .filter(group => group?.error);
  let text = '';
  if (failed.length) {
    const oldest = Math.min(...failed.map(group => group.fetchedAt || Infinity)); // Infinity : jamais chargé
    const age = Math.floor((now - oldest) / MIN);
    text = age >= 1 ? t('offlineSince', { n: age }) : t('offline');
  }
  setText(netEl, text);
}

const platformText = (stop, platform) => t(stop.types.includes('train') ? 'track' : 'platform', { p: platform });
const clone = id => document.getElementById(id).content.firstElementChild.cloneNode(true);

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

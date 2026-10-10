/**
 * Accès à l'API transport.opendata.ch (gratuite, sans clé) et mise au propre des données.
 * Fonctionne dans le navigateur et avec Node 18+ (fetch natif).
 */

const API = 'https://transport.opendata.ch/v1';
const TIMEOUT_MS = 10_000;

// Seuls ces champs sont demandés : la réponse passe d'environ 400 Ko à 8 Ko pour 40 départs
// (sans ce filtre, l'API renvoie la liste de tous les arrêts de chaque course).
const BOARD_FIELDS = [
  'stationboard/category',
  'stationboard/number',
  'stationboard/to',
  'stationboard/stop/departureTimestamp',
  'stationboard/stop/delay',
  'stationboard/stop/platform',
  'stationboard/stop/prognosis/departure',
  'stationboard/stop/prognosis/platform',
];

/** Appel GET. Sans `signal` fourni, la requête est abandonnée après TIMEOUT_MS. */
async function getJSON(path, params, signal = AbortSignal.timeout(TIMEOUT_MS)) {
  const res = await fetch(`${API}/${path}?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Recherche d'arrêts par nom (autocomplétion).
 * Renvoie [{ id, name, icon }] ; icon = type principal de l'arrêt ('train', 'bus', 'tram'…).
 */
export async function searchStations(query, signal) {
  const params = new URLSearchParams({ query, type: 'station' });
  for (const field of ['id', 'name', 'icon']) params.append('fields[]', `stations/${field}`);
  const data = await getJSON('locations', params, signal);
  return (data.stations ?? []).filter(s => s.id).map(({ id, name, icon }) => ({ id, name, icon }));
}

/**
 * Prochains départs d'un arrêt, triés par heure réelle.
 * types : ['bus', 'train'…] ([] = tous) — filtré directement par l'API.
 */
export async function fetchBoard(stationId, types = [], limit = 40, signal) {
  const params = new URLSearchParams({ id: stationId, limit });
  for (const type of types) params.append('transportations[]', type);
  for (const field of BOARD_FIELDS) params.append('fields[]', field);
  const data = await getJSON('stationboard', params, signal);
  return normalizeBoard(data.stationboard ?? []);
}

/** Liste brute de l'API -> départs simplifiés, triés par heure réelle (un bus en retard peut passer après le suivant). */
export function normalizeBoard(list) {
  return list
    .filter(journey => journey?.stop?.departureTimestamp)
    .map(normalizeDeparture)
    .sort((a, b) => a.time - b.time);
}

/**
 * Un départ brut de l'API -> objet simple :
 *   line         "B 120", "R 91", "M m2" (catégorie + numéro : évite de confondre IC 1 et R 1)
 *   to           terminus
 *   platform     quai ou voie prévu ('' si inconnu)
 *   newPlatform  nouveau quai annoncé (sinon null)
 *   planned      heure prévue, time : heure réelle (timestamps en ms)
 *   delay        retard en minutes
 *   key          identifiant du départ (sert à savoir si l'affichage doit changer)
 */
export function normalizeDeparture({ category, number, to, stop }) {
  const planned = stop.departureTimestamp * 1000;
  // Heure réelle : prévision si présente, sinon heure prévue + retard (en minutes, parfois null)
  const time = parseApiDate(stop.prognosis?.departure) ?? planned + (stop.delay ?? 0) * 60_000;
  const newPlatform = stop.prognosis?.platform;
  return {
    line: [category, number].filter(Boolean).join(' '),
    to: to ?? '',
    platform: stop.platform ?? '',
    newPlatform: newPlatform && newPlatform !== stop.platform ? newPlatform : null,
    planned,
    time,
    delay: Math.round((time - planned) / 60_000),
    key: `${category}${number}|${to}|${planned}`,
  };
}

/**
 * "2026-10-10T10:45:00+0200" -> timestamp en ms (null si absent ou illisible).
 * L'API omet le « : » du fuseau horaire, que certaines versions de Safari exigent : on l'ajoute.
 */
export function parseApiDate(text) {
  if (!text) return null;
  const ms = Date.parse(text.replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
  return Number.isNaN(ms) ? null : ms;
}

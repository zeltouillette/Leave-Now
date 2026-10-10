/**
 * Configuration de l'utilisateur : format, valeurs par défaut, validation,
 * export / import (fichier JSON ou lien). Sans DOM : utilisable aussi avec Node.
 *
 * Format :
 * {
 *   version: 1, lang: 'fr', margin: 5 (avance globale, min), keepAwake: false,
 *   stops: [{
 *     id, stationId: '8570593', stationName: 'Vouvry, poste',
 *     label: ''            nom personnalisé ('' = nom de l'arrêt)
 *     types: ['bus']       [] = tous
 *     lines: ['B 120']     [] = toutes
 *     destinations: []     [] = toutes (terminus exact)
 *     platform: 'A'        '' = tous les quais
 *     walk: 5              temps de marche (min)
 *     margin: null         avance propre à l'arrêt (min), null = avance globale
 *   }]
 * }
 */

/** Types acceptés par l'API (paramètre transportations[]). Le métro est classé « tram ». */
export const TRANSPORT_TYPES = ['train', 'bus', 'tram', 'ship', 'cableway'];

/** Choix rapides d'avance à l'arrêt, en minutes. */
export const MARGIN_PRESETS = [
  { key: 'tight', minutes: 2 },   // Juste à temps
  { key: 'relaxed', minutes: 5 }, // Tranquille
  { key: 'early', minutes: 10 },  // En avance
];

const VERSION = 1;
const MAX_MINUTES = 180;

export function defaultConfig() {
  return { version: VERSION, lang: 'fr', margin: 5, keepAwake: false, stops: [] };
}

/** Nouvel arrêt à partir d'un résultat de recherche { id, name, icon } : type pré-rempli d'après l'icône. */
export function createStop(station) {
  return normalizeStop({
    stationId: station.id,
    stationName: station.name,
    types: [station.icon],
  });
}

/** Avance à utiliser pour un arrêt : la sienne si définie, sinon la globale. */
export function effectiveMargin(stop, config) {
  return stop.margin ?? config.margin;
}

/** Nettoie une config (stockage, import) : valeurs manquantes ou invalides remplacées par les valeurs par défaut. */
export function normalizeConfig(raw) {
  const base = defaultConfig();
  if (!raw || typeof raw !== 'object') return base;
  const ids = new Set();
  const stops = (Array.isArray(raw.stops) ? raw.stops : []).map(normalizeStop).filter(Boolean);
  for (const stop of stops) {
    if (ids.has(stop.id)) stop.id = newId(); // identifiants en double (fichier modifié à la main)
    ids.add(stop.id);
  }
  return {
    version: VERSION,
    lang: typeof raw.lang === 'string' ? raw.lang : base.lang,
    margin: minutes(raw.margin, base.margin),
    keepAwake: raw.keepAwake === true,
    stops,
  };
}

function normalizeStop(s) {
  if (!s?.stationId) return null;
  return {
    id: s.id ? String(s.id) : newId(),
    stationId: String(s.stationId),
    stationName: String(s.stationName ?? ''),
    label: String(s.label ?? ''),
    types: strings(s.types).filter(type => TRANSPORT_TYPES.includes(type)),
    lines: strings(s.lines),
    destinations: strings(s.destinations),
    platform: s.platform ? String(s.platform) : '',
    walk: minutes(s.walk, 5),
    margin: s.margin == null ? null : minutes(s.margin, null),
  };
}

/** Nombre entier de minutes entre 0 et MAX_MINUTES, sinon `fallback`. */
function minutes(value, fallback) {
  const n = Number(value);
  return value !== '' && value != null && Number.isFinite(n) && n >= 0 && n <= MAX_MINUTES ? Math.round(n) : fallback;
}

/** Liste de textes non vides, sans doublons. */
function strings(list) {
  return Array.isArray(list) ? [...new Set(list.filter(x => typeof x === 'string' && x))] : [];
}

const newId = () => Math.random().toString(36).slice(2, 8);

/* ---------- Export / import ---------- */

export const exportJSON = config => JSON.stringify(config, null, 2);

/** Texte d'un fichier exporté -> config. Lève une erreur si ce n'est pas une config. */
export const importJSON = text => checkImported(JSON.parse(text));

function checkImported(raw) {
  if (!Array.isArray(raw?.stops)) throw new Error('Configuration invalide');
  return normalizeConfig(raw);
}

/** Config -> texte court pour un lien : JSON compressé (CompressionStream natif) puis base64url. */
export async function encodeConfig(config) {
  const stream = new Blob([JSON.stringify(config)]).stream().pipeThrough(new CompressionStream('deflate'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Inverse de encodeConfig. Lève une erreur si le texte est invalide. */
export async function decodeConfig(text) {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return checkImported(JSON.parse(await new Response(stream).text()));
}

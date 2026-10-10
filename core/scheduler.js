/**
 * Rafraîchissement des données.
 * - Regroupe les arrêts identiques : même arrêt + mêmes types = un seul appel réseau
 *   (ex. Vouvry poste quai A et quai B).
 * - Cadence adaptative : 45 s, ou 5 min si le prochain départ utile est à plus de 30 min.
 * - En cas d'erreur, les dernières données sont gardées.
 * Sans DOM : la pause quand l'onglet est caché est gérée par l'interface (start / stop).
 */
import { fetchBoard as apiFetchBoard } from './api.js';
import { matchesStop, MIN } from './departures.js';

export const REFRESH_MS = 45_000;       // cadence normale (le temps réel de l'API change toutes les ~30 s)
export const SLOW_REFRESH_MS = 5 * MIN; // cadence lente…
export const FAR_MS = 30 * MIN;         // …quand le prochain départ utile est à plus de 30 min
export const BOARD_LIMIT = 40;          // départs demandés par appel, avant les filtres lignes / terminus / quai

/** Deux arrêts avec la même clé partagent le même appel réseau. */
export function groupKey(stop) {
  return `${stop.stationId}|${[...stop.types].sort().join(',')}`;
}

/** Heure du premier départ encore attrapable pour l'un des arrêts du groupe (Infinity si aucun). */
export function nextUsefulTime(departures, stops, now) {
  let next = Infinity;
  for (const stop of stops) {
    const dep = departures.find(d => d.time - stop.walk * MIN >= now && matchesStop(d, stop));
    if (dep && dep.time < next) next = dep.time;
  }
  return next;
}

/** Délai avant le prochain appel : inutile d'interroger souvent l'API pour un départ lointain (pas encore de temps réel). */
export function refreshDelay(departures, stops, now) {
  return nextUsefulTime(departures, stops, now) - now > FAR_MS ? SLOW_REFRESH_MS : REFRESH_MS;
}

/**
 * Crée le planificateur.
 *   onUpdate(key, group) : appelé après chaque appel, réussi ou non.
 *   group = { departures, fetchedAt, error, loading, … }
 *   fetchBoard : remplaçable (tests, autre source de données).
 */
export function createScheduler({ onUpdate, fetchBoard = apiFetchBoard, limit = BOARD_LIMIT } = {}) {
  const groups = new Map(); // clé -> état du groupe
  let stops = [];
  let timer = null;
  let running = false;

  const stopsOf = key => stops.filter(stop => groupKey(stop) === key);

  /** À appeler à chaque changement de la liste d'arrêts. Les données déjà chargées sont conservées. */
  function setStops(newStops) {
    stops = newStops;
    const keys = new Set(stops.map(groupKey));
    for (const key of groups.keys()) if (!keys.has(key)) groups.delete(key);
    for (const key of keys) {
      const group = groups.get(key);
      if (!group) {
        const { stationId, types } = stops.find(stop => groupKey(stop) === key);
        groups.set(key, { stationId, types, departures: [], fetchedAt: 0, error: null, loading: false, nextAt: 0 });
      } else if (group.fetchedAt && !group.error) {
        // filtres ou temps de marche modifiés : la cadence adaptative peut changer
        group.nextAt = group.fetchedAt + refreshDelay(group.departures, stopsOf(key), Date.now());
      }
    }
    if (running) tick();
  }

  async function refresh(key, group) {
    group.loading = true;
    try {
      group.departures = await fetchBoard(group.stationId, group.types, limit);
      group.fetchedAt = Date.now();
      group.error = null;
    } catch (err) {
      group.error = err; // on garde les dernières données
    }
    group.loading = false;
    const now = Date.now();
    group.nextAt = now + (group.error ? REFRESH_MS : refreshDelay(group.departures, stopsOf(key), now));
    if (groups.get(key) === group) onUpdate?.(key, group); // sauf si l'arrêt a été supprimé entre-temps
  }

  /** Rafraîchit les groupes arrivés à échéance, puis programme le prochain réveil. */
  async function tick() {
    clearTimeout(timer);
    if (!running) return;
    const due = [...groups].filter(([, group]) => !group.loading && group.nextAt <= Date.now());
    await Promise.all(due.map(([key, group]) => refresh(key, group)));
    if (!running) return;
    const waits = [...groups.values()].filter(group => !group.loading).map(group => group.nextAt - Date.now());
    clearTimeout(timer);
    if (waits.length) timer = setTimeout(tick, Math.max(1000, Math.min(...waits)));
  }

  return {
    setStops,
    get: key => groups.get(key),
    start() { running = true; tick(); },
    stop() { running = false; clearTimeout(timer); },
    /** Rafraîchit tout immédiatement (ex. retour du réseau). */
    refreshNow() {
      for (const group of groups.values()) group.nextAt = 0;
      tick();
    },
  };
}

/**
 * Calculs sur les départs : filtres d'un arrêt, heure à laquelle quitter la maison, état d'affichage.
 * Fonctions pures (ni DOM, ni réseau) : réutilisables telles quelles sur un Raspberry Pi.
 *
 * Toutes les heures sont des timestamps en millisecondes.
 *   heure de départ maison (leaveAt)  = départ réel - temps de marche - avance
 *   dernière chance (lastChance)      = départ réel - temps de marche
 *                                       (en partant plus tard, on rate le départ)
 */

export const MIN = 60_000;
export const MAX_SHOWN = 4; // départs affichés par arrêt
export const SOON_MIN = 3;  // orange à partir de 3 min restantes

/** Le départ correspond-il aux filtres de l'arrêt ? Une liste vide (ou un quai vide) = pas de filtre. */
export function matchesStop(dep, stop) {
  return (!stop.lines.length || stop.lines.includes(dep.line))
    && (!stop.destinations.length || stop.destinations.includes(dep.to))
    && (!stop.platform || dep.platform === stop.platform);
}

/**
 * Départs d'un arrêt, filtrés, avec leurs heures calculées (dans l'ordre des départs).
 * À appeler seulement quand les données ou la config changent, pas à chaque seconde.
 */
export function planStop(departures, stop, margin) {
  return departures
    .filter(dep => matchesStop(dep, stop))
    .map(dep => ({
      ...dep,
      leaveAt: dep.time - (stop.walk + margin) * MIN,
      lastChance: dep.time - stop.walk * MIN,
    }));
}

/** Départs encore attrapables à pied : les `max` premiers. */
export function visible(plans, now, max = MAX_SHOWN) {
  return plans.filter(plan => plan.lastChance >= now).slice(0, max);
}

/**
 * État d'un départ à l'instant `now` :
 *   minutes  minutes avant de devoir partir (arrondi vers le bas, comme affiché)
 *   spare    minutes d'avance à l'arrêt si on part maintenant
 *   state    'ok'   vert, plus de 3 min
 *            'soon' orange, 3 min ou moins
 *            'go'   rouge « Partez ! » : de l'heure de départ maison jusqu'à la dernière chance.
 *                   On arrivera avec moins d'avance que souhaité, mais on attrape encore le départ.
 */
export function status(plan, now) {
  const minutes = Math.floor((plan.leaveAt - now) / MIN);
  const spare = Math.max(0, Math.floor((plan.lastChance - now) / MIN));
  const state = minutes <= 0 ? 'go' : minutes <= SOON_MIN ? 'soon' : 'ok';
  return { state, minutes, spare };
}

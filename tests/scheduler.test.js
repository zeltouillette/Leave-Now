// Tests du regroupement des appels et de la cadence de rafraîchissement. Lancer avec : node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createScheduler, groupKey, refreshDelay, REFRESH_MS, SLOW_REFRESH_MS } from '../core/scheduler.js';
import { normalizeConfig } from '../core/config.js';
import { MIN } from '../core/departures.js';

// Les 4 arrêts de Vouvry
const [posteA, posteB, gare, riond] = normalizeConfig({
  stops: [
    { stationId: '8570593', types: ['bus'], platform: 'A', lines: ['B 120', 'B 121'], walk: 5 },
    { stationId: '8570593', types: ['bus'], platform: 'B', walk: 5 },
    { stationId: '8501424', types: ['train'], walk: 8 },
    { stationId: '8579180', types: ['bus'], destinations: ['Miex, Le Flon'], walk: 2 },
  ],
}).stops;

test('quais A et B du même arrêt : même groupe ; l’ordre des types ne compte pas', () => {
  assert.equal(groupKey(posteA), groupKey(posteB));
  assert.notEqual(groupKey(posteA), groupKey(gare));
  assert.equal(groupKey({ stationId: '1', types: ['bus', 'train'] }), groupKey({ stationId: '1', types: ['train', 'bus'] }));
});

test('rafraîchissement adaptatif : 45 s si un départ utile approche, sinon 5 min', () => {
  const now = Date.now();
  const dep = (inMinutes, platform = 'B') => ({ line: 'B 120', to: 'X', platform, time: now + inMinutes * MIN });
  assert.equal(refreshDelay([dep(10)], [posteB], now), REFRESH_MS);
  assert.equal(refreshDelay([dep(40)], [posteB], now), SLOW_REFRESH_MS);
  assert.equal(refreshDelay([], [posteB], now), SLOW_REFRESH_MS);
  // départ dans 3 min : plus attrapable avec 5 min de marche, c'est le suivant qui compte
  assert.equal(refreshDelay([dep(3), dep(45)], [posteB], now), SLOW_REFRESH_MS);
  // un départ du quai A ne compte pas pour le quai B…
  assert.equal(refreshDelay([dep(10, 'A'), dep(45)], [posteB], now), SLOW_REFRESH_MS);
  // …sauf si le quai A fait partie du même groupe
  assert.equal(refreshDelay([dep(10, 'A'), dep(45)], [posteA, posteB], now), REFRESH_MS);
});

test('un seul appel par groupe : 4 arrêts -> 3 appels', async () => {
  const calls = [];
  let scheduler;
  await new Promise(resolve => {
    let updates = 0;
    scheduler = createScheduler({
      fetchBoard: async stationId => { calls.push(stationId); return []; },
      onUpdate: () => { if (++updates === 3) resolve(); },
    });
    scheduler.setStops([posteA, posteB, gare, riond]);
    scheduler.start();
  });
  scheduler.stop();
  assert.deepEqual(calls.sort(), ['8501424', '8570593', '8579180']);
});

test('erreur réseau : les dernières données sont gardées', async () => {
  const data = [{ line: 'B 120', to: 'X', platform: 'B', time: Date.now() + 10 * MIN }];
  let offline = false;
  let notify;
  const updated = () => new Promise(resolve => { notify = resolve; });
  const scheduler = createScheduler({
    fetchBoard: async () => { if (offline) throw new Error('hors ligne'); return data; },
    onUpdate: () => notify(),
  });
  scheduler.setStops([posteB]);

  let next = updated();
  scheduler.start();
  await next;

  offline = true;
  next = updated();
  scheduler.refreshNow();
  await next;
  scheduler.stop();

  const group = scheduler.get(groupKey(posteB));
  assert.equal(group.departures, data);
  assert.ok(group.error);
  assert.ok(group.fetchedAt > 0);
});

// Tests de la logique de calcul. Lancer avec : node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBoard, normalizeDeparture, parseApiDate } from '../core/api.js';
import { matchesStop, planStop, visible, status } from '../core/departures.js';
import { normalizeConfig, effectiveMargin } from '../core/config.js';

// Heure suisse du samedi 10.10.2026 (UTC+2) : at('10:45') ou at('10:45:30')
const at = time => Date.parse(`2026-10-10T${time.length === 5 ? `${time}:00` : time}+02:00`);

// Départ brut, au format renvoyé par l'API
function raw({ category = 'B', number, to, platform = '', time, delay = null, prognosis = null }) {
  return {
    category, number, to,
    stop: { departureTimestamp: at(time) / 1000, delay, platform, prognosis: { departure: prognosis, platform: null } },
  };
}

// Arrêt de test, complété par les valeurs par défaut
const stop = fields => normalizeConfig({ stops: [{ stationId: '1', ...fields }] }).stops[0];

// Départs réellement observés à Vouvry, poste
const POSTE = normalizeBoard([
  raw({ number: '120', to: 'Lavey-les-Bains, Et. Thermal', platform: 'B', time: '10:43', delay: 2, prognosis: '2026-10-10T10:45:00+0200' }),
  raw({ number: '121', to: 'Aigle, gare', platform: 'B', time: '11:13' }),
  raw({ number: '120', to: 'Villeneuve VD, gare', platform: 'A', time: '11:18' }),
  raw({ number: '131', to: 'Miex, Le Flon', platform: 'A', time: '11:20' }),
  raw({ number: '121', to: 'Villeneuve VD, gare', platform: 'A', time: '11:48' }),
  raw({ number: '120', to: 'Monthey, gare CFF', platform: 'B', time: '22:43' }),
  raw({ number: '69', to: 'Martigny, gare', time: '23:55' }), // ligne rare, sans quai
]);

/* ---------- Lecture des données de l'API ---------- */

test('parseApiDate lit le fuseau horaire sans « : » renvoyé par l’API', () => {
  assert.equal(parseApiDate('2026-10-10T10:45:00+0200'), at('10:45'));
  assert.equal(parseApiDate(null), null);
  assert.equal(parseApiDate('n/a'), null);
});

test('heure réelle : prévision en priorité, sinon heure prévue + retard', () => {
  const withPrognosis = normalizeDeparture(raw({ number: '120', to: 'X', time: '10:43', delay: 2, prognosis: '2026-10-10T10:46:00+0200' }));
  assert.equal(withPrognosis.planned, at('10:43'));
  assert.equal(withPrognosis.time, at('10:46'));
  assert.equal(withPrognosis.delay, 3);
  assert.equal(withPrognosis.line, 'B 120');

  const delayOnly = normalizeDeparture(raw({ number: '120', to: 'X', time: '10:43', delay: 2 }));
  assert.equal(delayOnly.time, at('10:45')); // le retard est en minutes, le timestamp en secondes

  const nothing = normalizeDeparture(raw({ number: '120', to: 'X', time: '10:43' }));
  assert.equal(nothing.time, at('10:43'));
  assert.equal(nothing.delay, 0);
});

test('nouveau quai signalé seulement s’il diffère du quai prévu', () => {
  const dep = raw({ category: 'R', number: '91', to: 'Brig', platform: '1', time: '11:06' });
  dep.stop.prognosis.platform = '3';
  assert.equal(normalizeDeparture(dep).newPlatform, '3');
  dep.stop.prognosis.platform = '1';
  assert.equal(normalizeDeparture(dep).newPlatform, null);
});

test('départs triés par heure réelle, départs sans heure ignorés', () => {
  const board = normalizeBoard([
    raw({ number: '1', to: 'A', time: '10:00', delay: 10 }),
    raw({ number: '2', to: 'B', time: '10:05' }),
    { stop: {} },
    null,
  ]);
  assert.deepEqual(board.map(d => d.line), ['B 2', 'B 1']);
});

/* ---------- Filtres (cas réels de Vouvry) ---------- */

test('Vouvry poste, quai A + lignes 120/121 : vers Villeneuve, sans le 131 vers Miex', () => {
  const kept = POSTE.filter(d => matchesStop(d, stop({ platform: 'A', lines: ['B 120', 'B 121'] })));
  assert.deepEqual(kept.map(d => `${d.line} ${d.to}`), ['B 120 Villeneuve VD, gare', 'B 121 Villeneuve VD, gare']);
});

test('Vouvry poste, quai B seul : garde le 121 vers Aigle et le 120 vers Monthey', () => {
  const kept = POSTE.filter(d => matchesStop(d, stop({ platform: 'B' })));
  assert.deepEqual(kept.map(d => d.to), ['Lavey-les-Bains, Et. Thermal', 'Aigle, gare', 'Monthey, gare CFF']);
});

test('filtre par destination (Riond Vert : uniquement vers Miex)', () => {
  const kept = POSTE.filter(d => matchesStop(d, stop({ destinations: ['Miex, Le Flon'] })));
  assert.deepEqual(kept.map(d => d.line), ['B 131']);
});

test('sans filtre, tous les départs sont gardés (y compris sans quai)', () => {
  assert.equal(POSTE.filter(d => matchesStop(d, stop({}))).length, POSTE.length);
});

/* ---------- Heure de départ maison et affichage ---------- */

// Bus à 10:30, 5 min à pied, 5 min d'avance -> partir à 10:20, dernière chance 10:25
const BUS = normalizeBoard([raw({ number: '120', to: 'X', time: '10:30' })]);
const [plan] = planStop(BUS, stop({ walk: 5 }), 5);

test('heure de départ maison = départ réel - marche - avance', () => {
  assert.equal(plan.leaveAt, at('10:20'));
  assert.equal(plan.lastChance, at('10:25'));
});

test('couleurs : vert > 3 min, orange ≤ 3 min, rouge « Pars ! » ensuite', () => {
  assert.deepEqual(status(plan, at('10:10')), { state: 'ok', minutes: 10, spare: 15 });
  assert.equal(status(plan, at('10:16:00')).state, 'ok');   // 4 min pile
  assert.deepEqual(status(plan, at('10:16:30')), { state: 'soon', minutes: 3, spare: 8 });
  assert.equal(status(plan, at('10:18:59')).state, 'soon'); // 1 min 01 s
  assert.deepEqual(status(plan, at('10:19:30')), { state: 'go', minutes: 0, spare: 5 });
});

test('masquage souple : « Pars ! » pendant l’avance, masqué après la dernière chance', () => {
  assert.deepEqual(status(plan, at('10:23:30')), { state: 'go', minutes: -4, spare: 1 });
  assert.equal(status(plan, at('10:24:30')).spare, 0);
  assert.equal(visible([plan], at('10:25:00')).length, 1);
  assert.equal(visible([plan], at('10:25:01')).length, 0);
});

test('4 départs maximum, les plus proches encore attrapables', () => {
  const board = normalizeBoard(['10:00', '10:10', '10:20', '10:30', '10:40', '10:50']
    .map(time => raw({ number: '120', to: 'X', time })));
  const shown = visible(planStop(board, stop({ walk: 5 }), 2), at('10:06'));
  assert.equal(shown.length, 4);
  assert.equal(shown[0].time, at('10:20')); // 10:10 : il faudrait être parti à 10:05
});

test('l’avance d’un arrêt remplace l’avance globale (même 0)', () => {
  assert.equal(effectiveMargin({ margin: null }, { margin: 5 }), 5);
  assert.equal(effectiveMargin({ margin: 10 }, { margin: 5 }), 10);
  assert.equal(effectiveMargin({ margin: 0 }, { margin: 5 }), 0);
});

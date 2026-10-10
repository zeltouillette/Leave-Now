// Tests de la configuration et de l'export / import. Lancer avec : node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStop, decodeConfig, defaultConfig, encodeConfig, exportJSON, importJSON, normalizeConfig,
} from '../core/config.js';

const VOUVRY = normalizeConfig({
  margin: 5,
  stops: [
    { stationId: '8570593', stationName: 'Vouvry, poste', label: 'Bus → Villeneuve', types: ['bus'], lines: ['B 120', 'B 121'], platform: 'A', walk: 5 },
    { stationId: '8570593', stationName: 'Vouvry, poste', label: 'Bus → Lavey / Aigle', types: ['bus'], platform: 'B', walk: 5 },
    { stationId: '8501424', stationName: 'Vouvry', label: 'Train', types: ['train'], walk: 8, margin: 10 },
    { stationId: '8579180', stationName: 'Vouvry, Riond Vert', label: 'Bus → Miex', types: ['bus'], destinations: ['Miex, Le Flon'], walk: 2 },
  ],
});

test('config absente ou illisible -> config par défaut', () => {
  assert.deepEqual(normalizeConfig(null), defaultConfig());
  assert.deepEqual(normalizeConfig('texte'), defaultConfig());
});

test('valeurs invalides remplacées, types inconnus et doublons retirés', () => {
  const config = normalizeConfig({
    margin: -3,
    lang: 4,
    stops: [
      { stationId: 8570593, walk: 'abc', types: ['bus', 'fusée'], lines: ['B 120', 'B 120', ''], margin: '' },
      { label: 'arrêt sans identifiant' },
    ],
  });
  assert.equal(config.margin, 5);
  assert.equal(config.lang, 'fr');
  assert.equal(config.stops.length, 1);
  const [stop] = config.stops;
  assert.equal(stop.stationId, '8570593');
  assert.equal(stop.walk, 5);
  assert.deepEqual(stop.types, ['bus']);
  assert.deepEqual(stop.lines, ['B 120']);
  assert.equal(stop.margin, null);
});

test('identifiants d’arrêts en double corrigés', () => {
  const config = normalizeConfig({ stops: [{ id: 'a', stationId: '1' }, { id: 'a', stationId: '2' }] });
  assert.notEqual(config.stops[0].id, config.stops[1].id);
});

test('nouvel arrêt : type pré-rempli d’après l’icône de l’arrêt', () => {
  assert.deepEqual(createStop({ id: '8501424', name: 'Vouvry', icon: 'train' }).types, ['train']);
  assert.deepEqual(createStop({ id: '1', name: 'X', icon: 'inconnu' }).types, []);
});

test('export fichier puis import : config identique', () => {
  assert.deepEqual(importJSON(exportJSON(VOUVRY)), VOUVRY);
});

test('import : refuse ce qui n’est pas une config', () => {
  assert.throws(() => importJSON('{"a": 1}'));
  assert.throws(() => importJSON('pas du json'));
});

test('lien : encodage puis décodage sans perte, texte court et sûr dans une adresse', async () => {
  const code = await encodeConfig(VOUVRY);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.ok(code.length < 800, `lien trop long : ${code.length} caractères`);
  assert.deepEqual(await decodeConfig(code), VOUVRY);
});

test('lien invalide -> erreur', async () => {
  await assert.rejects(decodeConfig('abc'));
});

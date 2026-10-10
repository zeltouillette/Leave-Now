import { test } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../i18n/fr.js';
import { LANGUAGES } from '../i18n/index.js';

/** Variables d'un texte, triées : 'quai {p}' -> ['{p}']. */
const vars = text => (text.match(/\{\w+\}/g) ?? []).sort();

// Chaque langue activée dans LANGUAGES est vérifiée, y compris celles ajoutées plus tard.
for (const code of Object.keys(LANGUAGES).filter(code => code !== 'fr')) {
  test(`${code} : mêmes textes et mêmes variables qu'en français`, async () => {
    const texts = (await import(`../i18n/${code}.js`)).default;
    assert.deepEqual(Object.keys(texts).sort(), Object.keys(fr).sort());
    for (const key of Object.keys(fr)) {
      assert.equal(typeof texts[key], 'string', key);
      assert.ok(texts[key].trim(), `${key} est vide`);
      assert.deepEqual(vars(texts[key]), vars(fr[key]), key);
    }
  });
}

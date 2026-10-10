/**
 * Traductions. Pour ajouter une langue (ex. allemand) :
 *   1. copier fr.js en de.js et traduire les textes (garder les {n}, {name}…) ;
 *   2. l'ajouter dans LANGUAGES ci-dessous ;
 *   3. ajouter 'i18n/de.js' à la liste FILES de sw.js (fonctionnement hors ligne).
 * Sans DOM : réutilisable aussi avec Node.
 */
import fr from './fr.js';

/** Langues disponibles : code -> nom affiché dans les réglages. */
export const LANGUAGES = {
  fr: 'Français',
  // de: 'Deutsch',
  // it: 'Italiano',
  // en: 'English',
};

let current = 'fr';
let texts = fr;

/** Charge une langue (code inconnu -> français). Seule la langue choisie est téléchargée. */
export async function setLang(code) {
  current = code in LANGUAGES ? code : 'fr';
  texts = current === 'fr' ? fr : (await import(`./${current}.js`)).default;
}

export const lang = () => current;

/** Texte traduit ; {n}, {name}… remplacés par les valeurs de `vars`. Texte manquant -> version française. */
export function t(key, vars = {}) {
  const text = texts[key] ?? fr[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

// Sauvegarde de la config sur l'appareil (localStorage) : pas de compte, pas de serveur.
import { defaultConfig, normalizeConfig } from '../core/config.js';

const KEY = 'departs-config';

export function load() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return normalizeConfig(JSON.parse(saved));
  } catch {
    // stockage indisponible ou illisible : on repart de zéro
  }
  // première visite : langue du navigateur (le français si elle n'est pas disponible)
  return { ...defaultConfig(), lang: navigator.language.slice(0, 2) };
}

export function save(config) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // navigation privée, espace plein… : la config reste valable jusqu'à la fermeture
  }
}

// Traductor del proceso main: lee el idioma de `prefs.language` (o del env
// `MANGACOUNT_LANG` en tests) y cachea el traductor por idioma.
import { createAppTranslator, resolveLanguage } from '../../../shared/i18n/index.js';
import { loadResolvedPrefs } from './prefs.js';

let cached = { language: null, t: null };

export function getTranslator(dataDir) {
  const language = resolveLanguage({ prefs: loadResolvedPrefs(dataDir) });
  if (cached.language !== language) {
    cached = { language, t: createAppTranslator(language) };
  }
  return cached.t;
}

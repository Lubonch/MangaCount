// Main-process translator: reads the language from `prefs.language` (or the env
// `MANGACOUNT_LANG` in tests) and caches the translator per language.
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

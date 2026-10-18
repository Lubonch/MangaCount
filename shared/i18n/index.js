export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'es'];

import en from './en.js';
import es from './es.js';

export const dictionaries = { en, es };

export function interpolate(template, params) {
  if (!params) return template;
  return String(template).replace(/\{(\w+)\}/g, (_match, key) =>
    params[key] == null ? `{${key}}` : String(params[key])
  );
}

export function createTranslator(locale, dictionaries = {}) {
  const primary = dictionaries[locale] ?? {};
  const fallback = dictionaries[DEFAULT_LANGUAGE] ?? {};
  return (key, params) => interpolate(primary[key] ?? fallback[key] ?? key, params);
}

// Traductor con los diccionarios incluidos (para renderer, main y bot).
export function createAppTranslator(locale) {
  return createTranslator(locale, dictionaries);
}

// Prioridad: explicit → MANGACOUNT_LANG (tests) → prefs.language → 'en'.
// `process` no existe en el renderer: se accede de forma segura.
export function resolveLanguage({ explicit, env, prefs } = {}) {
  const fromEnv =
    env ?? (typeof process !== 'undefined' ? process.env?.MANGACOUNT_LANG : undefined);
  const candidates = [explicit, fromEnv, prefs?.language];
  for (const candidate of candidates) {
    if (SUPPORTED_LANGUAGES.includes(candidate)) return candidate;
  }
  return DEFAULT_LANGUAGE;
}

// Claves presentes en `a` y ausentes en `b` (test de paridad).
export function missingKeys(a, b) {
  const other = new Set(Object.keys(b ?? {}));
  return Object.keys(a ?? {}).filter((key) => !other.has(key));
}

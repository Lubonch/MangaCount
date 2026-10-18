import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { appConfigGet } from '../api/localAdapter';
import { createAppTranslator, resolveLanguage } from '@shared/i18n/index.js';

// `globalThis.__MANGACOUNT_LANG__` is a test seam: the renderer cannot read
// `process.env`, so tests pin the language here (see src/test/setup.js).
const envLanguage = () => globalThis.__MANGACOUNT_LANG__;
const fallbackLanguage = () => resolveLanguage({ env: envLanguage() });
const initial = fallbackLanguage();

const I18nContext = createContext({
  language: initial,
  t: createAppTranslator(initial),
  setLanguage: () => {},
});

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(initial);

  useEffect(() => {
    let active = true;
    appConfigGet()
      .then((config) => {
        if (active) setLanguage(resolveLanguage({ explicit: config?.language, env: envLanguage() }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t: createAppTranslator(language) }),
    [language]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useContext(I18nContext).t;
}

export default I18nContext;

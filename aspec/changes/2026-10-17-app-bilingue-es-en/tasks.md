# Tasks: App bilingüe (ES/EN) con inglés por defecto

## Fase 1 — Infra i18n y preferencia

- [x] Crear `shared/i18n/{en,es}.js` (claves con namespace) y `shared/i18n/index.js`
      (`DEFAULT_LANGUAGE='en'`, `createTranslator`, `resolveLanguage`, `missingKeys`, interpolación `{n}`).
- [x] `prefs.js`: `prefs.language: 'en'` en los defaults (expuesto por `app:config-get/set`).
- [x] `shared/i18n/i18n.test.js`: interpolación, fallback a `en`, default y **paridad de claves** ES/EN.

## Fase 2 — Renderer

- [x] `I18nContext.jsx`: provider que lee el idioma (de `appConfigGet`) y expone `useT()`; al cambiar la
      preferencia se re-renderiza.
- [ ] Migrar los componentes (JSX, `title`/`aria-label`/`placeholder`, mensajes de error) a `t()`.
- [x] Selector **Idioma** (`English`/`Español`) en Settings → General.
- [x] Tests: provider (default EN, cambio a ES) y componentes clave.

## Fase 3 — Main

- [ ] `getTranslator(dataDir)` (cacheado por idioma) y uso en los `throw new Error(...)` visibles por IPC.
- [ ] Traducir menú del tray, diálogos nativos y mensajes de update.
- [ ] `package.json`: script de tests del main con `MANGACOUNT_LANG=es` (pinneo) y tests de i18n del main.

## Fase 4 — Bot

- [ ] Traducir descripciones y respuestas del bot con el traductor (los **nombres** de comandos no se
      traducen).
- [ ] Tests: respuesta en ES y en EN.

## Fase 5 — Docs (movida a #126)

- [x] El README bilingüe se hace en `2026-10-18-readme-bot-actualizado` (#126), no en este change.

## Fase 6 — Verificación

- [x] Renderer: `setup.js` fija el idioma a `es` para no romper los asserts existentes.
- [ ] `npm test` en verde (main con `MANGACOUNT_LANG=es`).
- [ ] `npm run test:coverage` en verde (main ≥90%).
- [ ] `npm run test:renderer:coverage` en verde (≥90%).
- [ ] `npm run lint:renderer` sin errores.
- [ ] `npm run build:renderer` sin errores.
- [ ] Verificación manual: instalación nueva arranca en **inglés**; al cambiar a **Español** la UI, los
      errores del main y las respuestas del bot quedan en español; reiniciar conserva el idioma.
- [ ] Revisión de traducciones EN con el usuario (el ES sale de los strings actuales).

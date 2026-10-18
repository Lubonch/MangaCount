# Design: i18n ES/EN con inglés por defecto

## Approach

Diccionarios **compartidos** (`shared/`) consumidos por el renderer y el main, con una preferencia de
idioma en `prefs` y **default `en`**. El diccionario **ES sale 1:1 de los strings actuales**; el EN es
nuevo.

### 1. Diccionarios y helper (`shared/i18n/`)

- `en.json`, `es.json`: claves planas con namespace, p. ej.
  `{"settings.general.title": "General", "bot.limit.enabled": "Limit /pendientes"}`.
- `index.js`:
  ```js
  export const DEFAULT_LANGUAGE = 'en';
  export const SUPPORTED_LANGUAGES = ['en', 'es'];
  export function createTranslator(locale, dicts) {           // dicts = { en, es }
    const primary = dicts[locale] ?? {};
    const fallback = dicts[DEFAULT_LANGUAGE] ?? {};
    return (key, params) => interpolate(primary[key] ?? fallback[key] ?? key, params);
  }
  export function resolveLanguage({ explicit, env, prefs } = {}) {
    // prioridad: explicit → MANGACOUNT_LANG (tests) → prefs.app.language → 'en'
  }
  export function missingKeys(a, b) { /* paridad de claves */ }
  ```
- Interpolación simple `{n}` (sin ICU).

### 2. Preferencia (`prefs.js`)

- `app.language: 'en'` en los defaults (junto a `startInTray`, `updateCheck`, …).
- Se expone por los canales ya existentes `app:config-get` / `app:config-set`.

### 3. Renderer

- `I18nProvider` (contexto) que recibe el idioma (desde `appConfigGet()`) y expone `useT()`.
- Los componentes usan `const t = useT()` para JSX, `title`/`aria-label`/`placeholder` y mensajes.
- Selector **Idioma** en Settings → General (`English` / `Español`); al cambiar, `appConfigSet` y
  re-render del provider.
- Fallback: locale → `en` → la clave.

### 4. Main

- `getTranslator(dataDir)`: lee `prefs.app.language` (cacheado por idioma; se invalida si cambia).
- Se usa en los `throw new Error(...)` visibles por IPC, el menú del tray, los diálogos y los mensajes
  de update.
- El bot usa el mismo traductor para sus respuestas.

### 5. Docs

- `README.md` en inglés (default) y `README.es.md` en español, con un aviso arriba
  (`Read this in: [English](README.md) · [Español](README.es.md)`), misma estructura y badges.

### 6. Tests

- **Renderer**: `setup.js` fija el idioma a `es` (o el provider por defecto en tests) → los asserts en
  español existentes siguen valiendo.
- **Main**: el script `npm test` corre con `MANGACOUNT_LANG=es` → los 48 mensajes salen en español y los
  36 archivos con asserts siguen pasando. El default de producción sigue siendo `en`.
- Tests nuevos: default EN, cambio de idioma, y **paridad de claves** ES/EN (`missingKeys` vacío).

## Architecture

```
prefs.app.language (default 'en')
        │
        ├─ renderer: I18nProvider(app:config-get) ─► useT() ─► componentes
        ├─ main:     getTranslator(dataDir) ─► throws / tray / diálogos / update
        └─ bot:      getTranslator ─► respuestas

shared/i18n/{en,es}.json  ◄── paridad de claves (test)
```

Archivos:

- **Nuevo**: `shared/i18n/{index.js,en.json,es.json}`, `shared/i18n/i18n.test.js`,
  `mangacount.client/src/contexts/I18nContext.jsx` (+ tests).
- **Modificar**: `electron/main/services/prefs.js`, `electron/main/ipc/handlers.js`,
  `electron/main/index.js` (tray/diálogos), `electron/main/services/{updates,update-controller,backup,covers,search}.js`,
  `electron/main/services/discord-bot.js`, `mangacount.client/src/components/*` (+ `App.jsx`),
  `mangacount.client/src/test/setup.js`, `package.json` (script de tests con `MANGACOUNT_LANG=es`),
  `README.md`, `README.es.md`.

## Validation

- **Default**: una instalación nueva arranca en **inglés** (renderer, main y bot).
- **Cambio de idioma**: al elegir “Español” en Settings, la UI y los mensajes del main pasan a español
  sin recargar; persiste en `preferences.json`.
- **Paridad**: `missingKeys('es','en')` y `missingKeys('en','es')` vacíos (ninguna clave sin traducir).
- **Sin strings olvidados**: un componente migrado no debe contener literales en español (revisión).
- **Bot**: respuestas en el idioma configurado.
- **README**: ambos archivos presentes, cross-linkeados y con la misma estructura.
- **Tests existentes**: verdes sin cambios de asserts (locale pineado a `es`).
- **Gates**: `npm test`, `npm run test:coverage`, `npm run test:renderer:coverage`,
  `npm run lint:renderer`, `npm run build:renderer`.

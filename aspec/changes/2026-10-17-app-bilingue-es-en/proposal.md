# Proposal: App bilingüe (ES/EN) con inglés por defecto

## Problem

La interfaz está **solo en español** (strings hardcodeados en el renderer, en el proceso main y en el
bot) y el README está **solo en español**. Se quiere **ES + EN** con **inglés por defecto**, elegible
desde Settings, y el README en ambos idiomas.

Alcance real relevado:

- Renderer: ~9 componentes con texto en español (~55 atributos `title`/`aria-label`/`placeholder` +
  textos JSX + mensajes de error).
- Main: **48** `throw new Error(...)` (varios visibles por IPC) + menú del tray, diálogos nativos y
  mensajes de update.
- Bot: ~180 strings (los **nombres** de comandos no se traducen; sí descripciones y respuestas).
- Docs: `README.md` (300 líneas) y `docs/desktop.md` (244).
- Tests: **36 archivos** con asserts de texto en español.

## Proposed change

i18n por fases, con **diccionarios compartidos** entre renderer y main:

1. **Infra + preferencia**: `shared/i18n/{en,es}.json` + `t(key, params)`; `app.language` en `prefs`
   (**default `en`**), expuesto por `app:config-get/set`; selector de idioma en Settings → General.
2. **Renderer**: migrar los componentes a `t()` (JSX, atributos y errores) vía un `I18nProvider`.
3. **Main**: traducir los 48 mensajes de error + tray + diálogos + update con el mismo diccionario.
4. **Bot**: traducir las respuestas (descripciones y textos), no los nombres de comandos.
5. **Docs**: `README.md` en **inglés** (default) + `README.es.md` en español, cross-linkeados.
6. **Tests**: **pinear el locale a `es`** (setup del renderer + `MANGACOUNT_LANG=es` en el script de
   tests del main) para que los 36 archivos con asserts en español sigan pasando, y agregar tests de
   i18n (default EN, cambio de idioma, paridad de claves ES/EN).

**Validación de traducciones**: el diccionario **ES se deriva 1:1 de los strings actuales** (ya
validados); el **EN es nuevo** y queda para revisión del usuario.

## Scope

**In scope**

- `shared/i18n/` (diccionarios + helper) y su consumo en renderer y main.
- `prefs` (`app.language`, default `en`) + selector en Settings.
- Migración de strings del renderer, main y bot.
- `README.md` (EN) + `README.es.md` (ES).
- Tests de i18n + pinneo del locale en los tests existentes.

**Out of scope**

- `docs/desktop.md` y `CHANGELOG.md` quedan en español (se pueden traducir en un change aparte).
- Idiomas adicionales (pt, fr…) o detección automática por sistema operativo.
- i18n de logs internos (no son user-facing).
- Pluralización compleja / ICU (se usa interpolación simple `{n}`).

## Risks

- **Regresión masiva de tests** (36 archivos con texto ES): mitigación → pinear el locale a `es` en el
  entorno de tests; el default de producción sigue siendo `en`.
- **Strings olvidados** (quedan en español): mitigación → test de paridad de claves ES/EN y revisión por
  componente; un string hardcodeado se ve como “faltante” en el test de paridad si se agrega al diccionario.
- **Mensajes del main traducidos tarde** (prefs cambia en caliente): mitigación → leer el idioma en cada
  llamada (o invalidar el cache al cambiar `app.language`).
- **Traducciones que no convencen**: mitigación → ES = strings actuales; EN nuevo revisado por el usuario
  antes de cerrar el change.
- **README bilingüe desincronizado**: mitigación → mantener ambos con la misma estructura y un aviso de
  idioma arriba.

# Proposal: Copiar diagnóstico (exportar estado + log)

> Change aparte, a pedido. La observabilidad (handlers globales de error + contexto en el log) vive en
> `2026-10-15-update-check-y-diagnostico`; acá va **la herramienta para que el usuario exporte** ese
> diagnóstico y lo pegue en un reporte.

## Problem

Cuando algo falla, recolectar el estado para reportarlo es manual: hay que encontrar la carpeta de
logs, abrir `app.txt` y copiar a mano. Con el logging nuevo (versión/OS + errores capturados) hay más
información útil, pero **el usuario no tiene forma fácil de exportarla** y terminás pidiendo
"pegame el log". Se quiere un botón que **copie al portapapeles** un diagnóstico corto.

## Proposed change

- **Sección “Diagnóstico” en Settings**, **toggleable**:
  - Toggle **“Habilitar diagnóstico”** (`diagnosticsCopy`, persistido en `prefs.js`, **default ON**).
  - Cuando está **ON**, muestra:
    - **[Copiar diagnóstico]** → copia al portapapeles un texto con: `MangaCount vX · <plataforma>/<arch> · <locale>`,
      rutas relevantes (`userData`) y las **últimas N líneas** del log (`app.txt`).
    - **[Abrir carpeta de logs]** (`shell.openPath`).
  - Cuando está **OFF**, no se muestran esos botones.
- **Canal IPC `diagnostics:copy`** (main): arma el texto (versión + OS/arch + último tramo del log) y lo
  copia con `clipboard.writeText`; devuelve `{ copied:true, preview }` para que la UI confirme
  (“Copiado ✓”).
- **Límite**: se copian solo las **últimas N líneas** (p. ej. 100) para no volcar un log enorme.
- **Sin secretos**: el log ya no contiene el token; el resumen no agrega datos sensibles.

## Scope

In scope:

- Toggle `diagnosticsCopy` (default ON) en Settings + persistencia.
- Handlers `diagnostics:copy` (+ opcional `diagnostics:open-logs`) y su whitelist en `preload.cjs` /
  `localAdapter.js`.
- UI en Settings (sección “Diagnóstico”) con los botones gated por el toggle.
- Docs (`README`/`docs/desktop.md`) y `CHANGELOG`.
- Tests: `diagnostics:copy` arma el texto con versión/OS y las últimas líneas (log temporal), respeta
  el límite de líneas; el toggle oculta/muestra los botones.

Out of scope:

- Envío automático/telemetría (todo local, iniciado por el usuario).
- Adjuntar el `.db` o backups (solo se copia texto: versión + log).
- Sanitización avanzada de rutas (se documenta que el log puede contener rutas locales).

## Risks

- **Privacidad**: el log puede contener rutas locales del usuario. Mitigación: es una acción **manual**
  del usuario (él decide copiar/pegar); se documenta.
- **Clipboard grande**: volcar todo el log. Mitigación: límite de N líneas.
- **Toggle OFF por error deja sin diagnóstico**: el default es ON; el toggle es solo para esconderlo.

## Decisiones pendientes

- **Default del toggle**: ON (asumido) vs OFF.
- **N de líneas** copiadas: 100 (asumido).
- ¿Incluir también **“Abrir carpeta de logs”** junto a “Copiar diagnóstico”? (asumido que sí, mismo toggle).

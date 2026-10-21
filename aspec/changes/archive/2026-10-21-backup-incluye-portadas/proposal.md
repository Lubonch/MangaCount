# Proposal: El backup integrado incluye las portadas (`covers/`)

## Problem

El backup integrado (`electron/main/services/backup.js`) guarda `manifest.json`, `mangacount.db` y
`profiles/`, pero **no** el cache de portadas `<userData>/covers/`. La base referencia esos archivos
en `MangaExternalRef.CoverFile`, así que al restaurar en otra PC las portadas quedan rotas: los
mangas aparecen sin imagen y las portadas locales no se pueden regenerar solas.

Hoy la única forma de conservar todas las imágenes es el backup manual copiando la carpeta
`userData` completa con la app cerrada (`docs/desktop.md:210`), que no es el flujo que ofrece la app.

## Proposed change

- Incluir la carpeta `covers/` (con subdirectorios) en el `.zip` del backup, junto a `profiles/`.
- En el restore, reemplazar **también** `covers/` (borrar el cache actual y restaurar lo que traiga
  el zip), manteniendo el guard anti zip-slip.
- Documentar que el backup/restore integrado ahora preserva base, fotos de perfil y portadas, y que
  los backups viejos (previos a este cambio) no traen `covers/`.
- Actualizar los tests del servicio para cubrir creación y restore de portadas.

## Scope

In scope:

- `createBackup`: sumar `covers/` al zip.
- `restoreBackup`: reemplazar `profiles/` y `covers/`.
- Tests de `services/backup`.
- Docs (`docs/desktop.md`) y spec de `backup`.

Out of scope:

- Cambiar el formato del `manifest.json` o la retención de 5 backups.
- Incluir `preferences.json` o `logs/` (siguen fuera: la config es de la máquina).
- Backfill de backups ya existentes: no se pueden recuperar portadas que nunca se guardaron.

## Risks

- **Backups viejos sin `covers/`**: al restaurarlos el cache queda vacío (consistente con el
  snapshot, pero se pierden portadas actuales). Mitigación: documentarlo en `docs/desktop.md` y en el
  CHANGELOG; el backup de seguridad previo al restore conserva el estado actual.
- **Tamaño del zip**: las portadas suman peso. Mitigación: ya se comprime con `fflate` (nivel 6) y
  las imágenes suelen ser pequeños JPEG/WebP; el backup manual ya las copiaba.
- **Path traversal al restaurar**: se reutiliza el guard existente para cada carpeta de recursos.
  Mitigación: test de zip-slip extendido a `covers/`.

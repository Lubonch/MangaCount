# Tasks: El backup integrado incluye las portadas (`covers/`)

## 1. Servicio de backup

- [x] Agregar `COVERS_DIR` y `RESOURCE_DIRS = [profiles, covers]` en `electron/main/services/backup.js`.
- [x] En `createBackup`, agregar al zip todos los archivos de `covers/` (incluidos subdirectorios).
- [x] En `restoreBackup`, reemplazar `covers/` además de `profiles/`, reutilizando el guard anti zip-slip.

## 2. Tests

- [x] Cubrir que el zip incluya `covers/<archivo>`.
- [x] Cubrir que el restore reponga portadas y elimine las no incluidas.
- [x] Extender el test de zip-slip a `covers/`.
- [x] Cubrir restore de un backup sin `covers/` (compatibilidad).

## 3. Documentación y spec

- [x] Actualizar `docs/desktop.md` (formato, restore y nota de backups viejos).
- [x] Sincronizar `aspec/specs/backup/spec.md` con el nuevo alcance.
- [x] Agregar la entrada de CHANGELOG y subir la versión a 2.5.1 (`package.json`, lock, PKGBUILD).

## 4. Verificación y release

- [x] `npm test`
- [x] `npm run test:renderer:coverage`
- [x] `npm run lint:renderer`
- [x] `npm run build:renderer`
- [x] Build Linux + `npm run smoke:package` (si el entorno lo permite).
- [x] Archivar el change y mergear a `develop`.
- [x] Abrir PR `develop → main` y crear el tag `v2.5.1`.

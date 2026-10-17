# Tasks: Acotar el file-read de `cover:local` a rutas elegidas por el diálogo

## Fase 1 — Registro de grants

- [ ] Crear `electron/main/services/local-file-grants.js` con `createLocalFileGrants()` (`grant` /
      `consume` de un solo uso, rutas normalizadas con `path.resolve`, fail-closed para strings
      inválidos).
- [ ] Crear `electron/main/services/local-file-grants.test.js`: grant/consume único, ruta no otorgada,
      equivalencia relativa/absoluta y strings vacíos.

## Fase 2 — Cableado en main e IPC

- [ ] `electron/main/index.js`: crear el registro en `initBackend()` y exponerlo como
      `localFileGrants` en el `ctx`.
- [ ] `electron/main/ipc/handlers.js`: `dialog:pick-file` otorga el grant cuando devuelve una ruta
      válida.
- [ ] `electron/main/ipc/handlers.js`: `cover:local` exige `ctx.localFileGrants?.consume(sourcePath)`
      antes de llamar a `linkLocalCover` y devuelve un error claro si no hay grant.

## Fase 3 — Tests de handlers

- [ ] Actualizar el test existente de `cover:local` para otorgar el grant antes de invocar el canal.
- [ ] Agregar test: `cover:local` sin grant rechaza y no escribe en `covers/`.
- [ ] Agregar test: `dialog:pick-file` + `cover:local` vincula; el segundo uso de la misma ruta falla
      por grant consumido.
- [ ] Agregar test: `ctx` sin `localFileGrants` rechaza (fail-closed).

## Fase 4 — Gates y verificación

- [ ] `npm test` en verde.
- [ ] `npm run test:coverage` en verde (main ≥90%).
- [ ] `npm run lint:renderer` sin errores.
- [ ] `npm run build:renderer` sin errores.
- [ ] Verificación manual: elegir una portada local desde el modal sigue funcionando; invocar
      `cover:local` con una ruta no elegida se rechaza.

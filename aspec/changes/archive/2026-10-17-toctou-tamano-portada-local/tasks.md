# Tasks: Re-chequear el tamaño de la portada local después de leerla (TOCTOU)

## Fase 1 — Implementación

- [x] `electron/main/services/covers.js`: agregar `assertCoverSize(bytes)` exportado con el mensaje
      `imagen demasiado grande`.
- [x] `electron/main/services/covers.js`: usar el helper con `info.size` (stat) y con `buffer.length`
      después de `readFile`, cerrando el TOCTOU.

## Fase 2 — Tests

- [x] `electron/main/services/covers.test.js`: test del helper en el límite (`MAX_COVER_BYTES`) y por
      encima.
- [x] Confirmar que los tests existentes de `linkLocalCover` (flujo válido + archivo grande por stat)
      siguen en verde.

## Fase 3 — Gates y verificación

- [x] `npm test` en verde.
- [x] `npm run test:coverage` en verde (main ≥90%).
- [x] `npm run lint:renderer` sin errores.
- [x] `npm run build:renderer` sin errores.

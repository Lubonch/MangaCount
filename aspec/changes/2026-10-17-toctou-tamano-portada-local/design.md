# Design: Re-chequeo de tamaño post-lectura

## Approach

Centralizar el cap en un helper y aplicarlo en los dos puntos del flujo:

```text
linkLocalCover
  ├─ stat(sourcePath) ──► assertCoverSize(info.size)
  ├─ readFile(sourcePath)
  └─ assertCoverSize(buffer.length)   ← nuevo (cierra el TOCTOU)
```

- `assertCoverSize(bytes)` (exportado) lanza `Error('imagen demasiado grande')` si
  `bytes > MAX_COVER_BYTES`.
- El `stat` previo se mantiene: evita leer archivos enormes en el caso normal.
- El re-chequeo posterior es O(1) y solo compara la longitud del buffer ya leído.

## Architecture

Un solo archivo de producción:

- **Modificar**: `electron/main/services/covers.js`
  - nuevo `export function assertCoverSize(bytes)`;
  - `linkLocalCover` lo usa tras `stat` y tras `readFile`.
- **Modificar**: `electron/main/services/covers.test.js`
  - test directo del helper (límite exacto y por encima);
  - los tests existentes de `linkLocalCover` siguen cubriendo el flujo normal y el rechazo por
    `stat`.

Sin cambios en handlers, IPC, renderer ni esquema.

## Validation

- `assertCoverSize(MAX_COVER_BYTES)` no lanza; `assertCoverSize(MAX_COVER_BYTES + 1)` lanza
  `imagen demasiado grande`.
- `linkLocalCover` con un archivo válido sigue vinculando la portada.
- `linkLocalCover` con un archivo mayor al cap sigue rechazando sin escribir en `covers/`.
- **Gates**: `npm test`, `npm run test:coverage` (main ≥90%), `npm run lint:renderer`,
  `npm run build:renderer`.

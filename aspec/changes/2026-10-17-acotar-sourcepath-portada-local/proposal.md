# Proposal: Acotar el file-read de `cover:local` a rutas elegidas por el diálogo

**Issue:** [#98](https://github.com/Lubonch/MangaCount/issues/98) · **Severidad:** Low (auditoría batch 2.2.0)

## Problem

El canal IPC `cover:local` → `linkLocalCover` (`electron/main/services/covers.js:293`) lee el
`sourcePath` que provee el renderer. Las mitigaciones actuales son buenas pero parciales:

- el flujo de UI usa el diálogo nativo (`dialog:pick-file`);
- hay cap de 8 MB con `stat` antes de leer;
- se valida el contenido por **magic bytes** (PNG/JPEG/GIF/WEBP), así que no se puede exfiltrar texto
  ni secretos por `mangacount://covers/…`;
- el nombre de destino es generado.

Sin embargo, el proceso main **no verifica que `sourcePath` provenga del diálogo**. Un renderer
comprometido podría invocar `cover:local` con cualquier ruta absoluta y copiar **cualquier imagen del
disco** al cache de portadas (lectura arbitraria de imágenes, sin consentimiento del usuario).

## Proposed change

Agregar un **grant de un solo uso** por archivo elegido:

1. `dialog:pick-file` registra en el proceso main la ruta devuelta por el diálogo (solo si es un
   string no vacío) en un registro en memoria de la sesión.
2. `cover:local` exige que `sourcePath` esté en ese registro y **consume** el grant al usarlo.
   Cualquier ruta no elegida por el diálogo se rechaza con un error claro, sin leer el archivo.
3. `linkLocalCover` no cambia: sigue validando tamaño y magic bytes, y sigue siendo usable
   directamente por tests y scripts (el control de acceso vive en el handler IPC).

## Scope

**In scope**

- `electron/main/services/local-file-grants.js` (nuevo): registro `grant`/`consume` de un solo uso,
  comparando rutas resueltas.
- `electron/main/index.js`: crear el registro y exponerlo en el `ctx` de los handlers.
- `electron/main/ipc/handlers.js`: `dialog:pick-file` otorga el grant; `cover:local` lo valida y
  consume.
- Tests: registro de grants, handler con/sin grant y consumo único; actualizar el test existente de
  `cover:local`.

**Out of scope**

- Cambiar el diálogo nativo o el flujo del renderer (`LinkCoverModal` sigue igual).
- Resolver symlinks o TOCTOU del archivo (eso es el change `2026-10-17-toctou-tamano-portada-local`).
- Cifrar o mover el cache de portadas.
- Grants persistentes entre reinicios.

## Risks

- **Romper llamadas existentes a `cover:local` sin diálogo**: mitigación → el único caller de
  producción es `LinkCoverModal`, que siempre usa `pickFile`; el test se actualiza para otorgar el
  grant explícitamente.
- **Grant de más (cualquier archivo elegido)**: mitigación → el magic-byte check sigue limitando a
  imágenes y el grant es de un solo uso; el diálogo siempre implica acción del usuario.
- **Rutas equivalentes** (`./x` vs `/abs/x`): mitigación → normalizar con `path.resolve` al otorgar y
  al consumir.
- **Fallo con `ctx` sin registro** (tests/otros hosts): mitigación → sin registro, `cover:local`
  rechaza por defecto (fail-closed).

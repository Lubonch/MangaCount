# Design: Grants de un solo uso para portadas locales

## Approach

Separar **quién puede leer** del **cómo se lee**:

- El **handler IPC** decide si `sourcePath` está autorizado.
- `linkLocalCover` sigue siendo la función pura de dominio (stat, cap, magic bytes, copia y vínculo).

Implementación:

1. **Registro de grants** (`electron/main/services/local-file-grants.js`):

   - `createLocalFileGrants()` devuelve `{ grant(path), consume(path) }`.
   - Internamente un `Set` con `path.resolve(String(path))`.
   - `grant` ignora strings vacíos o no-string.
   - `consume` devuelve `false` si la ruta no está; si está, la borra y devuelve `true` (un solo uso).
   - Es en memoria: vive lo que vive el proceso main.

2. **`ctx` del proceso main** (`electron/main/index.js`):

   - `const localFileGrants = createLocalFileGrants();`
   - Se agrega al `ctx` de `initBackend()` junto a `db`, `dataDir`, etc.

3. **Handlers** (`electron/main/ipc/handlers.js`):

   - `dialog:pick-file`: obtiene la ruta del diálogo; si es un string no vacío, `grant(path)`; devuelve
     la ruta igual que hoy.
   - `cover:local`: antes de llamar a `linkLocalCover`, exige
     `ctx.localFileGrants?.consume(sourcePath)`. Si no hay registro o el grant no existe, lanza
     `sourcePath no autorizado (elegí el archivo con el diálogo)`.
   - El grant se consume **antes** de validar el manga o la imagen: un intento fallido no deja la ruta
     reutilizable (el usuario puede volver a elegirla).

## Architecture

```
Renderer (LinkCoverModal)
   │  pickFile(IMAGE_FILTERS)
   ▼
handler dialog:pick-file ──► ctx.localFileGrants.grant(path) ──► devuelve path
   │
   │  coverLocal(mangaId, path)
   ▼
handler cover:local ──► ctx.localFileGrants.consume(path) ──► linkLocalCover(db, dataDir, …)
                                 │ false
                                 └─► error (no lee el archivo)
```

Archivos:

- **Nuevo**: `electron/main/services/local-file-grants.js`
- **Nuevo**: `electron/main/services/local-file-grants.test.js`
- **Modificar**: `electron/main/index.js` (ctx)
- **Modificar**: `electron/main/ipc/handlers.js`
- **Modificar**: `electron/main/ipc/handlers.test.js`
- **Sin cambios**: `electron/main/services/covers.js`, `LinkCoverModal.jsx`, `localAdapter.js`

## Validation

- **Registro**: `grant` + `consume` devuelve `true` una vez y `false` la segunda; rutas relativas y
  absolutas equivalentes comparten grant; strings vacíos no se otorgan.
- **Handler sin grant**: `cover:local` con una ruta arbitraria rechaza y **no** crea archivos en
  `covers/`.
- **Flujo real**: `dialog:pick-file` con una imagen válida + `cover:local` vincula la portada y el
  segundo intento con la misma ruta falla por grant consumido.
- **Fail-closed**: `cover:local` con un `ctx` sin `localFileGrants` rechaza.
- **Gates**: `npm test`, `npm run test:coverage` (main ≥90%), `npm run lint:renderer`,
  `npm run build:renderer`.

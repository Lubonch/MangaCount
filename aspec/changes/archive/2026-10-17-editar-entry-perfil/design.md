# Design: Editar una entry no debe volver a pedir perfil

## Approach

Corregir la cadena de props y hacer que el modal resuelva el perfil a partir de la entry cuando se
trata de una edición.

1. **`CollectionView.jsx`**: agregar `selectedProfile={selectedProfile}` a la instancia de
   `AddEntryModal` usada para editar (`CollectionView.jsx:745`). El componente ya recibe el prop desde
   `App.jsx`, así que no hay cambios de firma.
2. **`AddEntryModal.jsx`**: reemplazar la validación directa de `selectedProfile` por un valor
   resuelto:

   - `const profileId = editEntry?.profileId ?? selectedProfile?.id`
   - Si `!profileId` → mismo error actual (solo alcanzable al crear sin perfil).
   - `entryData.profileId = profileId`.

   Con esto, editar funciona aunque el prop falte (defensa en profundidad) y crear conserva el
   requisito de perfil activo.

Sin cambios en `profileId` del contrato: `entry:upsert` ya valida `profileId` y la entry editada lo
incluye en el DTO devuelto por `listEntries`.

## Architecture

Cadena de datos del perfil activo:

```
App.jsx (selectedProfile)
  ├─► Sidebar ──────────► AddEntryModal (create)   [ya correcto]
  └─► CollectionView ───► AddEntryModal (edit)     [se agrega el prop]
                              │
                              └─ profileId = editEntry?.profileId ?? selectedProfile?.id
```

Archivos:

- **Modificar**: `mangacount.client/src/components/CollectionView.jsx`
- **Modificar**: `mangacount.client/src/components/AddEntryModal.jsx`
- **Modificar**: `mangacount.client/src/test/components/CollectionView.test.jsx`
- **Modificar**: `mangacount.client/src/test/components/AddEntryModal.test.jsx`
- **No tocar**: `electron/main/ipc/handlers.js`, `electron/main/db/repositories/entries.js`,
  `Sidebar.jsx`.

## Validation

- **Regresión del bug**: editar una entry con `selectedProfile` activo abre el modal y el submit
  hace `POST /api/entry` con el `profileId` correcto, sin mostrar el error de perfil.
- **Edición sin prop**: `AddEntryModal` con `editEntry.profileId` y `selectedProfile` ausente guarda
  usando el perfil de la entry.
- **Creación intacta**: sin `editEntry` y sin `selectedProfile`, el modal sigue mostrando el error y
  no dispara el POST.
- **Cadena de props**: `CollectionView` pasa `selectedProfile` al modal de edición (afirmado en el
  mock de test).
- **Gates**: `npm run lint:renderer`, `npm run test:renderer:coverage` y `npm run build:renderer` en
  verde.

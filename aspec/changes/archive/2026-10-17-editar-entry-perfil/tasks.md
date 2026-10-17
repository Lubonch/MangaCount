# Tasks: Editar una entry no debe volver a pedir perfil

## Fase 1 — Fix en producción

- [x] `CollectionView.jsx`: pasar `selectedProfile={selectedProfile}` al `AddEntryModal` de edición.
- [x] `AddEntryModal.jsx`: resolver `profileId = editEntry?.profileId ?? selectedProfile?.id` y validar
      sobre ese valor (error solo cuando no hay ninguno).
- [x] `AddEntryModal.jsx`: usar el `profileId` resuelto en `entryData` en lugar de
      `selectedProfile.id`.

## Fase 2 — Tests de regresión

- [x] `CollectionView.test.jsx`: exponer los props del mock de `AddEntryModal` y afirmar que recibe el
      `selectedProfile` al abrir la edición.
- [x] `AddEntryModal.test.jsx`: agregar test de edición sin `selectedProfile` que guarde con
      `editEntry.profileId` (POST con el `profileId` correcto y sin error).
- [x] `AddEntryModal.test.jsx`: verificar que sigue bloqueando la creación sin perfil (caso existente).

## Fase 3 — Gates y verificación

- [x] `npm run lint:renderer` sin errores.
- [x] `npm run test:renderer:coverage` en verde (≥90%).
- [x] `npm run build:renderer` sin errores.
- [x] Verificación manual: editar una entry desde la colección con un perfil activo guarda sin pedir
      perfil.

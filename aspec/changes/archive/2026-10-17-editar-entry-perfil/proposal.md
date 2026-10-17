# Proposal: Editar una entry no debe volver a pedir perfil

## Problem

Al editar una entry desde la colección (modo tabla, compacto o cards), el modal muestra el error
**"Elegí un perfil antes de guardar (volvé a la selección de perfiles)"** aunque el usuario ya tenga
un perfil activo. El bug persiste pese al fix anterior (`5c8200c`), que endureció
`AddEntryModal` para exigir un perfil válido y agregó el prop en el Sidebar, pero olvidó una de las dos
instancias del modal.

Causa raíz (verificada):

- `CollectionView` recibe `selectedProfile` desde `App` (`App.jsx:399`) pero **no lo pasa** al
  `AddEntryModal` de edición (`CollectionView.jsx:745-754`).
- `AddEntryModal` valida `selectedProfile?.id` antes de guardar (`AddEntryModal.jsx:59-63`) y arma
  `profileId: selectedProfile.id` (`AddEntryModal.jsx:71`), por lo que con el prop ausente siempre
  bloquea el submit.
- La instancia del Sidebar sí lo pasa (`Sidebar.jsx:232-238`), por eso crear una entry funciona y
  editar no.
- El **+1 de la grilla general funciona** porque `handleQuickVolumeUpdate` reenvía la entry completa
  (`...entry`), que ya incluye `profileId` (`CollectionView.jsx:245-259`); no pasa por la validación de
  `AddEntryModal`.
- La entry editada ya trae `profileId` en el DTO (`electron/main/db/repositories/entries.js`), así que
  al editar el dato existe incluso si el prop faltara.

## Proposed change

1. **Pasar el perfil activo en la instancia de edición**: `CollectionView.jsx` pasa
   `selectedProfile` al `AddEntryModal` (igual que el Sidebar).
2. **Resolver el perfil desde la entry al editar**: en `AddEntryModal`, calcular
   `profileId = editEntry?.profileId ?? selectedProfile?.id` y validar sobre ese valor. La creación
   sigue exigiendo perfil activo; la edición usa el perfil de la entry y nunca pide elegir perfil.
3. **Tests de regresión**: cubrir que (a) `CollectionView` entrega el perfil al modal de edición y
   (b) `AddEntryModal` guarda una edición sin `selectedProfile` usando `editEntry.profileId`.

## Scope

**In scope**

- `mangacount.client/src/components/CollectionView.jsx` (prop `selectedProfile` al modal de edición).
- `mangacount.client/src/components/AddEntryModal.jsx` (resolución del `profileId` al editar).
- Tests: `mangacount.client/src/test/components/CollectionView.test.jsx` y
  `mangacount.client/src/test/components/AddEntryModal.test.jsx`.

**Out of scope**

- Contratos IPC (`entry:upsert`) y servicios/repositorios de entries.
- Cambios de estilo o de otros modales.
- El flujo de creación de entries (que sigue requiriendo perfil activo).
- Actualización rápida de cantidad (`handleQuickVolumeUpdate`), que ya reenvía la entry completa.

## Risks

- **Duplicar la fuente de verdad del perfil**: mitigación → resolver con `editEntry.profileId` primero
  y `selectedProfile` como fallback, sin tocar el contrato IPC.
- **Regresión en la creación**: mitigación → el requisito de perfil activo se mantiene para
  `!editEntry`, cubierto por el test existente de `AddEntryModal`.
- **Tests con el modal mockeado**: mitigación → el mock de `CollectionView.test.jsx` debe exponer los
  props recibidos para poder afirmar que `selectedProfile` llega al modal.

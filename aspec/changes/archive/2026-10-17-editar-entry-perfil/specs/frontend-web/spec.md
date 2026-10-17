## ADDED Requirements

### Requirement: Edición de entries sin volver a pedir perfil

The system SHALL permitir editar una entry de la colección con el perfil activo ya seleccionado, sin
mostrar el error `Elegí un perfil antes de guardar` ni solicitar que se elija un perfil. El
`profileId` de una edición SHALL resolverse desde la propia entry (`editEntry.profileId`) y, como
fallback, desde el perfil activo (`selectedProfile.id`). La creación de entries SHALL seguir exigiendo
un perfil activo.

#### Scenario: Editar una entry con perfil activo

- **WHEN** el usuario abre la edición de una entry desde la colección teniendo un perfil activo y
  confirma el formulario
- **THEN** el modal envía la entry con el `profileId` correcto y la guarda sin mostrar el error de
  perfil

#### Scenario: Editar una entry con el perfil de la entry

- **WHEN** el modal de edición recibe una entry con `profileId` aunque no reciba `selectedProfile`
- **THEN** usa el `profileId` de la entry para guardar en lugar de bloquear el submit

#### Scenario: Crear una entry sin perfil activo

- **WHEN** el usuario intenta crear una entry sin un perfil activo
- **THEN** el modal muestra el error de perfil y no envía la entry

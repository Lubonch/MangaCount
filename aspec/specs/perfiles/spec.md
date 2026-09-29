
### Requirement: Gestión de perfiles de colección

The system SHALL permitir múltiples perfiles de colección con CRUD completo vía `ProfileController` + `ProfileService` + `ProfileRepository`.

#### Scenario: Crear y listar perfiles

- **WHEN** el cliente llama al endpoint de perfiles
- **THEN** el sistema persiste el perfil en PostgreSQL y lo devuelve en el listado

### Requirement: Selección de perfil activo en frontend

The system SHALL recordar el perfil activo por usuario vía localStorage del frontend.

#### Scenario: Persistir perfil activo

- **WHEN** el usuario selecciona un perfil en `mangacount.client`
- **THEN** el frontend guarda el perfil en localStorage y filtra la colección por ese perfil


### Requirement: Gestión de perfiles de colección

The system SHALL permitir múltiples perfiles de colección con CRUD completo, ahora en SQLite embebida vía el proceso main de Electron y canales IPC (`profile:list`, `profile:get`, `profile:upsert`, `profile:delete`), conservando UNIQUE por nombre y el perfil por defecto, sin `ProfileController`/`ProfileService`/`ProfileRepository` ni PostgreSQL.

#### Scenario: Crear y listar perfiles vía IPC local

- **WHEN** el renderer invoca el canal IPC de perfiles
- **THEN** el proceso main persiste el perfil en SQLite embebida (mismo esquema traducido, UNIQUE por nombre, perfil por defecto) y lo devuelve en el listado, sin backend .NET ni PostgreSQL

### Requirement: Selección de perfil activo en frontend

The system SHALL recordar el perfil activo por usuario vía localStorage del frontend, igual que en la versión web.

#### Scenario: Persistir perfil activo

- **WHEN** el usuario selecciona un perfil en la app desktop
- **THEN** el frontend guarda el perfil en localStorage y filtra la colección por ese perfil, igual que en la versión web

### Requirement: Fotos de perfil locales

The system SHALL guardar las fotos de perfil en `<userData>/profiles` y servirlas al renderer mediante un protocolo custom de Electron (`mangacount://profiles/<fileName>`), reemplazando `wwwroot/profiles` + `GET /api/Profile/image/{fileName}`.

#### Scenario: Subir y mostrar una foto de perfil

- **WHEN** el usuario sube una imagen válida desde el modal de perfil
- **THEN** el proceso main la escribe en `<userData>/profiles`, persiste la referencia en `Profile.ProfilePicture` y devuelve una URL `mangacount://profiles/<fileName>` que el `<img>` del renderer carga correctamente

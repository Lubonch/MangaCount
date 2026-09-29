
### Requirement: App web principal multi-perfil

The system SHALL proveer en `mangacount.client` (React 19 + Vite + CSS Modules) multi-perfil con localStorage, CRUD con modales, filtros básicos, themes claro/oscuro, estados de loading/error y responsive, servida por el backend como hosting estático y en dev vía `https://localhost:63920` con proxy API.

#### Scenario: Operar colección desde la web

- **WHEN** el usuario crea, edita, filtra o cambia de perfil en la web
- **THEN** la app consume la API backend, persiste el perfil activo y muestra feedback visual con themes y responsive

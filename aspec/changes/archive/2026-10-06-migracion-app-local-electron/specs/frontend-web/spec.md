## MODIFIED Requirements

### Requirement: App web principal multi-perfil

The system SHALL proveer en `mangacount.client` (React 19 + Vite + CSS Modules) multi-perfil con localStorage, CRUD con modales, filtros básicos, themes claro/oscuro, estados de loading/error y responsive; en desktop el renderer corre dentro de Electron y consume los mismos DTOs vía `localAdapter.js` + IPC (adaptador con contrato tipo `Response` para no reescribir componentes), sin proxy ni hosting del backend, sin chequeo load-bearing, y con las fotos de perfil servidas por el protocolo `mangacount://`.

#### Scenario: Operar colección desde la app desktop

- **WHEN** el usuario crea, edita, filtra o cambia de perfil en Electron
- **THEN** el renderer (React actual) consume los mismos DTOs vía `localAdapter.js` + IPC en vez de `fetch('/api/...')`, conservando multi-perfil, CRUD con modales, filtros, themes, loading/error y responsive, sin proxy ni hosting del backend

#### Scenario: Arranque sin imagen load-bearing

- **WHEN** la app desktop arranca
- **THEN** no existe `LoadBearingCheck`, ni `/api/loadbearing/status`, ni dependencia de `loadbearingimage.jpg`

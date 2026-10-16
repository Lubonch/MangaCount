## REMOVED Requirements

### Requirement: Demo estática GitHub Pages

**Reason:** decisión de scope (revisión 2026-10-06): `Pages/` se elimina porque su valor (colección y recomendaciones sin backend) queda absorbido por la aplicación local Electron. No se conserva una superficie de demo web separada en este repo.

#### Scenario: Demo absorbida por la app desktop

- **WHEN** se completa la migración a Electron
- **THEN** `Pages/` deja de existir como demo separada porque su valor (colección y recomendaciones sin backend) queda absorbido por la aplicación local

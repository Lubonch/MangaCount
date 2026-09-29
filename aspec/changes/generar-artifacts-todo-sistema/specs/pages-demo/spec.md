## ADDED Requirements

### Requirement: Demo estática GitHub Pages

The system SHALL proveer en `Pages` una demo estática que usa `shared/recommendations` directamente sin requerir el endpoint backend.

#### Scenario: Recomendar sin backend

- **WHEN** el usuario usa la demo en GitHub Pages
- **THEN** la demo calcula recomendaciones con el motor local en cliente sin llamar a `/api/recommendation`

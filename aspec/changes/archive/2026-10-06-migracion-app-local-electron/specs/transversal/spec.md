## MODIFIED Requirements

### Requirement: Logging diario backend y bot

The system SHALL escribir logs diarios y rotarlos al cambiar el día solo si el archivo actual tiene contenido; en desktop los logs van a `<userData>/logs/` (con la misma política de rotación diaria), en reemplazo de `logs/backend.txt`. El log del bot WhatsApp no cambia porque queda fuera de scope.

#### Scenario: Logging local de la app desktop

- **WHEN** la app desktop escribe logs
- **THEN** los guarda en `<userData>/logs/` con rotación diaria y la misma política (rotar solo si hay contenido); el log del bot WhatsApp no cambia porque queda fuera de scope

### Requirement: Configuración sin secretos en frontend

The system SHALL configurar la app desktop con almacenamiento local (`electron-store` o JSON en `userData`, más localStorage para tema y perfil activo), sin `appsettings*.json`, connection strings, `deployment/deploy.sh` ni schema PostgreSQL. La configuración del bot (`MANGA_API_URL`, `WHATSAPP_ALLOWED_NUMBERS`) no se toca y no se incluye en los instaladores.

#### Scenario: Configuración 100% local sin servidor

- **WHEN** la app desktop necesita configuración o preferencias
- **THEN** usa almacenamiento local (`electron-store` o JSON en `userData`, más localStorage para tema y perfil) y no existen `appsettings*.json`, connection strings, `deployment/deploy.sh` ni schema PostgreSQL; el `.env` del bot no se toca

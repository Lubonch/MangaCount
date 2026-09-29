
### Requirement: Logging diario backend y bot

The system SHALL escribir logs diarios en `logs/backend.txt` y `logs/bot.txt` y rotarlos al cambiar el día a `backend.YYYY-MM-DD` / `bot.YYYY-MM-DD` solo si el archivo actual tiene contenido.

#### Scenario: Rotación diaria con contenido

- **WHEN** cambia el día y el log actual no está vacío
- **THEN** el sistema renombra el archivo con la fecha y crea un log actual nuevo

### Requirement: Configuración sin secretos en frontend

The system SHALL configurar backend por `appsettings*.json` + `ConnectionStrings: MangacountDatabase` y providers por env vars (`MANGACOUNT_GITHUB_MODELS_*`, `MANGACOUNT_OPENROUTER_*`), bot por `.env` (`MANGA_API_URL`, `WHATSAPP_ALLOWED_NUMBERS`), sin guardar secretos en archivos frontend trackeados.

#### Scenario: Despliegue con scripts preservando config

- **WHEN** se ejecuta `deployment/deploy.sh` o `deploy-bot.sh`
- **THEN** el despliegue publica el artefacto y preserva el `.env` existente del bot (o lo crea desde `.env.example`), aplicando el schema `deployment/database-schema.sql` en PostgreSQL

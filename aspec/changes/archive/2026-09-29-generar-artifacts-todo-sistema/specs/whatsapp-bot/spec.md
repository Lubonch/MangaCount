## ADDED Requirements

### Requirement: Whitelist de remitentes del bot

The system SHALL ignorar mensajes de remitentes no listados en `WHATSAPP_ALLOWED_NUMBERS` (normalizados antes de comparar vía `authorization.js`); con whitelist vacía ignora todo.

#### Scenario: Mensaje no autorizado

- **WHEN** llega un mensaje de un número fuera de la whitelist
- **THEN** el bot lo ignora sin llamar a la API

### Requirement: Comandos de colección vía WhatsApp

The system SHALL soportar `ping, buscar [titulo], recomendar [cantidad], pendientes, actualizar [titulo] [cantidad], perfil` vía `router.js` + `src/commands`, usando `MANGA_API_URL` (`api.js`) y sesión Chromium (`browser.js`, `session.js`, `CHROME_BIN` opcional).

#### Scenario: Consultar recomendación por WhatsApp

- **WHEN** un remitente autorizado envía `recomendar`
- **THEN** el bot consulta el endpoint de recomendación para el perfil actual y responde con la lista

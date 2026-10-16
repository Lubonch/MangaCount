## MODIFIED Requirements

### Requirement: Logging diario backend y bot

The system SHALL escribir logs diarios y rotarlos al cambiar el día solo si el archivo actual tiene
contenido; en desktop los logs van a `<userData>/logs/` con la misma política de rotación diaria. El
log del bot de Discord también va a `<userData>/logs/` con esa política, porque el bot corre dentro
del proceso main; el bot de WhatsApp se retira. En cada arranque SHALL registrar una línea de contexto
con la versión de la app, plataforma/arch y locale.

#### Scenario: Logging local de la app desktop y del bot de Discord

- **WHEN** la app desktop o el bot de Discord escriben logs
- **THEN** los guardan en `<userData>/logs/` con rotación diaria y la misma política (rotar solo si hay contenido)

#### Scenario: Contexto de la sesión en el log

- **WHEN** la app arranca
- **THEN** la primera línea del log incluye la versión de la app, plataforma/arch y locale

## ADDED Requirements

### Requirement: Captura global de errores

The system SHALL registrar en el log las excepciones no capturadas y las promesas rechazadas del
proceso main (`uncaughtException`, `unhandledRejection`), la finalización de procesos
(`render-process-gone`, `child-process-gone`) y los errores del renderer (`window.onerror`,
`unhandledrejection` y el `ErrorBoundary`) vía el canal IPC `log:error`. NO SHALL registrar secretos
(por ejemplo, el token del bot).

#### Scenario: Error no capturado en el main

- **WHEN** ocurre una excepción no capturada o una promesa rechazada en el proceso main
- **THEN** se escribe en `<userData>/logs/` con nivel de error y la app no falla en silencio

#### Scenario: Error en el renderer

- **WHEN** el renderer lanza un error no manejado o el ErrorBoundary captura uno de render
- **THEN** el error se envía por `log:error` y queda en el log con su componente/stack

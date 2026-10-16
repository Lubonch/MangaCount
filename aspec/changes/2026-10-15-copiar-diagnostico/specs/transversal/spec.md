## ADDED Requirements

### Requirement: Exportar diagnóstico

The system SHALL exponer el canal IPC `diagnostics:copy`, que arma un texto con la versión de la app,
plataforma/arch, locale y las **últimas N líneas** de `app.txt`, y lo copia al portapapeles
(`clipboard.writeText`); SHALL devolver `{ copied, preview }`. SHALL exponer también
`diagnostics:open-logs` (abre `<userData>/logs`). El texto NO SHALL incluir secretos (por ejemplo, el
token del bot).

#### Scenario: Copiar diagnóstico

- **WHEN** el usuario pide copiar el diagnóstico
- **THEN** se copia al portapapeles un texto con versión/OS y las últimas N líneas del log, y se confirma "Copiado"

#### Scenario: Abrir carpeta de logs

- **WHEN** el usuario pide abrir los logs
- **THEN** se abre `<userData>/logs` en el explorador de archivos

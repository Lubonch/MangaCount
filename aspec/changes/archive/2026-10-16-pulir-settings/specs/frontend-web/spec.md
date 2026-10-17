## ADDED Requirements

### Requirement: Sección de intercambio TSV con nombre claro en Settings

The system SHALL nombrar la sección de import/export TSV de la pantalla Settings como **"Importar /
Exportar (TSV)"**, reemplazando la etiqueta ambigua **"Intercambio"**. El import y el export TSV SHALL
seguir operando sobre el perfil activo desde esa sección.

#### Scenario: La sección expone su propósito

- **WHEN** el usuario abre Settings
- **THEN** la sección de import/export se titula "Importar / Exportar (TSV)" (no "Intercambio") y los controles de import y export TSV quedan dentro de ella

#### Scenario: Import/export siguen operativos tras el renombre

- **WHEN** el usuario ejecuta el export TSV del perfil activo desde la sección "Importar / Exportar (TSV)"
- **THEN** el sistema genera el TSV del perfil activo y el flujo de import TSV sigue disponible sin cambios de comportamiento

### Requirement: Consistencia visual e idioma del modal Settings

The system SHALL estilizar el modal Settings con clases propias sobre los design tokens, sin reutilizar
las clases del Sidebar (`.action-button`, `.file-input-label`, `.import-section`, `.danger-button`). Los
botones del modal SHALL tener tamaño y padding consistentes y NO SHALL ocupar todo el ancho (`width:100%`)
salvo donde el diseño lo pida explícitamente. El contenido SHALL respetar un padding lateral consistente
(16px) para que las secciones no queden pegadas al borde del modal. Las etiquetas, mensajes y títulos de
sección del modal SHALL mostrarse en español, sin strings sueltos en inglés.

#### Scenario: Botones de tamaño consistente sin full-width forzado

- **WHEN** el usuario abre Settings
- **THEN** los botones del modal (Export TSV, Traer portadas faltantes, Restaurar…, Nuclear Option) usan las clases propias del modal, con tamaño y padding consistentes, y ninguno ocupa todo el ancho salvo que el diseño lo pida

#### Scenario: Padding lateral alineado

- **WHEN** el usuario abre Settings
- **THEN** el contenido del modal respeta un padding lateral consistente de 16px y las secciones no quedan pegadas al borde del modal

#### Scenario: Idioma unificado del modal

- **WHEN** el usuario abre Settings
- **THEN** las etiquetas, los mensajes y los títulos de sección se muestran en español, sin strings sueltos en inglés

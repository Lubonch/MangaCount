## ADDED Requirements

### Requirement: Preferencia de contenido adulto en Settings

The system SHALL exponer en la sección de portadas de Settings un control (toggle) para habilitar los
resultados +18 en la búsqueda de portadas de AniList, con **default desactivado**, y SHALL persistir la
preferencia en `userData` a través de los canales `app:config-get` / `app:config-set`.

#### Scenario: Toggle por defecto desactivado

- **WHEN** el usuario abre Settings y no cambió la preferencia
- **THEN** el control de contenido +18 aparece desactivado y los resultados +18 quedan ocultos en las búsquedas

#### Scenario: Cambio persistente del toggle

- **WHEN** el usuario habilita el control de contenido +18
- **THEN** la preferencia se guarda en `userData` y las siguientes búsquedas incluyen los resultados +18

# Proposal: Migración a aplicación local Electron sin servidor

## Problem

MangaCount hoy solo funciona como cliente-servidor: hay que desplegar el backend .NET en otra PC (un servidor en casa, hoy una Raspberry Pi en `192.168.0.50` según `deployment/deploy.sh`) con PostgreSQL 16 instalado y configurado, y la notebook actúa como cliente de ese servidor. Para una aplicación de uso personal y local no tiene sentido mantener una máquina como server, ni instalar y administrar PostgreSQL, ni depender de la red local para cargar la colección. Además el repo acumuló código basura y documentación desactualizada que encarece cualquier cambio.

## Proposed change

Replantear MangaCount como aplicación de escritorio local autocontenida: el frontend React actual corre dentro de Electron (sin reescribir la UI), la persistencia pasa a SQLite embebida (sin servidor de base de datos), la lógica de negocio del backend se porta a Node en el proceso main de Electron y se expone al renderer vía IPC, y se distribuye con instaladores reales (`.exe` para Windows, `.deb` para Debian/Ubuntu, AppImage como vía para Arch y otras distros). En el mismo movimiento se elimina el código basura y se actualiza la documentación. La aplicación de WhatsApp queda fuera del scope y no se toca.

## Scope

In scope:
- Decisión de persistencia embebida (recomendación: SQLite vía `better-sqlite3`) y migración del esquema de 5 tablas (`Profile, Format, Publisher, Manga, Entry`) más migración de datos desde PostgreSQL (script de traspaso único, incluyendo `Manga.ImageUrl`).
- Esqueleto Electron: proceso main (SQLite + handlers IPC), preload con API tipada, renderer con el React actual y un adaptador que reemplace los `fetch('/api/...')` por IPC **sin reescribir componentes** (el adaptador debe devolver un objeto tipo `Response`; ver design).
- Porte de la lógica: repositories, services (incluido `EntryService` con import/export TSV; el motor JS compartido en `shared/recommendations` se reutiliza tal cual), upload de fotos de perfil a carpeta de datos local **servidas por protocolo custom** (`mangacount://profiles/<file>`), logging a carpeta de usuario.
- Empaquetado con `electron-builder`: `nsis` (exe Windows), `deb` (Debian/Ubuntu), `AppImage` (Arch y resto); firma/versionado básico y pruebas de instalación en cada formato, encadenando el build del renderer antes de empaquetar. Generación de instaladores en CI por OS (Windows/Linux) y GitHub Release draft con los artefactos al pushear un tag `v*`.
- Limpieza: eliminar backend .NET completo, `deployment/` (scripts del servidor Pi-hole), `databasebackup/`, `Pages/` (decidido: eliminar por absorción), código joke load-bearing (`LoadBearingController`, `LoadBearingCheck`, imágenes, chequeos en `Program.cs` y `vite.config.js`), `DatabaseController` (eliminar) y `NukeDataModal` (reconvertido a borrado local, hecho), `.angular/` si quedara, certificados dev `dotnet dev-certs`, proxy `SpaProxy`/CORS/Swagger. (`dist/` ya no está commiteado: solo se ignora.)
- Documentación: reescribir `README.md` (instalación desde instaladores, sin PostgreSQL ni deploy), eliminar o archivar `PLAN.md` raíz y `WhatsappBot/PLAN.md` desactualizados, actualizar `CHANGELOG`s, documentar formato de datos local y cómo migrar desde la instalación con servidor.

Out of scope:
- La aplicación de WhatsApp (`WhatsappBot/`): no se modifica, no se empaqueta, no se incluye en instaladores; solo se la retira de la documentación general.
- Nuevas funcionalidades (Jikan, dashboard, búsqueda avanzada del `PLAN.md`): quedan para changes futuros.
- **Reranking remoto de recomendaciones (providers GitHub Models / OpenRouter):** no se porta en este change (queda el motor local con fallback; `electron/main/services/recommendations.js` deja el punto de extensión `providers` vacío). Se documenta como capacidad diferida, no como soporte conservado.
- Auto-update, firma de código con certificado pago, publicación en Microsoft Store / Snap / AUR oficial: se evalúan pero no se implementan en este change.

## Risks

Porte de la lógica C# a Node introduce regresiones: mitigación con matriz de paridad por endpoint (`fetch('/api/...')` → handler IPC) y tests que repliquen los existentes de `MangaCount.Server.Tests` y `vitest`.
Cambios de DTO y de contrato de transporte rompen la UI silenciosamente: los filtros cambian de `string[]` a `{id,name,count}[]` y el adaptador debe devolver `Response`-like; mitigación con verificación de UI real (no solo de handlers) en dev y empaquetado.
Pérdida de datos de usuarios al migrar de PostgreSQL a SQLite: mitigación con script de traspaso + verificación de conteos por tabla, detección de filas descartadas y modo solo-lectura de la BD vieja durante la migración.
`better-sqlite3` es módulo nativo y complica el build multiplataforma y el ciclo dev/test: `electron-builder` reconstruye el binario para el ABI de Electron y deja `npm test` (Node) inconsistente; mitigación con rebuild explícito documentado, CI de build por plataforma, o fallback a `node:sqlite` según disponibilidad del toolchain.
Alcance gigante que se estanca: mitigación con fases que dejan la app utilizable cuanto antes (primero local funcional en dev, después instaladores, al final limpieza y docs).
Frontend acoplado a respuestas exactas del backend: mitigación con adaptador IPC que conserva los DTOs actuales y solo cambia el transporte; el adaptador se testea con casos de `response.ok`/`response.json()`.

## Estado real (revisión 2026-10-06)

Fases 0 y 1 completas y verificadas por tests (`npm test`, 28 verdes) y la suite de frontend (45 verdes). La Fase 2 **no está completa como afirmaba `tasks.md`**: los handlers existen y pasan tests unitarios, pero el renderer sigue usando `fetch` en todos los componentes salvo `NukeDataModal`. Los ajustes necesarios están en `tasks.md` (Fase 2.5) y en las correcciones de DTO de la matriz.

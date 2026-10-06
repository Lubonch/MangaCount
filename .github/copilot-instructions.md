# Instrucciones para Copilot en MangaCount

## Resumen del proyecto
MangaCount es una aplicación de escritorio para gestionar colecciones de manga. Corre local,
sin servidor: Electron + SQLite embebida.
- `electron/`: proceso main (SQLite, repositories, servicios, handlers IPC) y `preload.cjs` que expone `window.mangaCount`.
- `mangacount.client`: renderer React + Vite. Consume el proceso main por IPC; `src/api/localAdapter.js` incluye el shim de `fetch('/api/*')` → IPC.
- `shared/recommendations`: motor compartido de recomendaciones, catálogos, normalización y reglas de mercado.
- `WhatsappBot`: bot Node.js, fuera de alcance de la app de escritorio (no se empaqueta). Código intacto.

## Stack real y decisiones de arquitectura
- Persistencia: SQLite embebida (`better-sqlite3`) en el proceso main, en `app.getPath('userData')`. No hay base de datos externa, ORM ni servidor HTTP; todo es local.
- El renderer no habla HTTP: los canales IPC se registran en `electron/main/ipc/handlers.js` y se declaran en `electron/preload.cjs`. Si agregás un endpoint, actualizá handler, preload, adaptador y `parity-matrix.md`.
- `preload` es CommonJS (`preload.cjs`) porque el `sandbox` de Electron no admite `import`.
- Las fotos de perfil viven en `<userData>/profiles` y se sirven por el protocolo custom `mangacount://`, no por HTTP.
- Si una regla de negocio ya existe en servicios o en `shared/recommendations`, no la dupliques.
- Prefiere cambios localizados y compatibles con la estructura existente antes que reorganizaciones amplias.

## Invariantes del sistema de recomendaciones
- La recomendación siempre debe construir primero una lista local de candidatos.
- Los títulos ya poseídos se excluyen después de normalización.
- El mercado del usuario se infiere a partir de volúmenes poseídos agrupados por país de editorial (`publisher-countries.json`).
- Se excluyen candidatos fuera del mercado inferido.
- Puede haber menos resultados que el límite solicitado si el mercado local no tiene suficientes títulos válidos.
- El reranking externo está diferido: `electron/main/services/recommendations.js` deja `providers = []` como punto de extensión.

## Cómo decidir dónde hacer cambios
- Si el cambio afecta reglas de recomendación, empieza por `shared/recommendations`, no por la UI.
- Si el cambio es de persistencia o consultas SQL, trabaja en `electron/main/db/repositories` y conserva el estilo `better-sqlite3` existente.
- Si el cambio es visual o de interacción, limítalo a `mangacount.client`.
- Si el cambio afecta el empaquetado, revisá `electron-builder` en `package.json` y `.github/workflows/release.yml`.

## Convenciones de implementación
- En JS/Node, respeta el ESM del repo (`"type": "module"`); el único CommonJS es `electron/preload.cjs`.
- En React, usá componentes funcionales y hooks. No introduzcas librerías de estado o routing nuevas sin razón clara.
- Los mensajes y documentación pueden estar en español, pero nombres de código, rutas y variables públicas deben mantenerse consistentes.
- No crees documentación paralela si basta con actualizar la existente.

## Configuración, secretos y despliegue
- Nunca expongas secretos, claves de proveedores o tokens en archivos rastreados.
- La configuración local va en `userData` (`electron-store`/JSON), más localStorage para tema y perfil.
- Si tocás setup o datos, sincronizá `README.md` y `docs/desktop.md`.

## Validación esperada
- Proceso main: `npm test` (raíz, `node --test`).
- Renderer: `npm --prefix mangacount.client test -- --run` (vitest) y `npm run build:renderer`.
- Empaquetado: `npm run dist:linux` / `npm run dist:win` (requiere reconstruir `better-sqlite3`; ver scripts `rebuild:node`/`rebuild:electron`).
- Si tocás recomendaciones compartidas, validá el proceso main (y el renderer si aplica) porque ambos consumen esa lógica.
- Si modificás canales IPC o setup, verificá también que `parity-matrix.md` y la documentación sigan alineadas.

## No hacer
- No reintroducir un backend HTTP ni PostgreSQL para la app de escritorio.
- No reemplazar `shared/recommendations` por una integración externa completa.
- No duplicar lógica de recomendación en renderer o bot cuando debe vivir en código compartido o en el proceso main.
- No romper el contrato de `window.mangaCount` sin actualizar preload, adaptador y pruebas.

## Notas prácticas
- El proceso main registra el protocolo `mangacount://` para las fotos de perfil.
- Los logs diarios van a `<userData>/logs/app.txt` con rotación.
- Cuando haya conflicto entre una idea nueva y el diseño actual del repo, priorizá la coherencia con la implementación real salvo refactorización deliberada.

# Instrucciones para Copilot en MangaCount

## Resumen del proyecto
MangaCount es un repositorio multi-superficie para gestionar colecciones de manga. Sus piezas principales son:
- `MangaCount.Server`: backend ASP.NET Core en .NET 8 con controladores, servicios, repositorios, AutoMapper y alojamiento estático del frontend principal.
- `mangacount.client`: aplicación React + Vite para la interfaz principal.
- `Pages`: demo estática para GitHub Pages que usa el motor de recomendaciones local sin depender del backend para esa lógica.
- `WhatsappBot`: bot Node.js para consultas, actualizaciones y recomendaciones vía WhatsApp.
- `shared/recommendations`: motor compartido de recomendaciones, catálogos, normalización y reglas de mercado.

## Stack real y decisiones de arquitectura
- El acceso a datos del backend usa `Dapper` + `Npgsql` sobre PostgreSQL. No introduzcas Entity Framework ni otro ORM salvo que se pida explícitamente.
- Mantén la separación actual entre controlador, servicio, repositorio, DTO y mapeo. Si una regla de negocio ya existe en servicios o en `shared/recommendations`, no la dupliques en controladores o componentes.
- El frontend principal consume el backend; si cambias contratos de API, actualiza de forma coherente endpoint, DTOs, consumidor React y pruebas relevantes.
- `Pages` debe seguir funcionando sin el endpoint backend de recomendaciones. Si tocas recomendaciones, conserva la capacidad de ejecutar el motor local directamente desde código compartido.
- `WhatsappBot` depende del backend y de variables de entorno. Evita introducir dependencias de navegador o romper el flujo basado en whitelist de números permitidos.
- Prefiere cambios localizados y compatibles con la estructura existente antes que reorganizaciones amplias.

## Invariantes del sistema de recomendaciones
- La recomendación siempre debe construir primero una lista local de candidatos.
- Los títulos ya poseídos se excluyen después de normalización.
- El mercado del usuario se infiere a partir de volúmenes poseídos agrupados por país de editorial.
- Se excluyen candidatos fuera del mercado inferido.
- Puede haber menos resultados que el límite solicitado si el mercado local no tiene suficientes títulos válidos.
- El reranking externo es opcional y posterior al filtro local; nunca debe reemplazar al motor local como fallback obligatorio.
- El endpoint actual del backend es `GET /api/recommendation?profileId={id}&limit=10`, con `limit` acotado al rango `1..10`.

## Cómo decidir dónde hacer cambios
- Si el cambio afecta reglas de recomendación, empieza por `shared/recommendations` o por el servicio backend que las consume, no por la UI.
- Si el cambio es de persistencia o consultas SQL, trabaja en repositorios del backend y conserva el patrón Dapper existente.
- Si el cambio es visual o de interacción del frontend principal, limítalo a `mangacount.client` salvo que requiera un cambio real de contrato API.
- Si el cambio afecta a la demo estática, evita introducir dependencias al backend salvo que el usuario lo pida de forma explícita.
- Si cambias configuración o comportamiento operativo del bot, revisa también `.env.example`, despliegue y normalización de entradas.

## Convenciones de implementación
- En C#, usa convenciones de .NET: `PascalCase` para tipos y métodos, `camelCase` para parámetros y variables locales o privadas.
- Conserva el estilo async/await existente y evita mezclar patrones síncronos nuevos en código ya asíncrono.
- En React, usa componentes funcionales y hooks. No introduzcas librerías de estado o routing nuevas sin una razón clara.
- En Node.js, respeta el sistema de módulos y el estilo ya usado en cada carpeta. No mezcles ESM y CommonJS sin necesidad.
- Los mensajes y documentación pueden estar en español, pero nombres de código, rutas, variables públicas y contratos API deben mantenerse consistentes con el repositorio.
- No crees documentación paralela o archivos auxiliares persistentes si basta con actualizar la documentación existente.

## Configuración, secretos y despliegue
- Nunca expongas secretos, claves de proveedores o tokens en archivos rastreados.
- Las variables de proveedores de reranking deben permanecer del lado servidor. No las muevas al cliente ni a archivos que terminen en bundles frontend.
- Si cambias la forma de configuración del bot, actualiza también `WhatsappBot/.env.example` cuando corresponda.
- Si tocas setup, despliegue o variables de entorno, sincroniza `README.md`, scripts en `deployment/` y archivos de configuración afectados.
- El frontend principal usa proxy al backend local y el backend espera por defecto el origen `https://localhost:63920` para CORS y SpaProxy.

## Validación esperada
- Cambios en backend: `dotnet test MangaCount.Server.Tests --verbosity minimal`.
- Cambios en `mangacount.client`: `npm test -- --run` y `npm run build` dentro de esa carpeta.
- Cambios en `Pages` o en `shared/recommendations` que afecten la demo: `npm test -- --run` y `npm run build` dentro de `Pages`.
- Cambios en `WhatsappBot`: `npm test` y, si el cambio es operativo, revisar variables de entorno relevantes.
- Si tocas recomendaciones compartidas, valida al menos backend y `Pages`, porque ambos consumen esa lógica.
- Si modificas contratos o setup, verifica también que la documentación principal siga alineada con el código.

## No hacer
- No reemplazar `shared/recommendations` por una integración externa completa.
- No duplicar lógica de recomendación en frontend, demo o bot cuando debe vivir en código compartido o servicios del backend.
- No convertir `Pages` en una superficie dependiente del backend para generar recomendaciones.
- No introducir cambios globales de base de datos sin actualizar el esquema o script correspondiente y sin tener un motivo claro.
- No romper compatibilidad con .NET 8, React actual, Node.js 20+ o la estructura de despliegue existente sin petición explícita.

## Notas prácticas
- El backend sirve archivos estáticos y redirige rutas no API a `index.html`; tenlo en cuenta al tocar hosting o routing.
- El backend y el bot escriben logs diarios en la carpeta `../logs` relativa a su directorio de trabajo.
- Si cambias arquitectura, setup o comportamiento visible, actualiza antes la documentación existente que crear nuevas fuentes de verdad.
- Cuando haya conflicto entre una idea nueva y el diseño actual del repo, prioriza la coherencia con la implementación real salvo que el usuario pida una refactorización deliberada.

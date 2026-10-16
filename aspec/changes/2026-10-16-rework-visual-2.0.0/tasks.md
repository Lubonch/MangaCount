# Tasks: Rework visual 2.0.0 — identidad, design system y portadas (con vínculo a AniList)

## Fase 1 — Design system (tokens + Inter + temas)

- [x] `src/styles/tokens.css`: tokens base (color/acento + neutros + semánticos, tipografía, espaciado,
      radios, sombras, motion)
- [x] `src/styles/theme.css`: dark (default) y light mapeando los tokens a valores concretos
- [x] Cargar **Inter** (fuente) con fallback al stack del sistema
- [x] Limpiar `src/index.css` (sacar defaults de Vite) + `@import` de tokens/theme
- [x] Migrar `App.css` y los `components/*.css` a `var(--token)` (sin hex hardcodeados)
- [x] Verificar contraste AA y foco visible en ambos temas

## Fase 2 — Identidad (logo/assets)

- [x] Generar el **logo** monograma `MC` (corte de tomo) → `src/assets/brand/logo.svg`
- [x] Exportar `build/icon.png` (512/1024), `build/icon.ico` (multi), `electron/assets/tray-icon.png`
      (16/32) + favicon
- [x] Usar el logo en Sidebar/header; borrar `assets/react.svg`

## Fase 3 — Layout A (sidebar modernizada)

- [x] `Sidebar.jsx` + CSS: agrupada (Colección / Herramientas / App), colapsable, con logo y estado del bot
- [x] Mantener `Sidebar` + `main-content` sin scroll horizontal y responsive

## Fase 4 — Componentes

- [x] Cards (`CollectionView`): portada/identidad visual, anillo de progreso, chips y acciones
      (portada generada full-bleed con iniciales + badge de % + chips de formato/editorial)
- [x] Tabla y compacta re-estilizadas (heredan los tokens del design system)
- [x] Modales (Add/Edit Entry, Add/Edit Manga, Recommendation, Settings, Nuke), ProfileSelector, Footer,
      ThemeToggle: alineados al sistema (tokens + animación de entrada)

## Fase 5 — Animaciones

- [x] Transición de tema, hover-lift de cards, cross-fade de vista, modal fade+scale, sidebar expand,
      barras animadas, stagger de listas, press/underline
      (implementado: hover-lift de cards, modal fade+scale, transición de la sidebar, barras animadas,
      press y transición de tema por tokens; cross-fade de vista y stagger quedan como extra opcional)
- [x] Respetar `prefers-reduced-motion`

## Fase 6 — Portadas + vínculo con AniList

- [x] `schema.sqlite.sql`: tabla aditiva `MangaExternalRef` + `SCHEMA_VERSION` 1 → 2 (sin `ALTER`)
- [x] `repositories/manga-external-refs.js`: get/upsert/remove por `(mangaId, provider)`
- [x] `services/covers.js`: `searchManga(query)` (AniList GraphQL, **sin key**, `User-Agent`, timeout) y
      `fetchCover(url)` (valida content-type imagen + tamaño máx)
- [x] Auto-match al agregar/editar por título (variantes normalizadas); si es ambiguo, no vincula
      (`cover:auto`, best-effort y secuencial, solo con match único)
- [x] IPC `cover:search` · `cover:link` · `cover:fetch` · `cover:unlink` · `cover:status` (preload + adapter)
      (+ `cover:all` y `cover:auto`)
- [x] Guardar la portada en `<userData>/covers/<mangaId>.<ext>` (nombre seguro) y resolver la URL como
      `mangacount://covers/<archivo>` (desviación: NO se escribe en `Manga.ImageUrl`; el mapa lo resuelve
      el renderer vía `cover:all`, así el vínculo es puramente aditivo)
- [x] Extender el protocolo `mangacount://` al host `covers` (con `path.basename`)
- [x] `LinkCoverModal.jsx`: buscar (prellenado con el título local), listar candidatos (portada + títulos),
      elegir/desvincular
- [x] Fallback: **portada generada** (gradiente por hash + iniciales + badge de %) para cards sin portada
- [x] Rate limit: secuencial + backoff `Retry-After` ante `429`
- [x] Tests `node --test`: `searchManga` (fetch fake), `fetchCover` (rechaza no-imagen), repositorio de
      refs, `autoMatchCover` y roundtrip IPC de covers; `vitest`: fallback en card + modal de vincular

## Fase 7 — Documentación y cierre

- [x] `README.md` / `docs/desktop.md`: identidad/design system, logo, portadas y vínculo AniList
      (sin API key, cache, fallback)
- [x] `CHANGELOG.md` + bump **2.0.0** (major por el rework visual)
- [x] Correr `npm test` + suite del renderer + `lint` + `build:renderer`
      (144 node --test + 75 vitest, lint 0 errores, build OK)
- [x] `ancleto-security` y `ancleto-verify` en verde
      (seguridad: solo URLs `https` en `fetchCover`, `path.basename` en el protocolo, nombre de archivo
      generado `<id>.<ext>`, validación content-type imagen + tamaño, SQL parametrizado; verify: specs
      `mangas` y `frontend-web` cubiertas por implementación + tests)
- [x] Verificación cruzada contra proposal (qué), design (cómo) y delta specs

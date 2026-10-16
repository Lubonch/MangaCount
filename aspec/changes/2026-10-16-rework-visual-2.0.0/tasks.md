# Tasks: Rework visual 2.0.0 — identidad, design system y portadas (con vínculo a AniList)

## Fase 1 — Design system (tokens + Inter + temas)

- [ ] `src/styles/tokens.css`: tokens base (color/acento + neutros + semánticos, tipografía, espaciado,
      radios, sombras, motion)
- [ ] `src/styles/theme.css`: dark (default) y light mapeando los tokens a valores concretos
- [ ] Cargar **Inter** (fuente) con fallback al stack del sistema
- [ ] Limpiar `src/index.css` (sacar defaults de Vite) + `@import` de tokens/theme
- [ ] Migrar `App.css` y los `components/*.css` a `var(--token)` (sin hex hardcodeados)
- [ ] Verificar contraste AA y foco visible en ambos temas

## Fase 2 — Identidad (logo/assets)

- [ ] Generar el **logo** monograma `MC` (corte de tomo) → `src/assets/brand/logo.svg`
- [ ] Exportar `build/icon.png` (512/1024), `build/icon.ico` (multi), `electron/assets/tray-icon.png`
      (16/32) + favicon
- [ ] Usar el logo en Sidebar/header; borrar `assets/react.svg`

## Fase 3 — Layout A (sidebar modernizada)

- [ ] `Sidebar.jsx` + CSS: agrupada (Colección / Herramientas / App), colapsable, con logo y estado del bot
- [ ] Mantener `Sidebar` + `main-content` sin scroll horizontal y responsive

## Fase 4 — Componentes

- [ ] Cards (`CollectionView`): portada/identidad visual, anillo de progreso, chips y acciones
- [ ] Tabla y compacta re-estilizadas
- [ ] Modales (Add/Edit Entry, Add/Edit Manga, Recommendation, Settings, Nuke), ProfileSelector, Footer,
      ThemeToggle: alineados al sistema

## Fase 5 — Animaciones

- [ ] Transición de tema, hover-lift de cards, cross-fade de vista, modal fade+scale, sidebar expand,
      barras animadas, stagger de listas, press/underline
- [ ] Respetar `prefers-reduced-motion`

## Fase 6 — Portadas + vínculo con AniList

- [ ] `schema.sqlite.sql`: tabla aditiva `MangaExternalRef` + `SCHEMA_VERSION` 1 → 2 (sin `ALTER`)
- [ ] `repositories/manga-external-refs.js`: get/upsert/remove por `(mangaId, provider)`
- [ ] `services/covers.js`: `searchManga(query)` (AniList GraphQL, **sin key**, `User-Agent`, timeout) y
      `fetchCover(url)` (valida content-type imagen + tamaño máx)
- [ ] Auto-match al agregar/editar por título (variantes normalizadas); si es ambiguo, no vincula
- [ ] IPC `cover:search` · `cover:link` · `cover:fetch` · `cover:unlink` · `cover:status` (preload + adapter)
- [ ] Guardar la portada en `<userData>/covers/<mangaId>.<ext>` (nombre seguro) y setear
      `Manga.ImageUrl = mangacount://covers/<archivo>`
- [ ] Extender el protocolo `mangacount://` al host `covers` (con `path.basename`)
- [ ] `LinkCoverModal.jsx`: buscar (prellenado con el título local), listar candidatos (portada + títulos),
      elegir/desvincular
- [ ] Fallback: **portada generada** (gradiente por hash + iniciales + anillo) para cards sin portada
- [ ] Rate limit: secuencial + backoff `Retry-After` ante `429`
- [ ] Tests `node --test`: `searchManga` (fetch fake), `fetchCover` (rechaza no-imagen), repositorio de
      refs; `vitest`: cover en card + fallback + modal de vincular

## Fase 7 — Documentación y cierre

- [ ] `README.md` / `docs/desktop.md`: identidad/design system, logo, portadas y vínculo AniList
      (sin API key, cache, fallback)
- [ ] `CHANGELOG.md` + bump **2.0.0** (major por el rework visual)
- [ ] Correr `npm test` + suite del renderer + `lint` + `build:renderer`
- [ ] `ancleto-security` y `ancleto-verify` en verde
- [ ] Verificación cruzada contra proposal (qué), design (cómo) y delta specs

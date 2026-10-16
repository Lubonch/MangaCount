# Proposal: Rework visual 2.0.0 — identidad, design system y portadas (con vínculo a AniList)

## Problem

**A) La UI se ve genérica.** No hay identidad (logo de marca), ni *design tokens* (escala tipográfica,
radios, espaciado, sombras, motion). El theming ya existe por `data-theme` pero la paleta es ad-hoc
(tipo “bootstrap azulado”), `index.css` conserva el default de Vite y hay ~3400 líneas de CSS con
colores sueltos. Referencia elegida: **AniList** (superficies oscuras escalonadas + azul vivo + cards).

**B) No hay portadas.** `Manga.ImageUrl` existe en el esquema pero el repo no lo expone y la UI no
muestra imágenes de manga → las cards quedan “vacías”. Referencia AniList se apoya mucho en las portadas.

**C) Los títulos están localizados.** El nombre en la colección es el de la **edición física**
(español/local), mientras que AniList indexa por romaji/english/native. Buscar por el nombre local puede
fallar o mapear a otro manga. Se necesita una forma **explícita** de vincular cada manga con su entrada
de AniList **manteniendo el nombre local** de la colección.

## Proposed change

### 1. Design system (tokens + tipografía)

- **Tokens** en una capa base (CSS custom properties): color (marca/acento + escala neutra +
  semánticos éxito/prioridad/pending), tipografía (familia + escala display/título/cuerpo/label),
  espaciado (4/8), radios, sombras (elevación), bordes y **motion** (duración/easing).
- **Fuente Inter** (OFL); fallback al stack del sistema.
- **Temas dark (default) y light** con el mismo set de tokens; **azul vivo** de acento (estilo AniList).
- **Migrar** los CSS de componentes a tokens (sin hex hardcodeados) y limpiar `index.css`.

### 2. Identidad: logo (monograma `MC`)

- Monograma **`MC`** con **corte de “tomo”** en la `C`; vectorial (SVG) para header/menú, y export
  a **PNG 512/1024**, **ICO** multi-tamaño (Windows) y **PNG 16/32** (tray) + favicon.
- Reemplaza `build/icon.png/.ico`, `electron/assets/tray-icon.png` y el `react.svg` sobrante.

### 3. Layout A — sidebar modernizada

- Sidebar 300px → **240/260px**, **agrupada** (Colección / Herramientas / App), íconos + labels,
  **colapsable**, con el logo arriba y el estado del bot. Sin cambiar la estructura general
  (`Sidebar` + `main-content`), minimizando el riesgo.

### 4. Componentes

- **Cards** con portada/identidad visual, anillo de progreso, chips (formato/editorial/prioridad) y
  acciones; **tabla** y **compacta** re-estilizadas; **modales** (Add/Edit, Recommendation, Settings,
  Nuke), **ProfileSelector**, **Footer** y **ThemeToggle** alineados al sistema.

### 5. Animaciones (sutiles, 150–250ms, ease-out; respetan `prefers-reduced-motion`)

- Transición de tema, hover-lift de cards, cross-fade al cambiar de vista, modal fade+scale,
  expand/collapse de sidebar, barras de progreso animadas, stagger de listas, press/underline de tabs.

### 6. Portadas desde AniList + **vínculo** para títulos localizados

- **Búsqueda**: consulta anónima (GraphQL, **sin API key**) a `graphql.anilist.co`
  (`Page.media(search, type: MANGA)`), con `User-Agent`, y respeto del **rate limit**
  (hoy 30 req/min; `Retry-After`/`429` → backoff).
- **Vínculo (nuevo)**: se guarda una **referencia externa** manga↔AniList (`AniListId`) por manga, **sin
  tocar el nombre local**. Flujo:
  1. al agregar/editar, intento **automático** de match por título (probando romaji/english/native y
     variantes del nombre local);
  2. si no hay match único, UI **“Vincular con AniList”**: el usuario busca (puede ajustar el texto) y
     **elige** el candidato correcto viendo **portada + títulos**;
  3. se guarda el `AniListId` y se **descarga la portada**.
- **Cache local**: la portada se guarda en `<userData>/covers/<mangaId>.<ext>` y se sirve local
  (offline después de la primera vez). Se setea `Manga.ImageUrl` con una URL propia
  (`mangacount://covers/...`, análoga a las fotos de perfil).
- **Fallback**: si no hay vínculo/no hay red → **portada generada** (gradiente determinístico por
  título + iniciales + anillo de progreso), para que las cards nunca queden vacías.

## Scope

In scope:

- Capa de **tokens** + fuente Inter + temas dark/light; migración de los CSS de componentes a tokens.
- **Logo** nuevo (SVG + PNG/ICO/tray/favicon) y reemplazo de los assets placeholder.
- **Layout A** (sidebar modernizada, agrupada y colapsable).
- Re-estilo de **cards/tabla/compacta/modales/Settings/ProfileSelector/Footer**.
- **Animaciones** sutiles con `prefers-reduced-motion`.
- **Portadas**: cliente AniList (sin key) + **vínculo externo** + cache local + **portada generada** de
  fallback; expone `ImageUrl` y lo sirve por el protocolo propio.
- Docs (`README`/`docs/desktop.md`) y `CHANGELOG`; bump a **2.0.0**.
- Tests: tokens/lógica de match y de portada (con fetch fake), protocolo de covers, y `vitest` de
  render (footer por estado, cards con/sin portada).

Out of scope:

- Auto-match “perfecto”/ML de títulos: se hace match por título + **selección manual** del usuario.
- OAuth de AniList (solo lecturas públicas → **sin token**).
- Otras fuentes de portada (Kitsu/MangaDex) — quedan como alternativa futura.
- Reproductor/lector de manga, covers de usuario subidas a mano (posible follow-up), macOS.

## Risks

- **Rate limit de AniList** (30/min hoy): mitigación → buscar **solo al agregar/editar** + cache +
  backoff `Retry-After`. Nunca en render.
- **App local-first**: la red es opcional; sin conexión se usa el fallback generado y la cache.
- **Regresión visual**: ~3400 líneas de CSS en 2 temas; mitigación → migración por tokens + verificación
  visual (screenshots) en dark/light y estados (completo/prioridad/pending), además de la suite existente.
- **Esquema**: el vínculo externo requiere **migración** (tabla nueva aditiva o columna + bump de
  `SCHEMA_VERSION`); se define en el design para no romper bases existentes.
- **Seguridad** (para pasar `ancleto-security`): validar que lo descargado sea **imagen**
  (content-type + tamaño máx), guardar con nombre seguro (`path.basename`, extensión whitelist; evitar
  path traversal/zip-slip como ya se corrigió en backup), sin secretos, SVG sanitizado si va inline.
- **Accesibilidad**: contraste AA en ambos temas (texto sobre acento, foco visible).
- **Peso/packaging**: la fuente y los assets suman al bundle → usar tamaños justos (subset de Inter si
  hace falta).
- **Verify**: el rework es mayormente visual; se crean specs acotadas (tokens/identidad/portadas) y se
  valida que **no** haya regresión funcional (misma cobertura de features).

## Decisiones

- Layout A · fuente **Inter** · logo **monograma `MC` con corte de tomo** · animaciones (lista del punto 5).
- Portadas **con** vínculo externo y fallback generado; **sin** API key; cache local; dentro de este
  change (fases: look primero, portadas después).
- **2.0.0** (rework visual, sin cambios de datos incompatibles; la migración del vínculo es aditiva).

# Design: Rework visual 2.0.0 — identidad, design system y portadas (con vínculo a AniList)

## Approach

Por **fases** para bajar el riesgo (primero el look, después las portadas), sin tocar la lógica de
colección:

1. **Design system**: capa de **tokens** (base) + temas dark/light + **Inter**; migrar los CSS de
   componentes a tokens; limpiar `index.css` (sacar defaults de Vite).
2. **Identidad**: **logo** monograma `MC` (vector + PNG/ICO/tray/favicon) y reemplazo de assets.
3. **Layout A**: sidebar modernizada (agrupada, colapsable, con logo).
4. **Componentes**: re-estilo de cards/tabla/compacta/modales/Settings/Profiles/Footer.
5. **Animaciones** sutiles (`prefers-reduced-motion`).
6. **Portadas + vínculo**: cliente AniList (sin key), **referencia externa** por manga, cache local,
   protocolo de imágenes y **portada generada** de fallback.

## Architecture

```text
Renderer (mangacount.client)
├── src/styles/tokens.css     ← NUEVO: tokens base (:root) — color/espacios/radios/sombras/motion
├── src/styles/theme.css      ← dark (default) / light sobre los tokens (data-theme)
├── src/index.css             ← reset + @import tokens/theme + Inter (sin defaults de Vite)
├── src/assets/brand/logo.svg (+ variantes)
├── src/components/*.css      ← migrados a tokens (sin hex sueltos)
└── src/components/LinkCoverModal.jsx  ← NUEVO: buscar y elegir el manga de AniList

Electron main
├── services/covers.js        ← NUEVO: cliente AniList (search), fetch+cache de portada, fallback
├── db/schema.sqlite.sql      ← + tabla aditiva `MangaExternalRef` (provider, externalId, coverFile)
├── db/repositories/manga-external-refs.js  ← NUEVO
├── db/client.js              ← SCHEMA_VERSION 1 → 2 (aditivo: crea la tabla; no altera datos)
├── ipc/handlers.js           ← cover:search · cover:link · cover:fetch · cover:unlink · cover:status
└── index.js                  ← protocolo `mangacount://covers/<archivo>` (como `profiles`)
```

## Design system (tokens)

```text
tokens base
├── color:  --accent (azul vivo ~#3db4f2), --accent-hover, escalas neutras, semánticos (success/priority/pending)
├── tipografía: --font-sans (Inter, fallback sistema), --text-display/title/body/label, line-heights
├── espacio: --space-1..8 (4/8)
├── radios: --radius-sm/md/lg/full
├── sombras: --shadow-1..3 (elevación)
└── motion: --dur-fast/normal, --ease-out
tema dark (default) / light → mapea los tokens a valores concretos (superficies escalonadas, texto, bordes)
```

- **Migración**: cada `components/*.css` usa `var(--token)` en vez de colores hardcodeados; `App.css`
  deja de definir la paleta ad-hoc y pasa a consumir tokens.
- **Contraste AA** en ambos temas; foco visible con `--accent`.

## Identidad (logo/assets)

| Asset | Formato | Tamaño |
|---|---|---|
| `build/icon.png` | PNG | 512 (+1024) |
| `build/icon.ico` | ICO | multi 16–256 |
| `electron/assets/tray-icon.png` | PNG | 16/32 (@2x) |
| `src/assets/brand/logo.svg` | SVG (header/menú) | vectorial |
| favicon (web build) | PNG/ICO | 32/48 |

Monograma **`MC`** con **corte de “tomo”** en la `C`; SVG sanitizado (sin `<script>`/`onload`) si va inline.

## Layout A (sidebar)

```text
┌───────────┬──────────────────────────────┐
│ ▣ MangaCount │  Colección        [+][🔍]  │
│ COLECCIÓN   │  ┌────┐┌────┐┌────┐          │
│  ▸ Vista    │  │card││card││card│          │
│ HERRAMIENTAS│  └────┘└────┘└────┘          │
│  ▸ Recomendar                             │
│ APP         │                             │
│  ▸ Settings · tema · bot · ⚙️             │
└───────────┴──────────────────────────────┘
```

- 300px → 240/260px, secciones con título, **colapsable** (rail), logo arriba; se mantiene
  `Sidebar` + `main-content` (bajo riesgo).

## Portadas + vínculo (AniList)

**Cliente** (`services/covers.js`):

```js
// Sin API key: consulta pública anónima.
searchManga(query) → POST https://graphql.anilist.co { Page.media(search, type: MANGA) { id title{romaji english native} coverImage{large} } }
```

- **Rate limit**: hoy **30 req/min** (degradado) → llamadas **secuenciales**, solo por acción del
  usuario (agregar/editar/vincular), y **backoff** ante `429` (`Retry-After`).
- **Vínculo**: tabla aditiva `MangaExternalRef(Id, MangaId, Provider='anilist', ExternalId, CoverFile, UpdatedAt)`
  con `UNIQUE(MangaId, Provider)`. **No** cambia el nombre local del manga.
- **Auto-match al agregar/editar**: se intenta por título (probando variantes normalizadas:
  romaji/english/native + quitar “edición/kanzenban/tomo…”). Si hay **un** match claro → se vincula; si no
  (o hay varios) → queda sin vínculo y la UI ofrece **Vincular con AniList**.
- **UI “Vincular con AniList”** (`LinkCoverModal`): input de búsqueda (prellenado con el título local,
  editable), lista de candidatos con **portada + títulos**, y “Usar este”. También **Desvincular/rebuscar**.
- **Fetch + cache**: tras vincular, se descarga `coverImage.large` → se valida (**content-type imagen** +
  tamaño máx) → se guarda como `<userData>/covers/<mangaId>.<ext>` (nombre por `mangaId`, extensión
  whitelist) → `Manga.ImageUrl = mangacount://covers/<archivo>`.
- **Protocolo**: extender el handler para el host `covers` (mismo criterio que `profiles`, con
  `path.basename`).
- **Fallback generado**: si no hay vínculo/no hay red, la card muestra un **gradiente determinístico por
  título + iniciales + anillo de progreso** (renderer, sin red). Las cards **nunca** quedan vacías.

## Migración de esquema

- **Aditiva**: agregar `CREATE TABLE IF NOT EXISTS MangaExternalRef (...)` al `schema.sqlite.sql` y subir
  `SCHEMA_VERSION` **1 → 2**. En bases existentes (`user_version=1`) el `openDb` re-ejecuta el schema
  (idempotente: `IF NOT EXISTS`) → crea la tabla **sin** tocar `Manga`/`Entry`. No hay `ALTER` ni
  pérdida de datos.
- `Manga.ImageUrl` ya existe.

## Reuse map

| Necesidad | Fuente |
|---|---|
| Protocolo de imágenes | patrón de `profiles` (`protocol.handle('mangacount', …)`) |
| Escritura segura de archivos | patrón de `saveProfilePicture` (`services/files.js`) |
| Fetch con timeout/UA | patrón de `services/updates.js` (`fetchLatestReport`/AbortController) |
| Persistencia | `repositories/*` + `db/client.js` (`openDb`) |
| Temas | `data-theme` (`ThemeContext`) + tokens nuevos |

## Validation

- **Tokens/temas**: dark y light aplican; contraste AA; foco visible; `index.css` sin defaults de Vite.
- **Logo**: assets presentes en todos los tamaños; app/tray/favicon lo usan.
- **Layout**: sidebar colapsable; sin scroll horizontal; responsive (retomando los fixes previos).
- **Animaciones**: presentes y desactivadas con `prefers-reduced-motion`.
- **Covers (sin red, con fetch fake)**: `searchManga` parsea candidatos; vincular guarda `MangaExternalRef`;
  fetch valida imagen y escribe `<userData>/covers/<mangaId>.<ext>`; el protocolo sirve el archivo; un
  archivo no-imagen o gigante se **rechaza**.
- **Vínculo localizado**: un manga con nombre local (`"Berserk Edición Kanzenban"`) puede vincularse a la
  entrada correcta de AniList **sin** cambiar su nombre.
- **Fallback**: sin vínculo → portada generada.
- **No regresión funcional**: CRUD, import/export TSV, recomendaciones, backup, bot, updates siguen
  andando; la suite existente sigue verde; **security** y **verify** pasan.

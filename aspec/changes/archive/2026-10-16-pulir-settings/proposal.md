# Proposal: Pulir la pantalla Settings (estilos propios e idioma unificado)

> Contexto: derivado de una delegación con rutas citadas del repo (brownfield). Sin seed técnico de
> technical-discovery; el alcance se limita a lo aquí descrito.

## Problem

La pantalla Settings (`mangacount.client/src/components/SettingsModal.jsx` + `SettingsModal.css`) se ve
descuidada porque **reusa clases definidas en `Sidebar.css`**, pensadas para una barra de 260px, dentro
de un modal de 720px:

- `.action-button` (`Sidebar.css:139`, `padding: 12px 16px`) → usada por "Export TSV" y "Traer
  portadas faltantes" → botones con la escala de la sidebar.
- `.file-input-label` (`Sidebar.css:196`, `display:block`, `text-align:center`, `padding:10px 15px`) →
  el selector de archivo TSV.
- `.import-section` (`Sidebar.css:185`, fondo `--sidebar-accent` + borde de sidebar) → la caja del
  bloque TSV queda como un bloque de sidebar dentro del modal.
- `.danger-button` (`Sidebar.css:474`, **`width:100%`** + `margin-bottom:8px`) → "Restaurar…" y
  "NUKE DATABASE" ocupan todo el ancho y fuerzan su propia fila.
- `.settings-body` (`SettingsModal.css:10`) tiene `padding: 16px 8px` → solo **8px** a los lados
  mientras `.settings-section` mete 16px adentro → las secciones quedan **muy cerca del borde** del modal.

Además:

- La sección **"Intercambio"** (`SettingsModal.jsx:539`) contiene el **import/export TSV**; el nombre es
  una metáfora poco clara (nació al mover el import TSV del Sidebar a Settings).
- **Idioma mezclado** en el modal: etiquetas en español ("Intercambio", "Restaurar…", "Traer portadas
  faltantes", "Arrancar en la bandeja") conviven con strings en inglés ("Choose TSV File",
  "Export TSV", "Importing...", "Select a profile first", "NUKE DATABASE", títulos de sección
  "General/Backup/Bot/Danger Zone").

## Proposed change

Opción **A + B** aprobada:

**A — Limpieza visual (clases propias sobre design tokens).**

- Dar a Settings **clases propias** para botones (p. ej. `.settings-btn`, `.settings-btn--primary`,
  `.settings-btn--danger`) implementadas sobre los **design tokens** (`tokens.css`/`theme.css`), **sin
  `width:100%`** salvo donde el diseño lo pida explícitamente.
- **Dejar de usar** `.action-button`, `.file-input-label`, `.import-section` y `.danger-button` en
  `SettingsModal.jsx`; usar el estilo de sección existente en lugar de `.import-section`.
- **Padding consistente** del body (16px a los lados) para que las secciones no queden pegadas al borde.

**B — Naming + idioma.**

- Renombrar la sección **"Intercambio" → "Importar / Exportar (TSV)"** (nombre explícito; el hint de
  TSV queda en el propio título).
- **Unificar el modal a español**: los strings en inglés pasan a español y los títulos de sección
  quedan en español consistente.

Sin romper el look del Sidebar: ahí siguen usándose sus clases (`.action-button`, `.file-input-label`,
`.import-section`, `.danger-button`) tal como están.

## Scope

**In scope**

- `mangacount.client/src/components/SettingsModal.jsx`: reemplazo de clases reusadas del Sidebar por
  clases propias del modal, renombre de la sección de intercambio y traducción de strings.
- `mangacount.client/src/components/SettingsModal.css`: nuevas clases de botón/sección sobre tokens y
  ajuste del padding del body.
- `mangacount.client/src/test/components/SettingsModal.test.jsx`: actualizar los tests afectados por el
  renombre de la sección y los strings en español; agregar los que cubran el nuevo naming.
- Gates de cobertura (≥90%) y lint del renderer.

**Out of scope**

- Sub-navegación / rieles laterales dentro de Settings (opción **C**): queda como mejora futura.
- Cambios en `Sidebar.css` o en el comportamiento del Sidebar.
- Cambios de lógica/contratos IPC (backup, bot, import/export, updates, diagnóstico).
- Migrar el import TSV de `fetch('/api/...')` a IPC `entry:import` (comportamiento actual sin cambios).

## Risks

- **Divergencia de specs**: la spec de `frontend-web` ("Pantalla de Settings unificada") y la de
  `import-export` nombran la sección como **"Intercambio"**. Este change la renombra; conviene
  reconciliar/`MODIFIED` al archivar (ver design → Validation).
- **Regresión visual en el Sidebar**: mitigación → no tocar `Sidebar.css`; sus clases siguen intactas.
- **Tests acoplados a strings en inglés/renombre**: los tests existentes buscan "Intercambio" y
  "Choose TSV File"; deben actualizarse en el mismo cambio.
- **Gate de cobertura ≥90%**: el cambio es mayormente de render/estilos; los tests de render deben
  seguir cubriendo las ramas afectadas.
- **Accesibilidad**: los nuevos controles conservan `aria-label`/foco visible sobre tokens.

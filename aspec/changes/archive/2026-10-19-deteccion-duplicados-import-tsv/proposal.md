# Proposal: Detección y revisión de duplicados al importar TSV

## Problem

La importación TSV solo reutiliza un manga cuando el título coincide **exactamente** (sin distinguir
mayúsculas) con uno existente (`findMangaByName`). Cualquier variación del mismo título crea un manga
nuevo:

- Acentos o puntuación: `K-On` vs `K-On!`, `Nausicaä` vs `Nausicaa`.
- Nombre incompleto o con prefijo: `Kuuga` vs `Kamen Rider Kuuga`.
- Diferencias de edición: `Battle Royale` vs `Battle Royale Deluxe`.
- Typos o espacios distintos.

El problema ya existe en bases reales: al revisar una base local se encontraron pares de mangas con el
**mismo `ExternalId` de AniList** pero distinto título, y variantes detectables por título que no
comparten referencia externa. Hoy el usuario no tiene forma de revisar esas coincidencias antes de
escribir: el import se aplica completo en una sola operación y los duplicados aparecen después, ya
persistidos.

Además, la importación no ofrece ninguna pantalla de confirmación: elegir el archivo equivale a
escribir. No hay oportunidad de decir "esta fila es la misma serie que esta otra" ni de cancelar sin
consecuencias.

## Proposed change

- **Previsualización sin escritura**: nuevo canal `entry:import-preview` que parsea el TSV y devuelve
  las filas más los posibles duplicados detectados, sin tocar la base. El import actual
  (`entry:import`) se mantiene para compatibilidad y pasa a aceptar decisiones opcionales.
- **Detección de posibles duplicados** contra:
  - los mangas ya existentes en la base (global, porque `Manga` es compartido entre perfiles), y
  - las filas anteriores del mismo archivo (duplicados internos del lote).
- **Señales de coincidencia** (offline, sin depender de AniList):
  - título normalizado idéntico (acentos, mayúsculas, puntuación y espacios);
  - contención de tokens (`Kuuga` dentro de `Kamen Rider Kuuga`);
  - similitud difusa para typos;
  - guarda de tokens numéricos: `Parte 1` vs `Parte 2`, `Another` vs `Another 0` y `Battle Royale` vs
    `Battle Royale 2` **no** se proponen como duplicados.
- **Pantalla de revisión**: al final de la selección del archivo, si hay candidatos, se muestra una
  pantalla con cada par (`fila del TSV` vs `manga existente` o `fila anterior`) y las opciones
  **“Son lo mismo”** / **“No son lo mismo”**. La importación queda pendiente hasta resolver todos los
  candidatos; cancelar no escribe nada.
- **Commit atómico con decisiones**: al confirmar, `entry:import` recibe las decisiones y aplica todo
  en una transacción:
  - “Son lo mismo” reutiliza el manga candidato y actualiza la entry del perfil;
  - “No son lo mismo” crea un manga nuevo, aunque el título normalizado coincida;
  - las filas sin candidato conservan el comportamiento actual (match exacto o alta).
- **Resumen e i18n**: la pantalla y el mensaje final informan cuántas series se importaron, cuántas se
  fusionaron con un manga existente y cuántas se crearon; claves ES/EN con paridad.

## Scope

**In scope**

- Nuevo servicio `electron/main/services/duplicate-detection.js` con normalización, similitud y
  detección de candidatos.
- `entry:import` acepta `{ profileId, tsv, decisions }`; nuevo `entry:import-preview`.
- `importTsv` aplica las decisiones y devuelve conteos (`imported`, `merged`, `created`).
- Adaptador del renderer: `entryImportPreview` y `entryImportCommit` + rutas del shim de fetch.
- Nueva pantalla/modal de revisión en `SettingsModal` (o componente hijo) con las dos opciones por
  candidato, progreso y cancelación.
- Claves i18n en `shared/i18n/es.js` y `en.js`.
- Tests del detector, del servicio de import, de los handlers IPC, del renderer y de paridad i18n.

**Out of scope**

- Fusionar automáticamente mangas ya duplicados en la base: la limpieza histórica es una operación
  puntual fuera del change.
- Detección basada en AniList/red: la revisión es offline por título; el vínculo de portada sigue siendo
  una acción posterior.
- Cambiar el formato TSV de 8 columnas o aceptar CSV.
- Un CRUD general de fusión de mangas en la colección.
- Detección de duplicados en el bot de Discord o en el alta manual.
- Resolver automáticamente duplicados internos del archivo sin confirmación del usuario.

## Risks

- **Falsos positivos** (títulos parecidos pero distintos): la pantalla no bloquea; el usuario elige “No
  son lo mismo” y se crea el manga como hoy. La guarda numérica reduce el ruido de secuelas y partes.
- **Falsos negativos** (variantes no detectadas): la revisión es una ayuda, no una validación
  obligatoria; el usuario puede cancelar, corregir el TSV o resolverlo después.
- **Diferencias de edición**: `Deluxe`, `LN` o `Gantz:G` pueden aparecer como candidatos; la decisión
  queda en el usuario, que ya demostró que quiere evaluarlos caso por caso.
- **Manga compartido entre perfiles**: al fusionar se reutiliza el manga global; los metadatos
  (formato/editorial) pueden ser los del manga candidato. Mitigación: el import actual ya actualiza
  formato/editorial cuando reutiliza un manga; se mantiene ese comportamiento y se informa en la
  pantalla.
- **Duplicados internos del lote**: dos filas pueden apuntar al mismo manga nuevo; la última entry
  actualiza la anterior dentro de la misma transacción. Mitigación: la pantalla muestra ambas filas y
  el usuario decide; el commit es determinista y atómico.
- **Cambio entre preview y commit**: el renderer reenvía el mismo texto y las decisiones; el detector es
  determinista. Si el TSV no coincide, las decisiones se validan por índice de fila y se rechaza la
  importación si falta alguna decisión para un candidato.

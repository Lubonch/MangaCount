# Design: El backup integrado incluye las portadas (`covers/`)

## Approach

Generalizar el backup/restore sobre una lista de carpetas de recursos
(`profiles/`, `covers/`) en vez de tratar `profiles/` como caso especial. La base se sigue tomando
con `db.backup()` (snapshot WAL-safe) y el `manifest.json` no cambia.

1. **Constantes**: `COVERS_DIR = 'covers'` y `RESOURCE_DIRS = [PROFILES_DIR, COVERS_DIR]`.
2. **Creación**: recorrer cada carpeta de `RESOURCE_DIRS` con `walkFiles` y agregar sus archivos al
   zip con el prefijo `<carpeta>/<ruta relativa>`.
3. **Restore**: para cada carpeta de `RESOURCE_DIRS`, borrar el directorio actual y recrearlo vacío;
   luego extraer las entradas del zip cuyo primer segmento coincide con una carpeta de recursos,
   aplicando el mismo guard anti zip-slip (`..`, segmentos vacíos y `path.resolve` dentro del base).
4. **Compatibilidad**: un backup viejo sin entradas `covers/` restaura igual; el cache de portadas
   queda vacío porque el restore es un reemplazo completo del estado.

## Architecture

```text
electron/main/services/backup.js
├── PROFILES_DIR = 'profiles'
├── COVERS_DIR   = 'covers'
├── RESOURCE_DIRS = [PROFILES_DIR, COVERS_DIR]
├── createBackup()
│   ├── snapshot db → mangacount.db
│   └── for dir of RESOURCE_DIRS: walkFiles(<dataDir>/dir) → `<dir>/<rel>`
└── restoreBackup()
    ├── validateBackup() (manifest + integrity_check)
    ├── safety backup
    ├── db.close(); reemplazar mangacount.db (+ limpiar -wal/-shm)
    └── for dir of RESOURCE_DIRS: rm -rf + mkdir + extraer entradas `<dir>/...`
```

```js
const RESOURCE_DIRS = [PROFILES_DIR, COVERS_DIR];

for (const dirName of RESOURCE_DIRS) {
  for (const file of walkFiles(path.join(dataDir, dirName))) {
    files[`${dirName}/${file.rel}`] = new Uint8Array(fs.readFileSync(file.full));
  }
}

for (const dirName of RESOURCE_DIRS) {
  const base = path.join(dataDir, dirName);
  fs.rmSync(base, { recursive: true, force: true });
  fs.mkdirSync(base, { recursive: true });
}

for (const [name, bytes] of Object.entries(entries)) {
  const dirName = RESOURCE_DIRS.find((d) => name.startsWith(`${d}/`));
  if (!dirName) continue;
  const rel = name.slice(dirName.length + 1);
  if (!rel || rel.split('/').some((seg) => seg === '..' || seg === '')) continue;
  const base = path.join(dataDir, dirName);
  const target = path.resolve(base, rel);
  if (target !== base && !target.startsWith(base + path.sep)) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}
```

## Validation

- Tests de `electron/main/services/backup.test.js`:
  - el zip contiene `covers/<archivo>`;
  - restore repone las portadas del backup y elimina las que no estaban;
  - zip-slip con `covers/../evil.txt` se descarta;
  - restore de un backup sin `covers/` no falla y deja el cache vacío.
- `npm test`, `npm run test:renderer:coverage`, `npm run lint:renderer`, `npm run build:renderer`.
- Verificación manual: backup con portadas → restaurar en un `dataDir` limpio → las portadas cargan
  por `mangacount://covers/...`.

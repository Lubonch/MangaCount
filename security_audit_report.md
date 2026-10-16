# Security Audit Report — MangaCount

**Scope:** proyecto completo (Electron main + renderer + shared).
**Fecha:** 2026-10-16
**Herramientas:** `npm audit` (root y client), `eslint`, revisión manual (grep + lectura).

## Resumen

| Severidad | Cantidad |
|---|---|
| Critical | 0 |
| High | 1 |
| Medium | 0 |
| Low | 1 |

`npm audit`: **0 vulnerabilidades** (root y client). `eslint`: 0 errores.

## Hallazgos

### HIGH — Zip-slip al restaurar un backup (escritura arbitraria de archivos)

- **Ubicación:** `electron/main/services/backup.js:180-186` (`restoreBackup`).
- **Detalle:** al restaurar, se recorre cada entrada del `.zip`; para las que empiezan con `profiles/`
  se calcula `path.join(profilesPath, ...rel.split('/'))` **sin validar `..`**. Un backup `.zip`
  manipulado con entradas tipo `profiles/../../../../home/<user>/.bashrc` (o cualquier ruta con `..`)
  escribe **fuera** de `<userData>/profiles`, con los permisos del usuario que corre la app.
- **Impacto:** sobrescritura de archivos arbitrarios del usuario (p. ej. dotfiles, config) al restaurar
  un backup ajeno/crafteado. Requiere que el usuario elija ese `.zip` en "Restaurar…".
- **Remediación** (validar que el destino quede dentro de `profilesPath`):

```js
for (const [name, bytes] of Object.entries(entries)) {
  if (!name.startsWith(`${PROFILES_DIR}/`)) continue;
  const rel = name.slice(PROFILES_DIR.length + 1);
  if (!rel || rel.split('/').some((seg) => seg === '..' || seg === '')) continue; // zip-slip
  const target = path.resolve(profilesPath, rel);
  if (target !== profilesPath && !target.startsWith(profilesPath + path.sep)) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}
```

- **Test sugerido:** un zip con `profiles/../evil.txt` no debe escribir fuera de `profiles/`.

### LOW — `shell.openExternal` sin restringir el esquema

- **Ubicación:** `electron/main/index.js:137-138` (`setWindowOpenHandler`).
- **Detalle:** ante `window.open(url)` / enlaces `target="_blank"`, se llama `shell.openExternal(url)`
  con **cualquier** URL/esquema (p. ej. `file://`, esquemas custom). El renderer es propio (riesgo bajo),
  pero conviene limitar a `http(s)`.
- **Remediación:**

```js
win.webContents.setWindowOpenHandler(({ url }) => {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  return { action: 'deny' };
});
```

### INFO — Configuración de seguridad del renderer

- `contextIsolation: true` y `nodeIntegration: false` (`index.js:132-133`): correcto.
- `sandbox` no está seteado explícitamente → Electron usa `true` por defecto: OK.
- `preload.cjs` valida el canal contra una whitelist y rechaza los no registrados: correcto.
- `serveProfileImages` usa `path.basename`: sin path traversal.

## Lo que está bien (sin hallazgos)

- **SQL:** todas las consultas son parametrizadas (`better-sqlite3` con `?`); **no hay** concatenación
  de SQL con input del usuario. `db.exec(schema)` es un esquema estático.
- **XSS:** **no** hay `dangerouslySetInnerHTML`/`innerHTML`; React escapa por defecto.
- **Command injection:** **no** hay `child_process`/`exec`/`spawn` con input; los `.exec(` encontrados
  son `RegExp.exec` y `db.exec` (estático).
- **Secretos:** el token de Discord se guarda con `safeStorage` en `<userData>/discord-token.bin`
  (nunca en `preferences.json` ni en el repo); no hay claves hardcodeadas.
- **Path traversal:** el protocolo `mangacount://` usa `path.basename`; los diálogos de archivo/carpeta
  son elegidos por el usuario (intencional).
- **`eval`/`new Function`:** ninguno.

## Plan de acción propuesto

1. **Aplicar el fix de zip-slip** (High) en `restoreBackup` + test con `profiles/../evil.txt`.
2. **Restringir `openExternal` a http(s)** (Low).
3. (Opcional) agregar el `sandbox: true` explícito en `webPreferences` para dejarlo documentado.

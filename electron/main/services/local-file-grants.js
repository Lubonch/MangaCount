import path from 'node:path';

// Permisos efímeros y de un solo uso para archivos elegidos por el diálogo nativo.
// El renderer no puede hacer leer al main una ruta arbitraria vía `cover:local`:
// el handler solo acepta rutas que `dialog:pick-file` haya devuelto antes en esta
// sesión, y cada permiso se consume con el primer uso.
export function createLocalFileGrants() {
  const granted = new Set();

  const key = (value) =>
    typeof value === 'string' && value.trim() !== '' ? path.resolve(value) : null;

  return {
    grant(value) {
      const resolved = key(value);
      if (!resolved) return false;
      granted.add(resolved);
      return true;
    },
    consume(value) {
      const resolved = key(value);
      if (!resolved || !granted.has(resolved)) return false;
      granted.delete(resolved);
      return true;
    },
  };
}

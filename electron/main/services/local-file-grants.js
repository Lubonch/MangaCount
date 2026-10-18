import path from 'node:path';

// Ephemeral, single-use permissions for files chosen via the native dialog.
// The renderer cannot make the main process read an arbitrary path via `cover:local`:
// the handler only accepts paths that `dialog:pick-file` returned earlier in this
// session, and each permission is consumed on first use.
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

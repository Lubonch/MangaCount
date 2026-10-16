// Reconversión de NukeDataModal: "borrar todos los datos locales" contra SQLite.
// Borra entries, mangas y perfiles, pero conserva los catálogos. Deja la base en
// **estado cero de perfiles** (sin re-sembrar): el usuario crea uno al volver a
// la selección de perfiles.

import { getCounts } from '../db/client.js';

export function databaseStatistics(db) {
  return getCounts(db);
}

export function nukeLocalData(db) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM Entry').run();
    db.prepare('DELETE FROM Manga').run();
    db.prepare('DELETE FROM Profile').run();
  });
  tx();
  return { ok: true, ...getCounts(db) };
}

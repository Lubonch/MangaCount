// Reconversión de NukeDataModal: "borrar todos los datos locales" contra SQLite.
// Divergencia documentada vs DatabaseService.NukeAllDataAsync (borraba TODO
// incluido el seed): aquí se conservan los catálogos y se reasegura el perfil
// por defecto para que la app siga utilizable tras el borrado.

import { getCounts } from '../db/client.js';

export function databaseStatistics(db) {
  return getCounts(db);
}

export function nukeLocalData(db) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM Entry').run();
    db.prepare('DELETE FROM Manga').run();
    db.prepare('DELETE FROM Profile').run();
    db.prepare("INSERT OR IGNORE INTO Profile (Name) VALUES ('Default Profile')").run();
  });
  tx();
  return { ok: true, ...getCounts(db) };
}

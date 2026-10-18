// Reimplementation of NukeDataModal: "delete all local data" against SQLite.
// Deletes entries, mangas and profiles, but keeps the catalogs. Leaves the DB in
// **zero-profile state** (without re-seeding): the user creates one when returning to
// the profile selection.

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

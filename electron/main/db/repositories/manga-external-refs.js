// Link of a manga to an external entry (e.g. AniList).
// Additive: it does not change the local manga name. One record per (MangaId, Provider).
// DTO: { id, mangaId, provider, externalId, coverFile, isAdult, updatedAt }.

const SELECT =
  'Id AS id, MangaId AS mangaId, Provider AS provider, ExternalId AS externalId, ' +
  'CoverFile AS coverFile, IsAdult AS isAdult, UpdatedAt AS updatedAt FROM MangaExternalRef';

// SQLite stores the flag as 0/1; the DTO exposes it as a boolean.
function toRef(row) {
  if (!row) return row;
  return { ...row, isAdult: row.isAdult === 1 || row.isAdult === true };
}

export function getRef(db, mangaId, provider) {
  return toRef(
    db
      .prepare(`SELECT ${SELECT} WHERE MangaId = ? AND Provider = ?`)
      .get(mangaId, provider) ?? null
  );
}

export function listRefsByManga(db, mangaId) {
  return db.prepare(`SELECT ${SELECT} WHERE MangaId = ? ORDER BY Provider`).all(mangaId).map(toRef);
}

export function listRefs(db) {
  return db.prepare(`SELECT ${SELECT}`).all().map(toRef);
}

export function upsertRef(db, { mangaId, provider, externalId, coverFile = null, isAdult = false }) {
  db.prepare(
    `INSERT INTO MangaExternalRef (MangaId, Provider, ExternalId, CoverFile, IsAdult, UpdatedAt)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(MangaId, Provider) DO UPDATE SET
       ExternalId = excluded.ExternalId,
       CoverFile = excluded.CoverFile,
       IsAdult = excluded.IsAdult,
       UpdatedAt = CURRENT_TIMESTAMP`
  ).run(mangaId, provider, String(externalId), coverFile, isAdult ? 1 : 0);
  return getRef(db, mangaId, provider);
}

export function setCoverFile(db, mangaId, provider, coverFile) {
  db.prepare(
    'UPDATE MangaExternalRef SET CoverFile = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE MangaId = ? AND Provider = ?'
  ).run(coverFile, mangaId, provider);
  return getRef(db, mangaId, provider);
}

export function removeRef(db, mangaId, provider) {
  const info = db
    .prepare('DELETE FROM MangaExternalRef WHERE MangaId = ? AND Provider = ?')
    .run(mangaId, provider);
  return info.changes > 0;
}

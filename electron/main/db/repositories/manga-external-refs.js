// Vínculo de un manga con una entrada externa (p. ej. AniList).
// Aditivo: no cambia el nombre local del manga. Un registro por (MangaId, Provider).
// DTO: { id, mangaId, provider, externalId, coverFile, updatedAt }.

const SELECT =
  'Id AS id, MangaId AS mangaId, Provider AS provider, ExternalId AS externalId, ' +
  'CoverFile AS coverFile, UpdatedAt AS updatedAt FROM MangaExternalRef';

export function getRef(db, mangaId, provider) {
  return (
    db
      .prepare(`SELECT ${SELECT} WHERE MangaId = ? AND Provider = ?`)
      .get(mangaId, provider) ?? null
  );
}

export function listRefsByManga(db, mangaId) {
  return db.prepare(`SELECT ${SELECT} WHERE MangaId = ? ORDER BY Provider`).all(mangaId);
}

export function listRefs(db) {
  return db.prepare(`SELECT ${SELECT}`).all();
}

export function upsertRef(db, { mangaId, provider, externalId, coverFile = null }) {
  db.prepare(
    `INSERT INTO MangaExternalRef (MangaId, Provider, ExternalId, CoverFile, UpdatedAt)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(MangaId, Provider) DO UPDATE SET
       ExternalId = excluded.ExternalId,
       CoverFile = excluded.CoverFile,
       UpdatedAt = CURRENT_TIMESTAMP`
  ).run(mangaId, provider, String(externalId), coverFile);
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

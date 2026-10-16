// Port directo de EntryRepository.cs, incluyendo el JOIN con manga/format/publisher
// y el upsert ON CONFLICT(ProfileId, MangaId) (SQLite soporta la misma sintaxis).
// DTO: {id, mangaId, profileId, quantity, pending, priority, manga: {...}}.

function mapRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    mangaId: r.mangaId,
    profileId: r.profileId,
    quantity: r.quantity,
    pending: r.pending,
    priority: !!r.priority,
    manga: r.manga_id
      ? {
          id: r.manga_id,
          name: r.manga_name,
          volumes: r.manga_volumes,
          formatId: r.manga_formatId,
          publisherId: r.manga_publisherId,
          format: r.format_id ? { id: r.format_id, name: r.format_name } : null,
          publisher: r.publisher_id ? { id: r.publisher_id, name: r.publisher_name } : null,
        }
      : null,
  };
}

const JOIN = `
  FROM Entry e
  LEFT JOIN Manga m ON e.MangaId = m.Id
  LEFT JOIN Format f ON m.FormatId = f.Id
  LEFT JOIN Publisher p ON m.PublisherId = p.Id`;

const COLS = `
  e.Id AS id, e.MangaId AS mangaId, e.ProfileId AS profileId,
  e.PurchasedVolumes AS quantity, e.PendingVolumes AS pending, e.IsPriority AS priority,
  m.Id AS manga_id, m.Title AS manga_name, m.TotalVolumes AS manga_volumes,
  m.FormatId AS manga_formatId, m.PublisherId AS manga_publisherId,
  f.Id AS format_id, f.Name AS format_name,
  p.Id AS publisher_id, p.Name AS publisher_name`;

export function listEntries(db, profileId = null) {
  let sql = `SELECT ${COLS} ${JOIN}`;
  const params = [];
  if (profileId != null) {
    sql += ' WHERE e.ProfileId = ?';
    params.push(profileId);
  }
  return db.prepare(sql).all(...params).map(mapRow);
}

export function getEntryById(db, id) {
  return mapRow(db.prepare(`SELECT ${COLS} ${JOIN} WHERE e.Id = ?`).get(id));
}

export function upsertEntry(db, { mangaId, profileId, quantity = 0, pending = null, priority = false }) {
  const info = db
    .prepare(
      `INSERT INTO Entry (MangaId, ProfileId, PurchasedVolumes, PendingVolumes, IsPriority)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (ProfileId, MangaId) DO UPDATE SET
         PurchasedVolumes = excluded.PurchasedVolumes,
         PendingVolumes = excluded.PendingVolumes,
         IsPriority = excluded.IsPriority
       RETURNING Id AS id`
    )
    .get(mangaId, profileId, quantity, pending, priority ? 1 : 0);
  return getEntryById(db, info.id);
}

export function updateEntry(db, { id, mangaId, profileId, quantity, pending, priority }) {
  db.prepare(
    `UPDATE Entry SET MangaId = ?, ProfileId = ?, IsPriority = ?,
       PendingVolumes = ?, PurchasedVolumes = ? WHERE Id = ?`
  ).run(mangaId, profileId, priority ? 1 : 0, pending, quantity, id);
  return getEntryById(db, id);
}

export function listEntriesByProfiles(db, profileId1, profileId2) {
  return db
    .prepare(`SELECT ${COLS} ${JOIN} WHERE e.ProfileId IN (?, ?)`)
    .all(profileId1, profileId2)
    .map(mapRow);
}

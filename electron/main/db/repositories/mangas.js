// Port directo de MangaRepository.cs. DTO: {id, name, volumes, formatId, publisherId}.

const SELECT =
  'Id AS id, Title AS name, TotalVolumes AS volumes, FormatId AS formatId, PublisherId AS publisherId FROM Manga';

export function listMangas(db) {
  return db.prepare(`SELECT ${SELECT} ORDER BY Title`).all();
}

export function getMangaById(db, id) {
  return db.prepare(`SELECT ${SELECT} WHERE Id = ?`).get(id) ?? null;
}

export function createManga(db, { name, volumes = 0, formatId = null, publisherId = null }) {
  const info = db
    .prepare('INSERT INTO Manga (Title, TotalVolumes, FormatId, PublisherId) VALUES (?, ?, ?, ?)')
    .run(name, volumes, formatId, publisherId);
  return getMangaById(db, Number(info.lastInsertRowid));
}

export function updateManga(db, { id, name, volumes, formatId, publisherId }) {
  db.prepare(
    'UPDATE Manga SET Title = ?, TotalVolumes = ?, FormatId = ?, PublisherId = ? WHERE Id = ?'
  ).run(name, volumes, formatId, publisherId, id);
  return getMangaById(db, id);
}

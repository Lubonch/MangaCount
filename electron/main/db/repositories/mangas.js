// Port directo de MangaRepository.cs. DTO: {id, name, volumes, formatId, publisherId}.

const SELECT =
  'Id AS id, Title AS name, TotalVolumes AS volumes, FormatId AS formatId, PublisherId AS publisherId FROM Manga';

// TotalVolumes es NOT NULL: vacío/`null`/inválido -> 0 (serie en publicación).
const safeVolumes = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function listMangas(db) {
  return db.prepare(`SELECT ${SELECT} ORDER BY Title`).all();
}

export function getMangaById(db, id) {
  return db.prepare(`SELECT ${SELECT} WHERE Id = ?`).get(id) ?? null;
}

export function createManga(db, { name, volumes, formatId = null, publisherId = null }) {
  const info = db
    .prepare('INSERT INTO Manga (Title, TotalVolumes, FormatId, PublisherId) VALUES (?, ?, ?, ?)')
    .run(name, safeVolumes(volumes), formatId, publisherId);
  return getMangaById(db, Number(info.lastInsertRowid));
}

export function updateManga(db, { id, name, volumes, formatId, publisherId }) {
  db.prepare(
    'UPDATE Manga SET Title = ?, TotalVolumes = ?, FormatId = ?, PublisherId = ? WHERE Id = ?'
  ).run(name, safeVolumes(volumes), formatId, publisherId, id);
  return getMangaById(db, id);
}

// Borra el manga (sus Entry caen por ON DELETE CASCADE).
export function deleteManga(db, id) {
  return db.prepare('DELETE FROM Manga WHERE Id = ?').run(id).changes > 0;
}

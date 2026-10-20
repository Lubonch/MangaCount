import { clearCompletedPriority } from './entries.js';

// Direct port of MangaRepository.cs. DTO: {id, name, volumes, formatId, publisherId, isAdult}.

const SELECT =
  'Id AS id, Title AS name, TotalVolumes AS volumes, FormatId AS formatId, ' +
  'PublisherId AS publisherId, IsAdult AS isAdult FROM Manga';

// SQLite stores the flag as 0/1; the DTO exposes it as a boolean.
const toManga = (row) => (row ? { ...row, isAdult: row.isAdult === 1 || row.isAdult === true } : row);

// TotalVolumes is NOT NULL: empty/`null`/invalid -> 0 (ongoing series).
const safeVolumes = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function listMangas(db) {
  return db.prepare(`SELECT ${SELECT} ORDER BY Title`).all().map(toManga);
}

export function getMangaById(db, id) {
  return toManga(db.prepare(`SELECT ${SELECT} WHERE Id = ?`).get(id) ?? null);
}

export function createManga(db, { name, volumes, formatId = null, publisherId = null, isAdult = false }) {
  const info = db
    .prepare(
      'INSERT INTO Manga (Title, TotalVolumes, FormatId, PublisherId, IsAdult) VALUES (?, ?, ?, ?, ?)'
    )
    .run(name, safeVolumes(volumes), formatId, publisherId, isAdult ? 1 : 0);
  return getMangaById(db, Number(info.lastInsertRowid));
}

export function updateManga(db, { id, name, volumes, formatId, publisherId, isAdult = false }) {
  const total = safeVolumes(volumes);
  db.prepare(
    'UPDATE Manga SET Title = ?, TotalVolumes = ?, FormatId = ?, PublisherId = ?, IsAdult = ? WHERE Id = ?'
  ).run(name, total, formatId, publisherId, isAdult ? 1 : 0, id);
  clearCompletedPriority(db, id, total);
  return getMangaById(db, id);
}

// Sets/clears the +18 content without touching the rest of the manga (used by the
// cover link to promote the flag when the candidate is +18).
export function setMangaIsAdult(db, id, isAdult) {
  db.prepare('UPDATE Manga SET IsAdult = ? WHERE Id = ?').run(isAdult ? 1 : 0, id);
  return getMangaById(db, id);
}

// Deletes the manga (its Entry rows fall via ON DELETE CASCADE).
export function deleteManga(db, id) {
  return db.prepare('DELETE FROM Manga WHERE Id = ?').run(id).changes > 0;
}

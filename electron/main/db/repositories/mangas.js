// Port directo de MangaRepository.cs. DTO: {id, name, volumes, formatId, publisherId, isAdult}.

const SELECT =
  'Id AS id, Title AS name, TotalVolumes AS volumes, FormatId AS formatId, ' +
  'PublisherId AS publisherId, IsAdult AS isAdult FROM Manga';

// SQLite guarda el flag como 0/1; el DTO lo expone como booleano.
const toManga = (row) => (row ? { ...row, isAdult: row.isAdult === 1 || row.isAdult === true } : row);

// TotalVolumes es NOT NULL: vacío/`null`/inválido -> 0 (serie en publicación).
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
  db.prepare(
    'UPDATE Manga SET Title = ?, TotalVolumes = ?, FormatId = ?, PublisherId = ?, IsAdult = ? WHERE Id = ?'
  ).run(name, safeVolumes(volumes), formatId, publisherId, isAdult ? 1 : 0, id);
  return getMangaById(db, id);
}

// Marca/desmarca el contenido +18 sin tocar el resto del manga (lo usa el
// vínculo de portada para promover el flag cuando el candidato es +18).
export function setMangaIsAdult(db, id, isAdult) {
  db.prepare('UPDATE Manga SET IsAdult = ? WHERE Id = ?').run(isAdult ? 1 : 0, id);
  return getMangaById(db, id);
}

// Borra el manga (sus Entry caen por ON DELETE CASCADE).
export function deleteManga(db, id) {
  return db.prepare('DELETE FROM Manga WHERE Id = ?').run(id).changes > 0;
}

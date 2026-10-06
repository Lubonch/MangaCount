// Port directo de ProfileRepository.cs (Dapper/PostgreSQL -> better-sqlite3).
// DTOs en camelCase como los serializa ASP.NET Core (los consume el renderer).
// Diferencia con el original: el UPDATE roto del C# (columnas ProfilePicture/IsActive
// inexistentes en PG) aquí funciona porque el esquema SQLite sí tiene ProfilePicture.
// Borrado físico (hard delete), igual que el original.

const SELECT = 'Id AS id, Name AS name, ProfilePicture AS profilePicture, CreatedAt AS createdDate FROM Profile';

export function listProfiles(db) {
  return db.prepare(`SELECT ${SELECT} ORDER BY Name COLLATE NOCASE`).all();
}

export function getProfileById(db, id) {
  return db.prepare(`SELECT ${SELECT} WHERE Id = ?`).get(id) ?? null;
}

export function createProfile(db, name) {
  const info = db.prepare('INSERT INTO Profile (Name) VALUES (?)').run(name);
  return getProfileById(db, Number(info.lastInsertRowid));
}

export function renameProfile(db, id, name) {
  db.prepare('UPDATE Profile SET Name = ? WHERE Id = ?').run(name, id);
  return getProfileById(db, id);
}

export function setProfilePicture(db, id, picture) {
  db.prepare('UPDATE Profile SET ProfilePicture = ? WHERE Id = ?').run(picture, id);
  return getProfileById(db, id);
}

export function deleteProfile(db, id) {
  db.prepare('DELETE FROM Profile WHERE Id = ?').run(id);
}

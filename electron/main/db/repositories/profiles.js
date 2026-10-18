// Direct port of ProfileRepository.cs (PostgreSQL -> better-sqlite3).
// DTOs in camelCase as ASP.NET Core serializes them (consumed by the renderer).
// Difference from the original: the broken C# UPDATE (ProfilePicture/IsActive
// columns nonexistent in PG) works here because the SQLite schema does have ProfilePicture.
// Hard delete, same as the original.

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

// Port directo de FormatRepository.cs y PublisherRepository.cs (CRUD idéntico).
// Diferencia: el alta/consulta de nombre es **case-insensitive** (y con trim),
// para no crear duplicados tipo "Ivrea" vs "ivrea".

function catalog(table) {
  return {
    list(db) {
      return db.prepare(`SELECT Id AS id, Name AS name FROM ${table} ORDER BY Name`).all();
    },
    getById(db, id) {
      return db.prepare(`SELECT Id AS id, Name AS name FROM ${table} WHERE Id = ?`).get(id) ?? null;
    },
    findByName(db, name) {
      const clean = String(name ?? '').trim();
      if (!clean) return null;
      return (
        db
          .prepare(`SELECT Id AS id, Name AS name FROM ${table} WHERE Name = ? COLLATE NOCASE`)
          .get(clean) ?? null
      );
    },
    // Reusa una entrada existente que sólo difiera en mayúsculas/espacios.
    create(db, name) {
      const clean = String(name ?? '').trim();
      if (!clean) throw new Error('Nombre requerido');
      const existing = this.findByName(db, clean);
      if (existing) return existing;
      const info = db.prepare(`INSERT INTO ${table} (Name) VALUES (?)`).run(clean);
      return this.getById(db, Number(info.lastInsertRowid));
    },
    update(db, id, name) {
      db.prepare(`UPDATE ${table} SET Name = ? WHERE Id = ?`).run(String(name ?? '').trim(), id);
      return this.getById(db, id);
    },
    remove(db, id) {
      db.prepare(`DELETE FROM ${table} WHERE Id = ?`).run(id);
    },
  };
}

export const formats = catalog('Format');
export const publishers = catalog('Publisher');

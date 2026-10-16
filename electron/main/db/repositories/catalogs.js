// Port directo de FormatRepository.cs y PublisherRepository.cs (CRUD idéntico).

function catalog(table) {
  return {
    list(db) {
      return db.prepare(`SELECT Id AS id, Name AS name FROM ${table}`).all();
    },
    getById(db, id) {
      return db.prepare(`SELECT Id AS id, Name AS name FROM ${table} WHERE Id = ?`).get(id) ?? null;
    },
    create(db, name) {
      const info = db.prepare(`INSERT INTO ${table} (Name) VALUES (?)`).run(name);
      return this.getById(db, Number(info.lastInsertRowid));
    },
    update(db, id, name) {
      db.prepare(`UPDATE ${table} SET Name = ? WHERE Id = ?`).run(name, id);
      return this.getById(db, id);
    },
    remove(db, id) {
      db.prepare(`DELETE FROM ${table} WHERE Id = ?`).run(id);
    },
  };
}

export const formats = catalog('Format');
export const publishers = catalog('Publisher');

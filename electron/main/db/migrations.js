// Migraciones versionadas que exceden el `schema.sqlite.sql` (que sólo hace
// CREATE IF NOT EXISTS). Se aplican desde `openDb` cuando user_version < SCHEMA_VERSION.

const normalizeCatalogName = (name) =>
  String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

function dedupeCatalog(db, table, fk) {
  const rows = db.prepare(`SELECT Id AS id, Name AS name FROM ${table} ORDER BY Id`).all();
  const groups = new Map();
  for (const row of rows) {
    const key = normalizeCatalogName(row.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const usage = db.prepare(`SELECT COUNT(*) AS n FROM Manga WHERE ${fk} = ?`);
  const repoint = db.prepare(`UPDATE Manga SET ${fk} = ? WHERE ${fk} = ?`);
  const remove = db.prepare(`DELETE FROM ${table} WHERE Id = ?`);
  const rename = db.prepare(`UPDATE ${table} SET Name = ? WHERE Id = ?`);

  db.transaction(() => {
    for (const group of groups.values()) {
      // Canónico: el más usado; empate -> el de menor Id (orden de `rows`).
      const scored = group
        .map((row) => ({ ...row, uses: usage.get(row.id).n }))
        .sort((a, b) => b.uses - a.uses || a.id - b.id);
      const [canonical, ...dupes] = scored;
      // Normaliza espacios del nombre canónico (aunque no tenga duplicados).
      if (canonical.name !== canonical.name.trim()) rename.run(canonical.name.trim(), canonical.id);
      for (const dup of dupes) {
        repoint.run(canonical.id, dup.id);
        remove.run(dup.id);
      }
    }
  })();
}

// v3: fusiona Format/Publisher duplicados que sólo difieren en mayúsculas o
// espacios ("Ivrea" vs "ivrea"), repunta los mangas al canónico y crea un
// índice único case-insensitive para que no vuelva a pasar.
export function migrateCatalogV3(db) {
  for (const { table, fk } of [
    { table: 'Format', fk: 'FormatId' },
    { table: 'Publisher', fk: 'PublisherId' },
  ]) {
    dedupeCatalog(db, table, fk);
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS UX_${table}_Name_NoCase ON ${table}(Name COLLATE NOCASE)`
    );
  }
}

// Dedupe de catálogos (Format/Publisher) a demanda. NO corre automáticamente:
// la prevención es la búsqueda case-insensitive (`catalogs.js`). Esto es para
// limpiar duplicados que ya existan (p. ej. "Ivrea" vs "ivrea"), vía el script
// `scripts/dedupe-catalogs.mjs` o desde Settings.

export const normalizeCatalogName = (name) =>
  String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

function planTable(db, table, fk) {
  const rows = db.prepare(`SELECT Id AS id, Name AS name FROM ${table} ORDER BY Id`).all();
  const groups = new Map();
  for (const row of rows) {
    const key = normalizeCatalogName(row.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const usage = db.prepare(`SELECT COUNT(*) AS n FROM Manga WHERE ${fk} = ?`);
  const plan = [];
  for (const group of groups.values()) {
    // Canónico: el más usado; empate -> el de menor Id.
    const scored = group
      .map((row) => ({ ...row, uses: usage.get(row.id).n }))
      .sort((a, b) => b.uses - a.uses || a.id - b.id);
    const [canonical, ...dupes] = scored;
    if (dupes.length > 0 || canonical.name !== canonical.name.trim()) {
      plan.push({ canonical, dupes });
    }
  }
  return plan;
}

function describe(plan) {
  return plan.map(({ canonical, dupes }) => ({
    keep: canonical.name.trim(),
    merged: dupes.map((d) => d.name),
    repointedMangas: dupes.length,
  }));
}

// Fusiona duplicados que sólo difieren en mayúsculas/espacios: repunta los
// mangas al canónico, borra los sobrantes y normaliza espacios del nombre.
// `dryRun` calcula el plan sin escribir nada.
export function dedupeCatalogs(db, { dryRun = false } = {}) {
  const tables = [
    { table: 'Format', fk: 'FormatId' },
    { table: 'Publisher', fk: 'PublisherId' },
  ];
  const plans = tables.map((t) => ({ ...t, plan: planTable(db, t.table, t.fk) }));
  const report = {};
  for (const { table, plan } of plans) report[table] = describe(plan);

  const changed = plans.filter((t) => t.plan.length > 0);
  if (!dryRun && changed.length > 0) {
    db.transaction(() => {
      for (const { table, fk, plan } of changed) {
        const rename = db.prepare(`UPDATE ${table} SET Name = ? WHERE Id = ?`);
        const repoint = db.prepare(`UPDATE Manga SET ${fk} = ? WHERE ${fk} = ?`);
        const remove = db.prepare(`DELETE FROM ${table} WHERE Id = ?`);
        for (const { canonical, dupes } of plan) {
          const trimmed = canonical.name.trim();
          if (canonical.name !== trimmed) rename.run(trimmed, canonical.id);
          for (const dup of dupes) {
            repoint.run(canonical.id, dup.id);
            remove.run(dup.id);
          }
        }
      }
    })();
  }
  return report;
}

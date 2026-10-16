// Port de EntryService.cs (import TSV + CRUD) a Node.
// Diferencias intencionales vs el original:
// - La columna "Completa" se parsea pero no se persiste (igual que en C#:
//   Entry no tiene dónde guardarla; el estado se deriva de quantity/volumes).
// - Export TSV es nuevo (el backend no tenía endpoint de export; el frontend
//   tampoco tenía UI): genera las mismas 8 columnas.
// - GetOrCreate ya no abre conexiones nuevas: usa los repositories porteados.
// - Sin AutoMapper: los repositories ya devuelven DTOs camelCase.

import { listEntries, upsertEntry, updateEntry } from '../db/repositories/entries.js';
import { listMangas, createManga, updateManga } from '../db/repositories/mangas.js';
import { formats, publishers } from '../db/repositories/catalogs.js';

export const TSV_HEADER = 'Titulo\tComprados\tTotal\tPendiente\tCompleta\tPrioridad\tFormato\tEditorial';

const parseIntOr = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

const parseBool = (value) => /^\s*true\s*$/i.test(value ?? '');

function getOrCreate(catalog, db, name) {
  const clean = (name ?? '').trim() || 'Unknown';
  const found = catalog.list(db).find((c) => c.name === clean);
  return (found ?? catalog.create(db, clean)).id;
}

export function parseTsv(text, profileId) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const item = lines[i].split('\t');
    if (!item[0]) continue;
    rows.push({
      mangaName: item[0],
      quantity: parseIntOr(item[1], 0),
      totalVolumes: item[2] ? parseIntOr(item[2], null) : null,
      pending: item.length > 3 && item[3] !== '' ? item[3] : null,
      priority: item.length > 5 ? parseBool(item[5]) : false,
      formatName: item.length > 6 && item[6] !== '' ? item[6] : 'Unknown',
      publisherName: item.length > 7 && item[7] !== '' ? item[7] : 'Unknown',
      profileId,
    });
  }
  return rows;
}

function findMangaByName(db, name) {
  const lower = name.toLowerCase();
  return listMangas(db).find((m) => m.name.toLowerCase() === lower) ?? null;
}

export function importTsv(db, text, profileId) {
  const rows = parseTsv(text, profileId);
  const tx = db.transaction(() => {
    let imported = 0;
    for (const row of rows) {
      const formatId = getOrCreate(formats, db, row.formatName);
      const publisherId = getOrCreate(publishers, db, row.publisherName);
      let manga = findMangaByName(db, row.mangaName);
      if (manga) {
        if (manga.formatId !== formatId || manga.publisherId !== publisherId) {
          manga = updateManga(db, { ...manga, formatId, publisherId });
        }
      } else {
        manga = createManga(db, {
          name: row.mangaName,
          volumes: row.totalVolumes ?? 0,
          formatId,
          publisherId,
        });
      }
      upsertEntry(db, {
        mangaId: manga.id,
        profileId: row.profileId,
        quantity: row.quantity,
        pending: row.pending,
        priority: row.priority,
      });
      imported += 1;
    }
    return imported;
  });
  return { imported: tx() };
}

export function exportTsv(db, profileId) {
  const entries = listEntries(db, profileId);
  const lines = [TSV_HEADER];
  for (const e of entries) {
    const complete = e.manga?.volumes ? e.quantity >= e.manga.volumes : false;
    lines.push(
      [
        e.manga?.name ?? '',
        e.quantity,
        e.manga?.volumes ?? 0,
        e.pending ?? '',
        complete ? 'True' : 'False',
        e.priority ? 'True' : 'False',
        e.manga?.format?.name ?? 'Unknown',
        e.manga?.publisher?.name ?? 'Unknown',
      ].join('\t')
    );
  }
  return lines.join('\n');
}

export { updateEntry };

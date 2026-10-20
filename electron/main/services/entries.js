// Port of EntryService.cs (TSV import + CRUD) to Node.
// Intentional differences vs the original:
// - The "Completa" column is parsed but not persisted (same as C#:
//   Entry has nowhere to store it; the state is derived from quantity/volumes).
// - TSV export is new (the backend had no export endpoint; the frontend
//   had no UI either): it generates the same 8 columns.
// - GetOrCreate no longer opens new connections: it uses the ported repositories.
// - No AutoMapper: the repositories already return camelCase DTOs.

import { listEntries, upsertEntry, updateEntry } from '../db/repositories/entries.js';
import { listMangas, getMangaById, createManga, updateManga } from '../db/repositories/mangas.js';
import { formats, publishers } from '../db/repositories/catalogs.js';
import { detectDuplicateCandidates } from './duplicate-detection.js';

export const TSV_HEADER = 'Titulo\tComprados\tTotal\tPendiente\tCompleta\tPrioridad\tFormato\tEditorial';

const parseIntOr = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

const parseBool = (value) => /^\s*true\s*$/i.test(value ?? '');

function getOrCreate(catalog, db, name) {
  const clean = (name ?? '').trim() || 'Unknown';
  // Case-insensitive: "ivrea" reuses "Ivrea" instead of creating a duplicate.
  const found = catalog.findByName(db, clean);
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

function mangasWithCatalogs(db) {
  const formatNames = new Map(formats.list(db).map((format) => [format.id, format.name]));
  const publisherNames = new Map(
    publishers.list(db).map((publisher) => [publisher.id, publisher.name])
  );
  return listMangas(db).map((manga) => ({
    ...manga,
    format: manga.formatId
      ? { id: manga.formatId, name: formatNames.get(manga.formatId) ?? 'Unknown' }
      : null,
    publisher: manga.publisherId
      ? { id: manga.publisherId, name: publisherNames.get(manga.publisherId) ?? 'Unknown' }
      : null,
  }));
}

function buildPreview(db, rows, profileId) {
  const entriesByManga = new Map(
    listEntries(db, profileId).map((entry) => [entry.mangaId, entry])
  );
  return {
    totalRows: rows.length,
    duplicates: detectDuplicateCandidates(rows, mangasWithCatalogs(db), entriesByManga),
  };
}

export function previewTsvImport(db, text, profileId) {
  return buildPreview(db, parseTsv(text, profileId), profileId);
}

const importError = (code) => Object.assign(new Error(code), { code });

function decisionsByRow(decisions) {
  const map = new Map();
  for (const decision of decisions) {
    if (!Number.isInteger(decision?.rowIndex) || typeof decision?.same !== 'boolean') {
      throw importError('err.importDecisionInvalid');
    }
    map.set(decision.rowIndex, decision);
  }
  return map;
}

export function importTsv(db, text, profileId, decisions = null) {
  const rows = parseTsv(text, profileId);
  const reviewMode = Array.isArray(decisions);
  const preview = reviewMode ? buildPreview(db, rows, profileId) : null;
  const duplicateByRow = new Map(
    (preview?.duplicates ?? []).map((duplicate) => [duplicate.rowIndex, duplicate])
  );
  const decisionByRow = reviewMode ? decisionsByRow(decisions) : new Map();

  if (reviewMode) {
    for (const decision of decisionByRow.values()) {
      if (!duplicateByRow.has(decision.rowIndex)) throw importError('err.importDecisionInvalid');
    }
    for (const rowIndex of duplicateByRow.keys()) {
      if (!decisionByRow.has(rowIndex)) throw importError('err.importDecisionsMissing');
    }
  }

  const tx = db.transaction(() => {
    let imported = 0;
    let merged = 0;
    let created = 0;
    const targets = new Map();

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const formatId = getOrCreate(formats, db, row.formatName);
      const publisherId = getOrCreate(publishers, db, row.publisherName);
      const decision = decisionByRow.get(rowIndex);
      let manga = null;

      if (decision?.same) {
        const duplicate = duplicateByRow.get(rowIndex);
        const targetId =
          duplicate.source === 'existing'
            ? duplicate.candidate.mangaId
            : targets.get(duplicate.candidate.rowIndex);
        manga = getMangaById(db, targetId);
        if (!manga) throw importError('err.importDecisionInvalid');
        if (manga.formatId !== formatId || manga.publisherId !== publisherId) {
          manga = updateManga(db, { ...manga, formatId, publisherId });
        }
        merged += 1;
      } else if (decision && decision.same === false) {
        manga = createManga(db, {
          name: row.mangaName,
          volumes: row.totalVolumes ?? 0,
          formatId,
          publisherId,
        });
        created += 1;
      } else {
        manga = findMangaByName(db, row.mangaName);
        if (manga) {
          if (manga.formatId !== formatId || manga.publisherId !== publisherId) {
            manga = updateManga(db, { ...manga, formatId, publisherId });
          }
          merged += 1;
        } else {
          manga = createManga(db, {
            name: row.mangaName,
            volumes: row.totalVolumes ?? 0,
            formatId,
            publisherId,
          });
          created += 1;
        }
      }

      targets.set(rowIndex, manga.id);
      upsertEntry(db, {
        mangaId: manga.id,
        profileId: row.profileId,
        quantity: row.quantity,
        pending: row.pending,
        priority: row.priority,
      });
      imported += 1;
    }

    return { imported, merged, created };
  });

  return tx();
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

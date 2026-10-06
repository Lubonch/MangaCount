// Handlers IPC. Cada entrada es una función pura `(ctx, ...args)` donde
// `ctx = { db }`, para poder testearla con `node --test` sin Electron.
// `registerHandlers(ipcMain, ctx)` las conecta al runtime real.
// Canales según parity-matrix.md (filas 1-15; recommendation y database llegan después).

import { listEntries, getEntryById, upsertEntry, updateEntry } from '../db/repositories/entries.js';
import { importTsv, exportTsv } from '../services/entries.js';
import {
  saveOrUpdateProfile,
  saveOrUpdateManga,
  listProfiles,
  getProfileById,
  deleteProfile,
  listMangas,
  getMangaById,
} from '../services/catalog-base.js';
import { formats, publishers } from '../db/repositories/catalogs.js';
import { getRecommendations } from '../services/recommendations.js';
import { saveProfilePicture } from '../services/files.js';
import { databaseStatistics, nukeLocalData } from '../services/database.js';

function requireProfileId(profileId) {
  if (!Number.isInteger(profileId) || profileId <= 0) {
    throw new Error('profileId inválido');
  }
}

// Agrupa formatos/editoriales usados por la colección como {id, name, count}[],
// ordenados por nombre: misma forma que EntryController.GetUsedFormats/Publishers.
function usedCatalog(entries, pick) {
  const byId = new Map();
  for (const entry of entries) {
    const item = pick(entry);
    if (!item) continue;
    const current = byId.get(item.id) ?? { id: item.id, name: item.name, count: 0 };
    current.count += 1;
    byId.set(item.id, current);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const handlers = {
  'profile:list': ({ db }) => listProfiles(db),
  'profile:get': ({ db }, id) => getProfileById(db, id),
  'profile:upsert': ({ db }, profile) => saveOrUpdateProfile(db, profile),
  'profile:delete': ({ db }, id) => {
    deleteProfile(db, id);
    return { ok: true };
  },
  'manga:list': ({ db }) => listMangas(db),
  'manga:get': ({ db }, id) => getMangaById(db, id),
  'manga:upsert': ({ db }, manga) => saveOrUpdateManga(db, manga),
  'format:list': ({ db }) => formats.list(db),
  'format:create': ({ db }, { name }) => formats.create(db, name),
  'publisher:list': ({ db }) => publishers.list(db),
  'publisher:create': ({ db }, { name }) => publishers.create(db, name),
  'recommendation:get': ({ db }, { profileId, limit } = {}) =>
    getRecommendations(db, profileId, limit),
  'profile:upload-picture': ({ db, dataDir }, { profileId, originalName, buffer }) =>
    saveProfilePicture(db, dataDir, profileId, {
      originalName,
      buffer: Buffer.from(buffer),
    }),
  'database:statistics': ({ db }) => databaseStatistics(db),
  'database:nuke-local': ({ db }) => nukeLocalData(db),
  'entry:list': ({ db }, profileId = null) => {
    if (profileId != null) requireProfileId(profileId);
    return listEntries(db, profileId);
  },
  'entry:get-by-id': ({ db }, id) => getEntryById(db, id),
  'entry:upsert': ({ db }, entry) => {
    requireProfileId(entry?.profileId);
    return entry?.id ? updateEntry(db, entry) : upsertEntry(db, entry);
  },
  'entry:import': ({ db }, { profileId, tsv }) => {
    requireProfileId(profileId);
    if (typeof tsv !== 'string' || tsv.length === 0) throw new Error('TSV vacío');
    return importTsv(db, tsv, profileId);
  },
  'entry:export': ({ db }, profileId) => {
    requireProfileId(profileId);
    return exportTsv(db, profileId);
  },
  'entry:used-formats': ({ db }, profileId = null) => usedCatalog(listEntries(db, profileId), (e) => e.manga?.format),
  'entry:used-publishers': ({ db }, profileId = null) => usedCatalog(listEntries(db, profileId), (e) => e.manga?.publisher),
};

export function channelNames() {
  return Object.keys(handlers);
}

export function registerHandlers(ipcMain, ctx) {
  for (const [channel, fn] of Object.entries(handlers)) {
    ipcMain.handle(channel, (_event, ...args) => fn(ctx, ...args));
  }
}

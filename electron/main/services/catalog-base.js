// Port of ProfileService.SaveOrUpdate / MangaService.SaveOrUpdate.
// Semantics: id > 0 and exists -> updates; otherwise -> creates (auto-incremental id).
// No AutoMapper/HTTP: the repositories already return camelCase DTOs.

import {
  listProfiles,
  getProfileById,
  createProfile,
  renameProfile,
  deleteProfile,
} from '../db/repositories/profiles.js';
import { listMangas, getMangaById, createManga, updateManga } from '../db/repositories/mangas.js';

export function saveOrUpdateProfile(db, { id = 0, name }) {
  if (!name?.trim()) throw new Error('Nombre de perfil requerido');
  const existing = id > 0 ? getProfileById(db, id) : null;
  return existing ? renameProfile(db, id, name.trim()) : createProfile(db, name.trim());
}

export function saveOrUpdateManga(db, { id = 0, name, volumes = 0, formatId = null, publisherId = null, isAdult }) {
  if (!name?.trim()) throw new Error('Nombre de manga requerido');
  const existing = id > 0 ? getMangaById(db, id) : null;
  // On edit, omitting `isAdult` keeps the current flag (prevents a caller
  // that does not know it —e.g. the bot— from clearing it by accident).
  const resolvedIsAdult = isAdult === undefined ? existing?.isAdult ?? false : isAdult === true;
  const manga = { id, name: name.trim(), volumes, formatId, publisherId, isAdult: resolvedIsAdult };
  return existing ? updateManga(db, manga) : createManga(db, manga);
}

export { listProfiles, getProfileById, deleteProfile, listMangas, getMangaById };
